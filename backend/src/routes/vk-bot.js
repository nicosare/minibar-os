import { Router } from 'express';
import { processVkBotMessage } from '../services/vkBot.js';

const router = Router();

function isAuthorized(req) {
  const expected = String(process.env.VK_BOT_INTERNAL_TOKEN || '').trim();
  const actual = String(req.get('x-minibar-bot-token') || '').trim();
  return Boolean(expected) && actual === expected;
}

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

    return res.json(result);
  } catch (error) {
    console.error('POST /api/vk-bot/events error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

export default router;
