import { prisma } from '../lib/prisma.js';
import { upsertTodayRoomStats, updateAllTargets } from './deadlines.js';

const ROOM_RE = /\b\d{3,4}\b/g;
const SEPARATOR_RE = /^[\s,;:/|+_-]*$/u;

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

  const lowered = text.toLocaleLowerCase('ru-RU');
  const emptyMatch = lowered.match(/опустош\p{L}*/u);
  const prefixEnd = emptyMatch ? emptyMatch.index : text.length;
  const prefix = text.slice(0, prefixEnd).trim();

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

  const tail = prefix.slice(first.index + first[0].length);
  if (!SEPARATOR_RE.test(tail)) {
    return null;
  }

  if (emptyMatch) {
    const afterKeyword = text.slice(
      emptyMatch.index + emptyMatch[0].length
    );

    if (!SEPARATOR_RE.test(afterKeyword)) {
      return null;
    }
  }

  return {
    rooms: matches.map(match => Number(match[0])),
    emptied: Boolean(emptyMatch)
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
            : Number(messageId),
          text,
          eventType: parsed.emptied ? 'emptied' : 'room',
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

    const rooms = await tx.room.findMany({
      where: {
        number: {
          in: parsed.rooms
        }
      },
      select: {
        id: true,
        number: true,
        expiryStatus: true
      }
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

      if (parsed.emptied) {
        await tx.roomProductStatus.deleteMany({
          where: { roomId: room.id }
        });

        if (room.expiryStatus !== 'empty') {
          await tx.room.update({
            where: { id: room.id },
            data: { expiryStatus: 'empty' }
          });
          roomStateChanged = true;
        }

        await tx.check.create({
          data: {
            roomId: room.id,
            checkDate: eventDate,
            type: 'vk_emptied',
            status: 'done',
            notes: text
          }
        });
      } else {
        if (room.expiryStatus === 'empty') {
          await tx.room.update({
            where: { id: room.id },
            data: { expiryStatus: 'neutral' }
          });
          roomStateChanged = true;
        }

        await tx.check.create({
          data: {
            roomId: room.id,
            checkDate: eventDate,
            type: 'vk_room',
            status: 'done',
            notes: text
          }
        });
      }

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
