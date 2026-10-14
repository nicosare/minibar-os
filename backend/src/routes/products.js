import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    res.json(products);
  } catch (err) {
    console.error('GET products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: parseInt(req.params.id, 10), isActive: true }
    });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, price, volume, unit, hasExpiry, emoji, bgColor, category } = req.body;
    if (!name || price === undefined || volume === undefined) {
      return res.status(400).json({ error: 'Название, цена и объём обязательны' });
    }
    const product = await prisma.product.create({
      data: {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        price: parseFloat(price),
        volume: parseFloat(volume),
        unit: unit || 'шт',
        emoji: emoji || null,
        bgColor: bgColor || 'slate',
        category: category || 'Напитки',
        hasExpiry: hasExpiry !== false && hasExpiry !== 'false'
      }
    });
    res.json(product);
  } catch (err) {
    console.error('POST products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/reorder', async (req, res) => {
  try {
    const order = Array.isArray(req.body.order) ? req.body.order : [];
    await prisma.$transaction(order.map((id, idx) =>
      prisma.product.update({ where: { id: parseInt(id, 10) }, data: { sortOrder: idx } })
    ));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const current = await prisma.product.findFirst({ where: { id: productId, isActive: true } });
    if (!current) return res.status(404).json({ error: 'Активный продукт не найден.' });
    const { name, price, volume, unit, hasExpiry, emoji, bgColor, category } = req.body;
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id, 10) },
      data: {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        price: parseFloat(price),
        volume: parseFloat(volume),
        unit: unit || 'шт',
        emoji: emoji || null,
        bgColor: bgColor || 'slate',
        category: category || 'Напитки',
        hasExpiry: hasExpiry !== false && hasExpiry !== 'false'
      }
    });
    res.json(product);
  } catch (err) {
    console.error('PUT products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({ error: 'Некорректный ID продукта.' });
    }

    const archived = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) return false;
      if (!product.isActive) return true; // Idempotent archive.

      // Remove the product only from live configuration. GIH records and
      // monthly-check rows are retained as historical data.
      await tx.templateItem.deleteMany({ where: { productId } });
      await tx.roomCustom.deleteMany({ where: { productId } });
      await tx.replacementItem.deleteMany({ where: { productId } });
      await tx.roomProductStatus.deleteMany({ where: { productId } });
      await tx.product.update({ where: { id: productId }, data: { isActive: false } });
      return true;
    });

    if (!archived) return res.status(404).json({ error: 'Продукт не найден.' });
    res.json({ ok: true, archived: true });
  } catch (err) {
    console.error('ARCHIVE product error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
