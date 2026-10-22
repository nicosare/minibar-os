import { Router } from 'express';
import { processVkBotMessage } from '../services/vkBot.js';
import { publishDataChanged } from '../lib/live-events.js';
import { prisma } from '../lib/prisma.js';
import {
  clientOffset,
  startOfLocalDay
} from '../lib/timezone.js';
import { ensureTodayTarget } from '../services/deadlines.js';
import { buildEmptiedTodayRooms } from '../services/emptiedToday.js';
import { todayRange, getMiniAppDepartureList } from './departures.js';

const router = Router();

function isAuthorized(req) {
  const expected = String(process.env.VK_BOT_INTERNAL_TOKEN || '').trim();
  const actual = String(req.get('x-minibar-bot-token') || '').trim();
  return Boolean(expected) && actual === expected;
}

router.get('/emptied-today', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Use the same explicit local-day boundaries as the operational list summary.
    // Do not add a day to a UTC-midnight date-only value: that shifts the range.
    const range = todayRange(req);
    // A room belongs in the list only if its latest operational event today
    // is an emptying. A later vk_room event means it was checked/refilled.
    const items = await prisma.check.findMany({
      where: {
        type: { in: ['vk_emptied', 'vk_room'] },
        status: 'done',
        checkDate: { gte: range.start, lt: range.end },
        roomId: { not: null }
      },
      select: {
        id: true,
        type: true,
        checkDate: true,
        room: { select: { number: true } }
      },
      orderBy: [{ checkDate: 'desc' }, { id: 'desc' }]
    });

    const rooms = buildEmptiedTodayRooms(items);

    res.set('Cache-Control', 'no-store');
    return res.json({ date: range.dateKey, total: rooms.length, rooms });
  } catch (error) {
    console.error('GET /api/vk-bot/emptied-today error:', error);
    return res.status(500).json({ error: 'Не удалось загрузить опустошённые номера за сегодня' });
  }
});

router.get('/summary', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const offset = clientOffset(req);
    const range = todayRange(req);
    const today = startOfLocalDay(now, offset);

    const [
      arrivalsList,
      gihRecords,
      totalRooms,
      badRooms,
      exciseRows,
      todayTarget,
      departures,
      operationalChecks
    ] = await Promise.all([
      prisma.activeList.findFirst({
        where: { listType: 'arrivals' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, rooms: { select: { roomId: true } } }
      }),
      prisma.check.findMany({
        where: {
          type: 'gih',
          OR: [
            { status: 'draft', createdAt: { gte: range.start, lt: range.end } },
            { status: 'done', checkDate: { gte: range.start, lt: range.end } }
          ]
        },
        select: { roomId: true, status: true, gihRoomStatus: true }
      }),
      prisma.room.count(),
      prisma.room.count({
        where: { expiryStatus: { in: ['neutral', 'needs_replacement'] } }
      }),
      prisma.excise.findMany({ select: { markNumber: true } }),
      prisma.$transaction(tx => ensureTodayTarget(tx, offset)),
      getMiniAppDepartureList(req),
      prisma.check.findMany({
        where: {
          type: { in: ['vk_room', 'vk_emptied'] },
          status: 'done',
          checkDate: { gte: range.start, lt: range.end },
          roomId: { not: null }
        },
        select: { type: true, operationSnapshot: true }
      })
    ]);

    const gihRoomIds = new Set(
      gihRecords
        .filter(record => record.gihRoomStatus !== 'not_checked')
        .map(record => Number(record.roomId))
        .filter(id => Number.isSafeInteger(id) && id > 0)
    );

    const target = Math.max(0, Number(todayTarget?.targetCount) || 0);
    const processed = Math.max(0, Number(todayTarget?.startBadCount || 0) - badRooms);
    const exciseCount = exciseRows.length;
    const validExciseCount = exciseRows.filter(row => {
      const mark = String(row.markNumber || '').trim();
      return mark.length >= 20 && /^\d/.test(mark);
    }).length;

    // Each Check row is one processed room operation written by the VK bot.
    // The operation snapshot records whether a normal check refilled an empty room.
    const checkedToday = operationalChecks.length;
    const emptiedToday = operationalChecks.filter(check => check.type === 'vk_emptied').length;
    const refilledEmptyToday = operationalChecks.filter(check =>
      check.type === 'vk_room' &&
      check.operationSnapshot &&
      typeof check.operationSnapshot === 'object' &&
      check.operationSnapshot.before?.roomStatus === 'empty'
    ).length;

    res.set('Cache-Control', 'no-store');
    return res.json({
      dateKey: range.dateKey,
      lists: {
        arrivals: arrivalsList
          ? { formed: true, count: new Set(arrivalsList.rooms.map(item => Number(item.roomId))).size }
          : { formed: false, count: null },
        departures: departures.sourceReady
          ? { formed: true, count: Number(departures.remainingCount) || 0 }
          : { formed: false, count: null },
        gih: { formed: true, count: gihRoomIds.size },
        deadlines: { formed: true, count: totalRooms }
      },
      deadlinesToday: {
        target,
        processed,
        remaining: Math.max(0, target - processed)
      },
      operationsToday: {
        checked: checkedToday,
        emptied: emptiedToday,
        refilledEmpty: refilledEmptyToday
      },
      excises: {
        total: exciseCount,
        valid: validExciseCount,
        hasExcises: exciseCount > 0
      }
    });
  } catch (error) {
    console.error('GET /api/vk-bot/summary error:', error);
    return res.status(500).json({ error: 'Не удалось сформировать сводку для VK-бота' });
  }
});

router.post('/events', async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const body = req.body || {};
    const peerId = String(body.peerId ?? '').trim();
    const text = String(body.text ?? '').trim();
    const eventId = String(body.eventId ?? '').trim();

    if (!peerId || !text || !eventId) {
      return res.status(400).json({
        error: 'eventId, peerId и text обязательны'
      });
    }

    const result = await processVkBotMessage({
      eventId,
      peerId,
      messageId: body.messageId ?? null,
      text,
      occurredAt: body.occurredAt ?? null
    });

    if (result?.status === 'processed' && Array.isArray(result.rooms) && result.rooms.length) {
      publishDataChanged({
        models: ['Setting', 'Room', 'Check'],
        actions: ['deleteMany', 'update', 'create'],
        source: 'vk-bot',
        path: '/api/vk-bot/events',
        domains: ['refills', 'rooms', 'deadlines', 'history', 'miniapp']
      });
    }
    return res.json(result);
  } catch (error) {
    console.error('POST /api/vk-bot/events error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

export default router;
