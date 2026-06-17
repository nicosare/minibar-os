import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const templates = await prisma.fillTemplate.findMany({
      include: {
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: { category: 'asc' }
    });
    res.json(templates);
  } catch (err) {
    console.error('GET templates error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/items', async (req, res) => {
  try {
    const templateId = parseInt(req.params.id, 10);
    const { items } = req.body;

    await prisma.$transaction(async (tx) => {
      await tx.templateItem.deleteMany({ where: { templateId } });
      if (items?.length > 0) {
        await tx.templateItem.createMany({
          data: items.map((i, idx) => ({
            templateId,
            productId: parseInt(i.productId, 10),
            qty: parseInt(i.qty, 10),
            sortOrder: i.sortOrder !== undefined ? i.sortOrder : idx
          }))
        });
      }
    });

    const updated = await prisma.fillTemplate.findUnique({
      where: { id: templateId },
      include: { items: { include: { product: true }, orderBy: { sortOrder: 'asc' } } }
    });
    res.json(updated);
  } catch (err) {
    console.error('PUT templates/:id/items error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
