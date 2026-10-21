import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();
const ACTIVE_PREFIX = 'miniapp-refill-active:';

function activeKey(roomId) {
  return ACTIVE_PREFIX + String(roomId);
}

function parseRecord(setting) {
  try {
    const record = JSON.parse(String(setting?.value || 'null'));
    if (!record || record.status !== 'pending' || !record.roomId || !record.id) return null;
    return record;
  } catch (_) {
    return null;
  }
}

function serializeRecord(record) {
  return {
    id: Number(record.id),
    roomId: Number(record.roomId),
    roomNumber: String(record.roomNumber || ''),
    floor: Number(record.floor) || null,
    status: record.status || 'pending',
    allProducts: Boolean(record.allProducts),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    items: (Array.isArray(record.items) ? record.items : []).map(item => ({
      productId: Number(item.productId),
      name: String(item.name || 'Продукт'),
      category: item.category || 'Напитки',
      volume: item.volume ?? null,
      unit: item.unit || 'шт',
      emoji: item.emoji || null,
      bgColor: item.bgColor || 'slate',
      qty: Math.max(0, Number(item.qty) || 0),
      maxQty: Math.max(1, Number(item.maxQty) || Number(item.qty) || 1)
    }))
  };
}

function summarizeRequests(requests) {
  const grouped = new Map();
  let totalUnits = 0;
  for (const request of requests) {
    for (const item of request.items || []) {
      const qty = Math.max(0, Number(item.qty) || 0);
      if (!qty) continue;
      totalUnits += qty;
      const key = String(item.productId) + '\u001f' + String(item.name || '');
      if (!grouped.has(key)) {
        grouped.set(key, {
          productId: item.productId,
          name: item.name,
          category: item.category || 'Напитки',
          volume: item.volume ?? null,
          unit: item.unit || 'шт',
          emoji: item.emoji || null,
          bgColor: item.bgColor || 'slate',
          qty: 0,
          rooms: []
        });
      }
      const product = grouped.get(key);
      product.qty += qty;
      product.rooms.push({
        roomId: request.roomId,
        number: String(request.roomNumber),
        qty
      });
    }
  }
  const products = [...grouped.values()]
    .map(product => ({
      ...product,
      rooms: product.rooms.sort((a, b) => Number(a.number) - Number(b.number))
    }))
    .sort((a, b) => (a.category || '').localeCompare(b.category || '', 'ru') ||
      (a.name || '').localeCompare(b.name || '', 'ru'));
  return { totalRooms: requests.length, totalUnits, products };
}

function newRequestId() {
  // Numeric and safely representable in JavaScript / form data. Every save gets
  // a new version ID, so a photo captured before editing cannot close newer work.
  return Date.now() * 1000 + Math.floor(Math.random() * 1000);
}

router.get('/active', async (req, res) => {
  try {
    const roomIdRaw = String(req.query.roomId || '').trim();
    const roomId = roomIdRaw ? Number.parseInt(roomIdRaw, 10) : null;
    if (roomIdRaw && (!Number.isInteger(roomId) || roomId <= 0)) {
      return res.status(400).json({ error: 'Некорректный ID номера' });
    }

    const settings = await prisma.setting.findMany({
      where: roomId
        ? { key: activeKey(roomId) }
        : { key: { startsWith: ACTIVE_PREFIX } },
      orderBy: [{ updatedAt: 'asc' }, { key: 'asc' }]
    });
    const requests = settings.map(parseRecord).filter(Boolean)
      .map(serializeRecord)
      .filter(request => !roomId || request.roomId === roomId);
    res.set('Cache-Control', 'no-store');
    res.json({ requests, ...summarizeRequests(requests) });
  } catch (error) {
    console.error('GET active refills error:', error);
    res.status(500).json({ error: error.message || 'Не удалось загрузить пополнения' });
  }
});

