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
