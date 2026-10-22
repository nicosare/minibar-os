import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const excises = await prisma.excise.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(excises);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { mark_number } = req.body;
    if (!mark_number) return res.status(400).json({ error: 'mark_number required' });

    const existing = await prisma.excise.findFirst({ where: { markNumber: mark_number } });
    if (existing) return res.json({ ...existing, _duplicate: true });

    const excise = await prisma.excise.create({ data: { markNumber: mark_number } });
    res.json({ ...excise, _duplicate: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/send-to-chat', async (req, res) => {
  const token = String(process.env.VK_BOT_INTERNAL_TOKEN || '').trim();
  if (!token) return res.status(503).json({ error: 'Сервис отправки акцизов не настроен' });

  const botServiceUrl = String(process.env.VK_BOT_SERVICE_URL || 'http://vk-bot:3002').replace(/\/+$/, '');
  try {
    const response = await fetch(botServiceUrl + '/excises/send', {
      method: 'POST',
      headers: { 'X-Minibar-Bot-Token': token }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok !== true) {
      return res.status(response.status || 502).json({
        ok: false,
        error: data.error || 'Не удалось отправить Excel-файл в беседу'
      });
    }
    return res.json(data);
  } catch (err) {
    console.error('POST /api/excises/send-to-chat error:', err);
    return res.status(502).json({ error: 'Не удалось связаться с ботом для отправки акцизов' });
  }
});

router.post('/clear-before', async (req, res) => {
  const expected = String(process.env.VK_BOT_INTERNAL_TOKEN || '').trim();
  const actual = String(req.get('x-minibar-bot-token') || '').trim();
  if (!expected || actual !== expected) return res.status(401).json({ error: 'Unauthorized' });

  const before = new Date(req.body?.before);
  if (!req.body?.before || !Number.isFinite(before.getTime())) {
    return res.status(400).json({ error: 'Некорректная дата экспорта' });
  }

  try {
    const result = await prisma.excise.deleteMany({
      where: { createdAt: { lte: before } }
    });
    return res.json({ ok: true, deleted: result.count });
  } catch (err) {
    console.error('POST /api/excises/clear-before error:', err);
    return res.status(500).json({ error: 'Не удалось очистить акцизы в базе данных' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const result = await prisma.excise.deleteMany({});
    res.json({ ok: true, deleted: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.excise.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
