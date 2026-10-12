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
    if (!Number.isInteger(templateId) || templateId <= 0) {
      return res.status(400).json({ error: 'Некорректный ID шаблона.' });
    }

    if (!Array.isArray(req.body.items)) {
      return res.status(400).json({ error: 'Список продуктов шаблона должен быть массивом.' });
    }

    // The database requires a product to appear only once in each template.
    // Merge duplicate product rows defensively; their quantities are additive.
    const itemsByProduct = new Map();
    req.body.items.forEach((item, index) => {
      const productId = Number.parseInt(item?.productId, 10);
      const qty = Number.parseInt(item?.qty, 10);
      if (!Number.isInteger(productId) || productId <= 0) {
        throw new Error('В шаблоне обнаружен некорректный продукт.');
      }
      if (!Number.isInteger(qty) || qty < 0) {
        throw new Error('Количество продукта должно быть целым неотрицательным числом.');
      }
      if (qty === 0) return;

      const parsedSortOrder = Number.parseInt(item?.sortOrder, 10);
      const sortOrder = Number.isInteger(parsedSortOrder) ? parsedSortOrder : index;
      const existing = itemsByProduct.get(productId);
      if (existing) {
        existing.qty += qty;
        existing.sortOrder = Math.min(existing.sortOrder, sortOrder);
      } else {
        itemsByProduct.set(productId, { templateId, productId, qty, sortOrder });
      }
    });

    const normalizedItems = [...itemsByProduct.values()];

    await prisma.$transaction(async (tx) => {
      const template = await tx.fillTemplate.findUnique({ where: { id: templateId }, select: { id: true } });
      if (!template) {
        const error = new Error('Шаблон не найден.');
        error.statusCode = 404;
        throw error;
      }

      if (normalizedItems.length > 0) {
        const archived = await tx.product.findFirst({
          where: { id: { in: normalizedItems.map(item => item.productId) }, isActive: false },
          select: { id: true }
        });
        if (archived) {
          const error = new Error('Архивный продукт нельзя добавить в активный шаблон. Обновите страницу.');
          error.statusCode = 409;
          throw error;
        }
      }

      await tx.templateItem.deleteMany({ where: { templateId } });
      if (normalizedItems.length > 0) {
        await tx.templateItem.createMany({ data: normalizedItems });
      }
    });

    const updated = await prisma.fillTemplate.findUnique({
      where: { id: templateId },
      include: { items: { include: { product: true }, orderBy: { sortOrder: 'asc' } } }
    });
    res.json(updated);
  } catch (err) {
    console.error('PUT templates/:id/items error:', err);
    if (err?.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err?.code === 'P2002') {
      return res.status(409).json({
        error: 'В шаблоне каждый продукт должен быть указан один раз. Повторяющиеся строки объединены; обновите страницу и попробуйте снова.'
      });
    }
    if (err?.code === 'P2003') {
      return res.status(400).json({ error: 'Один из продуктов шаблона больше не существует. Обновите список и попробуйте снова.' });
    }
    if (err instanceof Error && (
      err.message === 'В шаблоне обнаружен некорректный продукт.' ||
      err.message === 'Количество продукта должно быть целым неотрицательным числом.'
    )) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