router.post('/', async (req, res) => {
  try {
    const roomId = Number.parseInt(req.body?.roomId, 10);
    const allProducts = req.body?.allProducts === true;
    const requestedItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const hasExpectedRequest = Object.prototype.hasOwnProperty.call(req.body || {}, 'expectedRequestId');
    const expectedRequestId = req.body?.expectedRequestId == null ? null : Number(req.body.expectedRequestId);
    if (hasExpectedRequest && expectedRequestId !== null &&
        (!Number.isSafeInteger(expectedRequestId) || expectedRequestId <= 0)) {
      return res.status(400).json({ error: 'Некорректная версия пополнения' });
    }
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ error: 'Некорректный номер комнаты' });
    }

    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${roomId} FOR UPDATE`;
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: { template: { include: { items: { include: { product: true } } } } }
      });
      if (!room) {
        const error = new Error('Номер не найден');
        error.statusCode = 404;
        throw error;
      }

      const key = activeKey(roomId);
      const stored = await tx.setting.findUnique({ where: { key } });
      const existing = parseRecord(stored);
      if (hasExpectedRequest && (existing ? Number(existing.id) : null) !== expectedRequestId) {
        const error = new Error('Потребность изменилась с момента открытия. Закрой окно и открой пополнение ещё раз.');
        error.statusCode = 409;
        throw error;
      }
      const templateItems = (room.template?.items || [])
        .filter(item => item.product && item.product.isActive)
        .map(item => ({
          productId: Number(item.productId),
          qty: Math.max(1, Number.parseInt(item.qty, 10) || 1),
          product: item.product
        }));
      const templateByProduct = new Map(templateItems.map(item => [item.productId, item]));
      let normalized;

      if (allProducts && existing?.allProducts && Array.isArray(existing.items)) {
        normalized = existing.items.map(item => ({
          productId: Number(item.productId),
          qty: Number(item.qty),
          maxQty: Math.max(1, Number(item.maxQty) || Number(item.qty) || 1),
          name: item.name,
          category: item.category || 'Напитки',
          volume: item.volume ?? null,
          unit: item.unit || 'шт',
          emoji: item.emoji || null,
          bgColor: item.bgColor || 'slate'
        }));
      } else if (allProducts) {
        normalized = templateItems.map(item => ({
          productId: item.productId,
          qty: item.qty,
          maxQty: item.qty,
          name: item.product.name,
          category: item.product.category || 'Напитки',
          volume: item.product.volume ?? null,
          unit: item.product.unit || 'шт',
          emoji: item.product.emoji || null,
          bgColor: item.product.bgColor || 'slate'
        }));
        if (!normalized.length) {
          const error = new Error('У этого номера нет активных продуктов в шаблоне наполнения');
          error.statusCode = 400;
          throw error;
        }
      } else {
        const unique = new Map();
        for (const item of requestedItems) {
          const productId = Number.parseInt(item?.productId, 10);
          const qty = Number.parseInt(item?.qty, 10);
          if (!Number.isInteger(productId) || productId <= 0 ||
              !Number.isInteger(qty) || qty < 0 || unique.has(productId)) {
            const error = new Error('Проверь выбранные продукты и их количество');
            error.statusCode = 400;
            throw error;
          }
          if (qty > 0) unique.set(productId, qty);
        }

        const previousByProduct = new Map((existing?.items || []).map(item => [Number(item.productId), item]));
        normalized = [];
        for (const [productId, qty] of unique) {
          const current = templateByProduct.get(productId);
          const previous = previousByProduct.get(productId);
          if (previous) {
            const maxQty = Math.max(1, Number(previous.maxQty) || Number(previous.qty) || 1);
            if (qty > maxQty) {
              const error = new Error('Количество превышает сохранённый шаблон наполнения номера');
              error.statusCode = 400;
              throw error;
            }
            normalized.push({
              productId, qty, maxQty,
              name: previous.name,
              category: previous.category || 'Напитки',
              volume: previous.volume ?? null,
              unit: previous.unit || 'шт',
              emoji: previous.emoji || null,
              bgColor: previous.bgColor || 'slate'
            });
            continue;
          }
          if (current) {
            if (qty > current.qty) {
              const error = new Error('Количество превышает шаблон наполнения номера');
              error.statusCode = 400;
              throw error;
            }
            normalized.push({
              productId, qty, maxQty: current.qty,
              name: current.product.name,
              category: current.product.category || 'Напитки',
              volume: current.product.volume ?? null,
              unit: current.product.unit || 'шт',
              emoji: current.product.emoji || null,
              bgColor: current.product.bgColor || 'slate'
            });
            continue;
          }
          if (!previous || qty > Number(previous.qty)) {
            const error = new Error('Продукта больше нет в шаблоне номера. Обнови список и попробуй снова.');
            error.statusCode = 409;
            throw error;
          }
          normalized.push({
            productId, qty,
            name: previous.name,
            category: previous.category || 'Напитки',
            volume: previous.volume ?? null,
            unit: previous.unit || 'шт',
            emoji: previous.emoji || null,
            bgColor: previous.bgColor || 'slate'
          });
        }
      }

      if (!normalized.length) {
        if (!existing) {
          const error = new Error('Выбери продукты или включи «Всё в списке продуктов»');
          error.statusCode = 400;
          throw error;
        }
        await tx.setting.delete({ where: { key } });
        return { ...existing, status: 'cancelled' };
      }

      const now = new Date().toISOString();
      const record = {
        id: newRequestId(),
        roomId,
        roomNumber: String(room.number),
        floor: room.floor,
        status: 'pending',
        allProducts,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        items: normalized.map(item => ({
          ...item,
          maxQty: Math.max(1, Number(item.maxQty) || Number(item.qty) || 1)
        }))
      };
      await tx.setting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(record) },
        update: { value: JSON.stringify(record), updatedAt: new Date() }
      });
      return record;
    });

    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, request: serializeRecord(result) });
  } catch (error) {
    console.error('POST refill request error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Не удалось сохранить пополнение'
    });
  }
});

// Only the VK proxy calls this endpoint after VK confirms the photo was sent.
router.post('/complete-after-photo', async (req, res) => {
  const expected = String(process.env.VK_BOT_INTERNAL_TOKEN || '').trim();
  const actual = String(req.get('x-minibar-bot-token') || '').trim();
  if (!expected || actual !== expected) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const requestId = Number(req.body?.refillRequestId);
    const roomNumber = String(req.body?.roomNumber || '').trim();
    if (!Number.isSafeInteger(requestId) || requestId <= 0 || !/^\d{1,4}$/.test(roomNumber)) {
      return res.status(400).json({ error: 'Некорректные данные подтверждения фото' });
    }

    const room = await prisma.room.findUnique({ where: { number: Number(roomNumber) }, select: { id: true, number: true } });
    if (!room) return res.json({ ok: true, status: 'stale_request', completed: false });

    const completion = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${room.id} FOR UPDATE`;
      const key = activeKey(room.id);
      const setting = await tx.setting.findUnique({ where: { key } });
      const record = parseRecord(setting);
      if (!record || Number(record.id) !== requestId) {
        // This photo belongs to an older version (or no active refill); leave
        // any newer request untouched.
        return { status: 'stale_request', completed: false };
      }
      await tx.setting.delete({ where: { key } });
      return { status: 'completed', completed: true };
    });

    return res.json({ ok: true, ...completion });
  } catch (error) {
    console.error('POST refill photo completion error:', error);
    return res.status(500).json({ error: error.message || 'Не удалось закрыть пополнение' });
  }
});

export default router;
