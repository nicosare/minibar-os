import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
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

    const inTemplate = await prisma.templateItem.count({ where: { productId } });
    if (inTemplate > 0) {
      return res.status(409).json({
        error: `Нельзя удалить продукт: он используется в ${inTemplate} элементах шаблонов. Сначала удалите его из шаблонов.`
      });
    }

    // GIH items are historical check records. Keep them intact instead of
    // deleting history or letting PostgreSQL return a raw foreign-key error.
    const inGihHistory = await prisma.gihItem.count({ where: { productId } });
    if (inGihHistory > 0) {
      return res.status(409).json({
        error: `Нельзя удалить продукт: он встречается в ${inGihHistory} записях истории GIH. Исторические проверки сохранены.`
      });
    }

    await prisma.product.delete({ where: { id: productId } });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE products error:', err);
    if (err?.code === 'P2003') {
      return res.status(409).json({
        error: 'Нельзя удалить продукт: он связан с сохранёнными записями. Данные истории не были изменены.'
      });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
