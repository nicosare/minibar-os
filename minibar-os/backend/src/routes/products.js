import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    res.json(products);
  } catch (err) {
    console.error('GET products error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id, 10) }
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

router.put('/:id', async (req, res) => {
  try {
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
    const inTemplate = await prisma.templateItem.count({ where: { productId } });
    if (inTemplate > 0) {
      return res.status(400).json({
        error: `Продукт используется в ${inTemplate} шаблон(ах). Сначала удалите его из шаблонов.`
      });
    }
    await prisma.product.delete({ where: { id: productId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
