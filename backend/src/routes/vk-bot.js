import { Router } from 'express';
import { processVkBotMessage } from '../services/vkBot.js';
import { publishDataChanged } from '../lib/live-events.js';
import { prisma } from '../lib/prisma.js';
import { startOfLocalDay, addLocalDays } from '../lib/timezone.js';
import { buildEmptiedTodayRooms } from '../services/emptiedToday.js';

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
    const from = startOfLocalDay(new Date());
    const to = addLocalDays(from, 1);
    // A room belongs in the list only if its latest operational event today
    // is an emptying. A later vk_room event means it was checked/refilled.
    const items = await prisma.check.findMany({
      where: {
        type: { in: ['vk_emptied', 'vk_room'] },
        status: 'done',
        checkDate: { gte: from, lt: to },
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
    return res.json({ date: from.toISOString().slice(0, 10), total: rooms.length, rooms });
  } catch (error) {
    console.error('GET /api/vk-bot/emptied-today error:', error);
    return res.status(500).json({ error: 'Не удалось загрузить опустошённые номера за сегодня' });
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
