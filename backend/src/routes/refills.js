import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

function serializeRequest(request) {
  return {
    id: request.id,
    roomId: request.roomId,
    roomNumber: String(request.room?.number ?? ''),
    floor: request.room?.floor ?? null,
    status: request.status,
    allProducts: Boolean(request.allProducts),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    completedAt: request.completedAt,
    items: (request.items || []).map(item => ({
      id: item.id,
      productId: item.productId,
      name: item.productName,
      category: item.productCategory || 'Напитки',
      volume: item.productVolume,
      unit: item.productUnit || 'шт',
      emoji: item.productEmoji,
      bgColor: item.productBgColor || 'slate',
      qty: Number(item.qty) || 0
    }))
  };
}

function summarizeRequests(requests) {
  const grouped = new Map();
  let totalUnits = 0;
  for (const request of requests) {
    const roomNumber = String(request.room?.number ?? '');
    for (const item of request.items || []) {
      const qty = Math.max(0, Number(item.qty) || 0);
      if (!qty) continue;
      totalUnits += qty;
      // Names/categories are snapshots. If the catalog was renamed while this
      // request remained open, retain the distinct saved identity in the list.
      const key = String(item.productId) + '\u001f' + String(item.productName || '');
      if (!grouped.has(key)) {
        grouped.set(key, {
          productId: item.productId,
          name: item.productName,
          category: item.productCategory || 'Напитки',
          volume: item.productVolume,
          unit: item.productUnit || 'шт',
          emoji: item.productEmoji,
          bgColor: item.productBgColor || 'slate',
          qty: 0,
          rooms: []
        });
      }
      const entry = grouped.get(key);
      entry.qty += qty;
      entry.rooms.push({ roomId: request.roomId, number: roomNumber, qty });
    }
  }
  const products = [...grouped.values()]
    .map(product => ({
      ...product,
      rooms: product.rooms.sort((a, b) => Number(a.number) - Number(b.number))
    }))
    .sort((a, b) => (a.category || '').localeCompare(b.category || '', 'ru') ||
      (a.name || '').localeCompare(b.name || '', 'ru'));
  return {
    totalRooms: requests.length,
    totalUnits,
    products
  };
}

