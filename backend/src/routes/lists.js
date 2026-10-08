import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const lists = await prisma.activeList.findMany({
      include: { rooms: { include: { room: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
