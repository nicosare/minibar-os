import { prisma } from '../lib/prisma.js';
import { upsertTodayRoomStats, updateAllTargets } from './deadlines.js';

const ROOM_RE = /\b\d{3,4}\b/g;
const SEPARATOR_RE = /^[\s,;:/|+_-]*$/u;
const COMMENT_RE = /\(([^)]*)\)\s*$/u;

function allowedPeerIds() {
  return new Set(
    String(process.env.VK_BOT_ALLOWED_PEER_IDS || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
  );
}

function normalizeOccurredAt(value) {
  if (value === null || value === undefined || value === '') {
    return new Date();
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }

  return date;
}

export function parseVkOperationalMessage(rawText) {
  const text = String(rawText || '').trim();
  if (!text) return null;

  // Undo command is parsed before ordinary room numbers; the leading hyphen is semantic here.
  if (text.startsWith('-')) {
    const undoBody = text.slice(1).trim();
    const undoMatches = [...undoBody.matchAll(ROOM_RE)];
    if (!undoMatches.length || undoMatches[0].index !== 0) return null;
    for (let i = 1; i < undoMatches.length; i += 1) {
      const gap = undoBody.slice(
        undoMatches[i - 1].index + undoMatches[i - 1][0].length,
        undoMatches[i].index
      );
      if (!SEPARATOR_RE.test(gap)) return null;
    }
    const undoTail = undoBody.slice(
      undoMatches[undoMatches.length - 1].index + undoMatches[undoMatches.length - 1][0].length
    );
    if (!SEPARATOR_RE.test(undoTail)) return null;
    return {
      rooms: [...new Set(undoMatches.map(match => Number(match[0])))],
      undo: true,
      emptied: false,
      note: null
    };
  }

  const commentMatch = text.match(COMMENT_RE);
  const note = commentMatch ? commentMatch[1].trim() : null;
  const baseText = commentMatch
    ? text.slice(0, commentMatch.index).trim()
    : text;

  const lowered = baseText.toLocaleLowerCase('ru-RU');
  const emptyMatch = lowered.match(/опустош\p{L}*/u);
  const prefixEnd = emptyMatch ? emptyMatch.index : baseText.length;
  const prefix = baseText.slice(0, prefixEnd).trim();

  const matches = [...prefix.matchAll(ROOM_RE)];
  if (!matches.length) return null;

  const first = matches[0];
  if (first.index !== 0) return null;

  for (let i = 1; i < matches.length; i += 1) {
    const gap = prefix.slice(
      matches[i - 1].index + matches[i - 1][0].length,
      matches[i].index
    );

    if (!SEPARATOR_RE.test(gap)) {
      return null;
    }
  }

  const last = matches[matches.length - 1];
  const tail = prefix.slice(last.index + last[0].length);
  if (!SEPARATOR_RE.test(tail)) {
    return null;
  }

  if (emptyMatch) {
    const afterKeyword = baseText.slice(
      emptyMatch.index + emptyMatch[0].length
    );

    if (!SEPARATOR_RE.test(afterKeyword)) {
      return null;
    }
  }

  return {
    rooms: [...new Set(matches.map(match => Number(match[0])))],
    undo: false,
    emptied: Boolean(emptyMatch),
    note
  };
}

function isDuplicateError(error) {
  return error?.code === 'P2002';
}

export async function processVkBotMessage({
  eventId,
  peerId,
  messageId = null,
  text,
  occurredAt = null
}) {
  const allowed = allowedPeerIds();

  if (allowed.size === 0 || !allowed.has(peerId)) {
    throw new Error('Этот peer_id запрещён для VK-бота');
  }

  const parsed = parseVkOperationalMessage(text);

  if (!parsed) {
    return {
      ok: true,
      status: 'ignored',
      reason: 'not_operational'
    };
  }

  const eventDate = normalizeOccurredAt(occurredAt);

  return prisma.$transaction(async (tx) => {
    try {
      await tx.vkBotEvent.create({
        data: {
          eventId,
          peerId,
          messageId: messageId === null || messageId === undefined
            ? null
            : (Number.isSafeInteger(Number(messageId)) ? Number(messageId) : null),
          text,
          eventType: parsed.undo ? 'undo' : (parsed.emptied ? 'emptied' : 'room'),
          occurredAt: eventDate
        }
      });
    } catch (error) {
      if (isDuplicateError(error)) {
        return {
          ok: true,
          status: 'duplicate',
          eventId
        };
      }

      throw error;
    }

    if (parsed.undo) {
      const undoneRooms = [];
      const unavailableRooms = [];
      const missingUndoRooms = [];
      let roomStateChanged = false;

      for (const roomNumber of parsed.rooms) {
        const room = await tx.room.findUnique({
          where: { number: roomNumber },
          select: { id: true, number: true, expiryStatus: true }
        });
        if (!room) {
          missingUndoRooms.push(roomNumber);
          continue;
        }

        // Include already-undone rows in this lookup: this makes a repeated "-1634"
        // a no-op instead of walking backwards through older history.
        const latestAction = await tx.check.findFirst({
          where: {
            roomId: room.id,
            type: { in: ['vk_room', 'vk_emptied', 'deadline'] }
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true, type: true, notes: true, operationSnapshot: true, undoneAt: true
          }
        });

        if (!latestAction || latestAction.undoneAt) {
          unavailableRooms.push({ room: roomNumber, reason: latestAction ? 'already_undone' : 'nothing_to_undo' });
          continue;
        }

        const snapshot = latestAction.operationSnapshot;
        if (
          !snapshot || snapshot.version !== 1 ||
          !snapshot.before || !snapshot.after ||
          !Array.isArray(snapshot.before.products) ||
          !Array.isArray(snapshot.after.products)
        ) {
          unavailableRooms.push({ room: roomNumber, reason: 'snapshot_unavailable' });
          continue;
        }

        const currentProducts = await tx.roomProductStatus.findMany({
          where: { roomId: room.id },
          select: { productId: true, expiryStatus: true, qtyToReplace: true, checkedAt: true }
        });
        const normalizeProducts = items => (items || [])
          .map(item => ({
            productId: Number(item.productId),
            expiryStatus: String(item.expiryStatus || 'ok'),
            qtyToReplace: Number(item.qtyToReplace) || 0,
            checkedAt: new Date(item.checkedAt).toISOString()
          }))
          .sort((a, b) => a.productId - b.productId);
        const currentState = {
          roomStatus: room.expiryStatus || 'neutral',
          products: normalizeProducts(currentProducts)
        };
        const expectedAfter = {
          roomStatus: String(snapshot.after.roomStatus || 'neutral'),
          products: normalizeProducts(snapshot.after.products)
        };
        if (JSON.stringify(currentState) !== JSON.stringify(expectedAfter)) {
          unavailableRooms.push({ room: roomNumber, reason: 'state_changed_since_action' });
          continue;
        }

        await tx.roomProductStatus.deleteMany({ where: { roomId: room.id } });
        if (snapshot.before.products.length) {
          await tx.roomProductStatus.createMany({
            data: snapshot.before.products.map(item => ({
              roomId: room.id,
              productId: Number(item.productId),
              expiryStatus: String(item.expiryStatus || 'ok'),
              qtyToReplace: Number(item.qtyToReplace) || 0,
              checkedAt: new Date(item.checkedAt)
            }))
          });
        }
        await tx.room.update({
          where: { id: room.id },
          data: { expiryStatus: String(snapshot.before.roomStatus || 'neutral') }
        });
        await tx.check.update({
          where: { id: latestAction.id },
          data: { undoneAt: new Date() }
        });
        await tx.check.create({
          data: {
            roomId: room.id,
            checkDate: eventDate,
            type: 'vk_undo',
            status: 'done',
            notes: 'Отменено последнее ежедневное действие: ' +
              (latestAction.type === 'vk_emptied' ? 'опустошение' :
                latestAction.type === 'deadline' ? 'операция «Сроки»' : 'проверка')
          }
        });
        undoneRooms.push(roomNumber);
        roomStateChanged = true;
      }

      if (roomStateChanged) {
        await upsertTodayRoomStats(tx, null);
        await updateAllTargets(tx, null);
      }

      await tx.vkBotEvent.update({
        where: { eventId },
        data: { eventType: 'undo' }
      });

      return {
        ok: true,
        status: 'undo_processed',
        eventId,
        rooms: undoneRooms,
        unavailableRooms,
        missingRooms: missingUndoRooms
      };
    }

    const rooms = await tx.room.findMany({
      where: { number: { in: parsed.rooms } },
      select: { id: true, number: true, expiryStatus: true }
    });

    const roomsByNumber = new Map(
      rooms.map(room => [room.number, room])
    );

    const processedRooms = [];
    const missingRooms = [];
    let roomStateChanged = false;

    for (const roomNumber of parsed.rooms) {
      const room = roomsByNumber.get(roomNumber);

      if (!room) {
        missingRooms.push(roomNumber);
        continue;
      }

      const productsBefore = await tx.roomProductStatus.findMany({
        where: { roomId: room.id },
        select: { productId: true, expiryStatus: true, qtyToReplace: true, checkedAt: true }
      });
      const beforeSnapshot = {
        roomStatus: room.expiryStatus || 'neutral',
        products: productsBefore.map(item => ({
          productId: item.productId,
          expiryStatus: item.expiryStatus,
          qtyToReplace: item.qtyToReplace,
          checkedAt: item.checkedAt.toISOString()
        }))
      };

      let nextRoomStatus = room.expiryStatus || 'neutral';
      if (parsed.emptied) {
        await tx.roomProductStatus.deleteMany({ where: { roomId: room.id } });
        nextRoomStatus = 'empty';
        if (room.expiryStatus !== 'empty') roomStateChanged = true;
      } else if (room.expiryStatus === 'empty') {
        nextRoomStatus = 'neutral';
        roomStateChanged = true;
      }

      if (nextRoomStatus !== room.expiryStatus) {
        await tx.room.update({
          where: { id: room.id },
          data: { expiryStatus: nextRoomStatus }
        });
      }

      const productsAfterRows = await tx.roomProductStatus.findMany({
        where: { roomId: room.id },
        select: { productId: true, expiryStatus: true, qtyToReplace: true, checkedAt: true }
      });
      const afterSnapshot = {
        roomStatus: nextRoomStatus,
        products: productsAfterRows.map(item => ({
          productId: item.productId,
          expiryStatus: item.expiryStatus,
          qtyToReplace: item.qtyToReplace,
          checkedAt: item.checkedAt.toISOString()
        }))
      };

      await tx.check.create({
        data: {
          roomId: room.id,
          checkDate: eventDate,
          type: parsed.emptied ? 'vk_emptied' : 'vk_room',
          status: 'done',
          notes: parsed.note,
          operationSnapshot: {
            version: 1,
            source: 'vk_bot',
            before: beforeSnapshot,
            after: afterSnapshot
          }
        }
      });

      processedRooms.push(roomNumber);
    }

    await tx.vkBotEvent.update({
      where: { eventId },
      data: {
        eventType: parsed.emptied ? 'emptied' : 'room'
      }
    });

    if (roomStateChanged) {
      await upsertTodayRoomStats(tx, null);
      await updateAllTargets(tx, null);
    }

    return {
      ok: true,
      status: 'processed',
      eventId,
      action: parsed.emptied ? 'emptied' : 'room',
      rooms: processedRooms,
      missingRooms
    };
  });
}
