import { Router } from 'express';
import { processVkBotMessage } from '../services/vkBot.js';
import { publishDataChanged } from '../lib/live-events.js';
import { prisma } from '../lib/prisma.js';
import { startOfLocalDay, addLocalDays } from '../lib/timezone.js';

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
    const items = await prisma.check.findMany({
      where: {
        type: 'vk_emptied',
        status: 'done',
        checkDate: { gte: from, lt: to },
        roomId: { not: null }
      },
      select: {
        checkDate: true,
        room: { select: { number: true } }
      },
      orderBy: [{ checkDate: 'asc' }, { id: 'asc' }]
    });

    const rooms = [];
    const seen = new Set();
    for (const item of items) {
      if (!item.room || seen.has(item.room.number)) continue;
      seen.add(item.room.number);
      rooms.push({ number: item.room.number, time: item.checkDate.toISOString() });
    }

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
