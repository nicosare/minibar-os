import { upsertTodayRoomStats, updateAllTargets } from './deadlines.js';

function productSnapshots(statuses) {
  return (statuses || []).map(item => ({
    name: item.product?.name || ('Продукт #' + item.productId),
    qty: Number(item.qtyToReplace) || 0,
    status: item.expiryStatus || 'needs_replacement'
  }));
}

function reversibleProductSnapshots(statuses) {
  return (statuses || []).map(item => ({
    productId: Number(item.productId),
    expiryStatus: item.expiryStatus || 'ok',
    qtyToReplace: Number(item.qtyToReplace) || 0,
    checkedAt: new Date(item.checkedAt).toISOString()
  }));
}

function deadlineEventData(roomId, event) {
  const { operationSnapshot, ...historyEvent } = event;
  return {
    roomId,
    type: 'deadline',
    status: 'done',
    operationSnapshot: operationSnapshot || undefined,
    notes: JSON.stringify({ source: 'deadlines', ...historyEvent })
  };
}

function actionForStatus(roomStatus) {
  if (roomStatus === 'empty') return 'emptied';
  if (roomStatus === 'valid') return 'marked_valid';
  if (roomStatus === 'neutral') return 'status_reset';
  return 'status_updated';
}

function noteForStatus(roomStatus) {
  if (roomStatus === 'empty') return 'Номер отмечен как опустошённый в разделе Сроки';
  if (roomStatus === 'valid') return 'Номер отмечен как исправный в разделе Сроки';
  if (roomStatus === 'neutral') return 'Статус сброшен в разделе Сроки';
  return null;
}

/**
 * Apply the same room-level deadline transition used by the Deadlines screen.
 * GIH can opt into skipIfSame so an already-empty room remains untouched.
 */
export async function setRoomDeadlineStatus(
  tx,
  { roomId, roomStatus, note, skipIfSame = false },
  offsetMinutes = null
) {
  const normalizedRoomId = Number.parseInt(roomId, 10);
  if (!Number.isInteger(normalizedRoomId) || normalizedRoomId <= 0) {
    const error = new Error('Некорректный ID номера');
    error.statusCode = 400;
    throw error;
  }

  await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${normalizedRoomId} FOR UPDATE`;
  const roomBefore = await tx.room.findUnique({
    where: { id: normalizedRoomId },
    select: { id: true, number: true, expiryStatus: true }
  });
  if (!roomBefore) {
    const error = new Error('Комната не найдена');
    error.statusCode = 404;
    throw error;
  }

  const previousStatus = roomBefore.expiryStatus || 'neutral';
  if (skipIfSame && previousStatus === roomStatus) {
    return { changed: false, room: roomBefore };
  }

  const statusesBefore = await tx.roomProductStatus.findMany({
    where: { roomId: normalizedRoomId },
    include: { product: { select: { name: true } } }
  });

  await tx.roomProductStatus.deleteMany({ where: { roomId: normalizedRoomId } });
  if (roomStatus) {
    await tx.room.update({
      where: { id: normalizedRoomId },
      data: { expiryStatus: roomStatus }
    });
  }

  const newStatus = roomStatus || previousStatus;
  await tx.check.create({
    data: deadlineEventData(normalizedRoomId, {
      action: actionForStatus(roomStatus),
      previousStatus,
      newStatus,
      previousProducts: productSnapshots(statusesBefore),
      productsAfter: [],
      note: note !== undefined ? note : noteForStatus(roomStatus),
      operationSnapshot: {
        version: 1,
        source: 'deadlines',
        before: {
          roomStatus: previousStatus,
          products: reversibleProductSnapshots(statusesBefore)
        },
        after: {
          roomStatus: newStatus,
          products: []
        }
      }
    })
  });

  await upsertTodayRoomStats(tx, offsetMinutes);
  await updateAllTargets(tx, offsetMinutes);

  return { changed: true, previousStatus, newStatus };
}