router.get('/active', async (req, res) => {
  try {
    const roomIdRaw = String(req.query.roomId || '').trim();
    const roomId = roomIdRaw ? Number.parseInt(roomIdRaw, 10) : null;
    if (roomIdRaw && (!Number.isInteger(roomId) || roomId <= 0)) {
      return res.status(400).json({ error: 'Некорректный ID номера' });
    }

    const requests = await prisma.refillRequest.findMany({
      where: {
        status: 'pending',
        activeKey: { not: null },
        ...(roomId ? { roomId } : {})
      },
      include: {
        room: { select: { id: true, number: true, floor: true } },
        items: { orderBy: [{ productCategory: 'asc' }, { productName: 'asc' }] }
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });
    const serialized = requests.map(serializeRequest);
    res.set('Cache-Control', 'no-store');
    res.json({
      requests: serialized,
      ...summarizeRequests(requests)
    });
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
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ error: 'Некорректный номер комнаты' });
    }

    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${roomId} FOR UPDATE`;
      const room = await tx.room.findUnique({
        where: { id: roomId },
        include: {
          template: {
            include: {
              items: { include: { product: true } }
            }
          }
        }
      });
      if (!room) {
        const error = new Error('Номер не найден');
        error.statusCode = 404;
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
      const activeKey = String(roomId);
      const existing = await tx.refillRequest.findUnique({
        where: { activeKey },
        include: { items: true }
      });

      let normalized;
      if (allProducts) {
        normalized = templateItems.map(item => ({
          productId: item.productId,
          qty: item.qty,
          productName: item.product.name,
          productCategory: item.product.category || 'Напитки',
          productVolume: item.product.volume,
          productUnit: item.product.unit || 'шт',
          productEmoji: item.product.emoji,
          productBgColor: item.product.bgColor || 'slate'
        }));
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

        const previousByProduct = new Map((existing?.items || []).map(item => [item.productId, item]));
        normalized = [];
        for (const [productId, qty] of unique) {
          const current = templateByProduct.get(productId);
          if (current) {
            if (qty > current.qty) {
              const error = new Error('Количество превышает шаблон наполнения номера');
              error.statusCode = 400;
              throw error;
            }
            normalized.push({
              productId,
              qty,
              productName: current.product.name,
              productCategory: current.product.category || 'Напитки',
              productVolume: current.product.volume,
              productUnit: current.product.unit || 'шт',
              productEmoji: current.product.emoji,
              productBgColor: current.product.bgColor || 'slate'
            });
            continue;
          }
          // Existing snapshot-only items stay editable even if an administrator
          // later removed them from the current template.
          const previous = previousByProduct.get(productId);
          if (!previous || qty > Number(previous.qty)) {
            const error = new Error('В списке есть продукт, которого нет в шаблоне номера. Обнови список и попробуй снова.');
            error.statusCode = 409;
            throw error;
          }
          normalized.push({
            productId,
            qty,
            productName: previous.productName,
            productCategory: previous.productCategory,
            productVolume: previous.productVolume,
            productUnit: previous.productUnit,
            productEmoji: previous.productEmoji,
            productBgColor: previous.productBgColor
          });
        }
      }

      if (!normalized.length) {
        if (!existing) {
          const error = new Error('Выбери продукты или включи «Всё в списке продуктов»');
          error.statusCode = 400;
          throw error;
        }
        return tx.refillRequest.update({
          where: { id: existing.id },
          data: { status: 'cancelled', activeKey: null, completedAt: null },
          include: {
            room: { select: { id: true, number: true, floor: true } },
            items: true
          }
        });
      }

      let saved;
      if (existing) {
        saved = await tx.refillRequest.update({
          where: { id: existing.id },
          data: {
            allProducts,
            status: 'pending',
            completedAt: null,
            updatedAt: new Date()
          },
          include: {
            room: { select: { id: true, number: true, floor: true } },
            items: true
          }
        });
        await tx.refillRequestItem.deleteMany({ where: { requestId: existing.id } });
        await tx.refillRequestItem.createMany({
          data: normalized.map(item => ({ requestId: existing.id, ...item }))
        });
        saved = await tx.refillRequest.findUnique({
          where: { id: existing.id },
          include: {
            room: { select: { id: true, number: true, floor: true } },
            items: true
          }
        });
      } else {
        saved = await tx.refillRequest.create({
          data: {
            roomId,
            status: 'pending',
            activeKey,
            allProducts,
            items: { create: normalized }
          },
          include: {
            room: { select: { id: true, number: true, floor: true } },
            items: true
          }
        });
      }

      return saved;
    });

    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, request: serializeRequest(result) });
  } catch (error) {
    console.error('POST refill request error:', error);
    res.status(error.statusCode || 500).json({
      error: error.message || 'Не удалось сохранить пополнение'
    });
  }
});

// Called only by the VK proxy after VK confirms the photo message was sent.
router.post('/complete-after-photo', async (req, res) => {
  const expected = String(process.env.VK_BOT_INTERNAL_TOKEN || '').trim();
  const actual = String(req.get('x-minibar-bot-token') || '').trim();
  if (!expected || actual !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const requestId = Number.parseInt(req.body?.refillRequestId, 10);
    const roomNumber = String(req.body?.roomNumber || '').trim();
    if (!Number.isInteger(requestId) || requestId <= 0 || !/^\d{1,4}$/.test(roomNumber)) {
      return res.status(400).json({ error: 'Некорректные данные подтверждения фото' });
    }

    const current = await prisma.refillRequest.findUnique({
      where: { id: requestId },
      include: { room: { select: { id: true, number: true } } }
    });
    if (!current || String(current.room?.number ?? '') !== roomNumber) {
      return res.json({ ok: true, status: 'stale_request', completed: false });
    }
    if (current.status === 'completed') {
      return res.json({ ok: true, status: 'already_completed', completed: false });
    }
    if (current.status !== 'pending') {
      return res.json({ ok: true, status: 'stale_request', completed: false });
    }

    const completed = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${current.roomId} FOR UPDATE`;
      const locked = await tx.refillRequest.findUnique({ where: { id: requestId } });
      if (!locked || locked.status !== 'pending' || locked.activeKey !== String(current.roomId)) {
        return { status: locked?.status === 'completed' ? 'already_completed' : 'stale_request', completed: false };
      }
      await tx.refillRequest.update({
        where: { id: requestId },
        data: { status: 'completed', activeKey: null, completedAt: new Date() }
      });
      return { status: 'completed', completed: true };
    });
    return res.json({ ok: true, ...completed });
  } catch (error) {
    console.error('POST refill photo completion error:', error);
    return res.status(500).json({ error: error.message || 'Не удалось закрыть пополнение' });
  }
});

export default router;
