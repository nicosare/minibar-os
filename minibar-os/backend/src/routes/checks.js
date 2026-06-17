import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const checks = await prisma.check.findMany({
      include: { room: true, gihItems: { include: { product: true } } },
      orderBy: { checkDate: 'desc' },
      take: limit
    });
    res.json(checks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const check = await prisma.check.create({ data: req.body });
    res.json(check);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
