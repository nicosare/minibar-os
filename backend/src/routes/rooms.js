import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { upsertTodayRoomStats, updateAllTargets } from '../services/deadlines.js';
import { clientOffset, startOfLocalDay } from '../lib/timezone.js';

const router = Router();

function productSnapshots(statuses) {
  return (statuses || []).map(item => ({
    name: item.product?.name || ('Продукт #' + item.productId),
    qty: Number(item.qtyToReplace) || 0,
    status: item.expiryStatus || 'needs_replacement'
  }));
}

function deadlineEventData(roomId, event) {
  return { roomId, type: 'deadline', status: 'done', notes: JSON.stringify({ source: 'deadlines', ...event }) };
}

router.get('/', async (req, res) => {
  try {
    const { floor, category, status } = req.query;
    const where = {};
    if (floor) where.floor = parseInt(floor, 10);
    if (category) where.category = category;
    if (status) where.expiryStatus = status;

    const rooms = await prisma.room.findMany({
      where,
      include: { template: { include: { items: { include: { product: true } } } } },
      orderBy: { number: 'asc' }
    });
    res.json(rooms);
  } catch (err) {
    console.error('GET rooms error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-all-deadlines', async (req, res) => {
  try {
    const offset = clientOffset(req);
    await prisma.$transaction(async tx => {
      const roomsBefore = await tx.room.findMany({ select: { id: true, number: true, expiryStatus: true } });
      const statusesBefore = await tx.roomProductStatus.findMany({ include: { product: { select: { name: true } } } });
      const byRoom = new Map();
      for (const item of statusesBefore) {
        if (!byRoom.has(item.roomId)) byRoom.set(item.roomId, []);
        byRoom.get(item.roomId).push(item);
      }
      const events = roomsBefore
        .filter(room => (room.expiryStatus || 'neutral') !== 'neutral' || (byRoom.get(room.id) || []).length > 0)
        .map(room => deadlineEventData(room.id, {
          action: 'reset_all',
          previousStatus: room.expiryStatus || 'neutral',
          newStatus: 'neutral',
          previousProducts: productSnapshots(byRoom.get(room.id) || []),
          productsAfter: [],
          note: 'Статус комнаты сброшен массовой операцией'
        }));

      await tx.roomProductStatus.deleteMany({});
      await tx.room.updateMany({ data: { expiryStatus: 'neutral' } });
      if (events.length) await tx.check.createMany({ data: events });

      const today = startOfLocalDay(new Date(), offset);
      const totalRooms = await tx.room.count();
      await tx.deadlineDailyStat.upsert({
        where: { date: today },
        update: { validCount: 0, emptyCount: 0, needsReplacementCount: 0, neutralCount: totalRooms },
        create: { date: today, validCount: 0, emptyCount: 0, needsReplacementCount: 0, neutralCount: totalRooms }
      });
      await tx.deadlineTarget.deleteMany({ where: { date: today } });
      await updateAllTargets(tx, offset);
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Reset all deadlines error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        template: { include: { items: { include: { product: true } } } },
        customs: { include: { product: true } },
        replacementItems: { include: { product: true } }
      }
    });
    if (!room) return res.status(404).json({ error: 'Not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const room = await prisma.room.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body
    });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/product-statuses', async (req, res) => {
  try {
    const statuses = await prisma.roomProductStatus.findMany({
      where: { roomId: parseInt(req.params.id, 10) },
      include: { product: true }
    });
    res.json(statuses);
  } catch (err) {
    console.error('GET product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/product-statuses', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const roomId = parseInt(req.params.id, 10);
    const { items, roomStatus } = req.body || {};

    await prisma.$transaction(async tx => {
      const roomBefore = await tx.room.findUnique({ where: { id: roomId }, select: { id: true, number: true, expiryStatus: true } });
      if (!roomBefore) throw new Error('Комната не найдена');
      const statusesBefore = await tx.roomProductStatus.findMany({
        where: { roomId },
        include: { product: { select: { name: true } } }
      });

      await tx.roomProductStatus.deleteMany({ where: { roomId } });
      const toCreate = (items || [])
        .filter(item => (item.qtyToReplace && item.qtyToReplace > 0) || item.expiryStatus === 'needs_replacement')
        .map(item => ({
          roomId,
          productId: parseInt(item.productId, 10),
          expiryStatus: item.expiryStatus || 'needs_replacement',
          qtyToReplace: parseInt(item.qtyToReplace, 10) || 0,
          checkedAt: new Date()
        }));
      if (toCreate.length) await tx.roomProductStatus.createMany({ data: toCreate });

      if (roomStatus) {
        await tx.room.update({ where: { id: roomId }, data: { expiryStatus: roomStatus } });
      }
      const statusesAfter = await tx.roomProductStatus.findMany({
        where: { roomId },
        include: { product: { select: { name: true } } }
      });
      const action = toCreate.length ? 'products_updated'
        : roomStatus === 'neutral' ? 'status_reset'
        : roomStatus === 'needs_replacement' ? 'needs_replacement'
        : 'status_updated';
      await tx.check.create({
        data: deadlineEventData(roomId, {
          action,
          previousStatus: roomBefore.expiryStatus || 'neutral',
          newStatus: roomStatus || roomBefore.expiryStatus || 'neutral',
          previousProducts: productSnapshots(statusesBefore),
          productsAfter: productSnapshots(statusesAfter),
          note: toCreate.length ? 'Обновлены отметки продуктов в разделе Сроки' : null
        })
      });

      await upsertTodayRoomStats(tx, offset);
      await updateAllTargets(tx, offset);
    });

    const updated = await prisma.roomProductStatus.findMany({ where: { roomId }, include: { product: true } });
    res.json({ ok: true, statuses: updated });
  } catch (err) {
    console.error('PUT product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/product-statuses', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const roomId = parseInt(req.params.id, 10);
    const { roomStatus } = req.body || {};

    await prisma.$transaction(async tx => {
      const roomBefore = await tx.room.findUnique({ where: { id: roomId }, select: { id: true, number: true, expiryStatus: true } });
      if (!roomBefore) throw new Error('Комната не найдена');
      const statusesBefore = await tx.roomProductStatus.findMany({
        where: { roomId },
        include: { product: { select: { name: true } } }
      });

      await tx.roomProductStatus.deleteMany({ where: { roomId } });
      if (roomStatus) await tx.room.update({ where: { id: roomId }, data: { expiryStatus: roomStatus } });

      const action = roomStatus === 'empty' ? 'emptied'
        : roomStatus === 'valid' ? 'marked_valid'
        : roomStatus === 'neutral' ? 'status_reset'
        : 'status_updated';
      await tx.check.create({
        data: deadlineEventData(roomId, {
          action,
          previousStatus: roomBefore.expiryStatus || 'neutral',
          newStatus: roomStatus || roomBefore.expiryStatus || 'neutral',
          previousProducts: productSnapshots(statusesBefore),
          productsAfter: [],
          note: roomStatus === 'empty' ? 'Номер отмечен как опустошённый в разделе Сроки'
            : roomStatus === 'valid' ? 'Номер отмечен как исправный в разделе Сроки'
            : roomStatus === 'neutral' ? 'Статус сброшен в разделе Сроки'
            : null
        })
      });

      await upsertTodayRoomStats(tx, offset);
      await updateAllTargets(tx, offset);
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
