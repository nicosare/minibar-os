import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();

// Capture product details on each GIH line so later catalog edits never rewrite history.
async function snapshotGihItems(db, requestedItems, existingCounts = new Map()) {
  const normalized = (Array.isArray(requestedItems) ? requestedItems : []).map(item => {
    const productId = Number.parseInt(item?.productId, 10);
    if (!Number.isInteger(productId) || productId <= 0) {
      const error = new Error('В записи указан некорректный продукт.');
      error.statusCode = 400;
      throw error;
    }
    const qty = Math.max(0, Number.parseInt(item?.qty, 10) || 1);
    return { productId, qty };
  }).filter(item => item.qty > 0);

  if (!normalized.length) return [];
  const uniqueIds = [...new Set(normalized.map(item => item.productId))];
  const products = await db.product.findMany({ where: { id: { in: uniqueIds } } });
  const byId = new Map(products.map(product => [product.id, product]));
  const missingId = uniqueIds.find(id => !byId.has(id));
  if (missingId) {
    const error = new Error('Один из продуктов больше не существует. Обновите запись и попробуйте снова.');
    error.statusCode = 400;
    throw error;
  }

  const requestedCounts = new Map();
  normalized.forEach(item => requestedCounts.set(item.productId, (requestedCounts.get(item.productId) || 0) + item.qty));
  for (const product of products) {
    if (!product.isActive && (requestedCounts.get(product.id) || 0) > (existingCounts.get(product.id) || 0)) {
      const error = new Error('Архивный продукт нельзя добавлять в новые записи. Удалите его из текущей записи или обновите страницу.');
      error.statusCode = 409;
      throw error;
    }
  }

  const rows = [];
  for (const item of normalized) {
    const product = byId.get(item.productId);
    for (let index = 0; index < item.qty; index += 1) {
      rows.push({
        productId: product.id,
        itemStatus: 'pending',
        productName: product.name,
        productPrice: product.price,
        productVolume: product.volume,
        productUnit: product.unit,
        productEmoji: product.emoji,
        productBgColor: product.bgColor,
        productCategory: product.category
      });
    }
  }
  return rows;
}

function dateRangeFromQuery(query, maxDays = 33) {
  const hasFrom = query.from !== undefined && query.from !== '';
  const hasTo = query.to !== undefined && query.to !== '';
  if (!hasFrom && !hasTo) return null;
  if (!hasFrom || !hasTo) {
    const error = new Error('Нужно указать начало и конец диапазона дат');
    error.statusCode = 400;
    throw error;
  }

  const from = new Date(String(query.from));
  const to = new Date(String(query.to));
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from >= to) {
    const error = new Error('Некорректный диапазон дат');
    error.statusCode = 400;
    throw error;
  }
  if (to.getTime() - from.getTime() > maxDays * 24 * 60 * 60 * 1000) {
    const error = new Error('Диапазон дат слишком большой');
    error.statusCode = 400;
    throw error;
  }
  return { gte: from, lt: to };
}

function historyBaseConditions() {
  // Не показываем черновики GIH, но сохраняем обычные проверки и опустошения.
  return [{ OR: [{ type: { not: 'gih' } }, { type: 'gih', status: 'done' }] }];
}

function applyOperationFilter(conditions, operation) {
  if (operation === 'daily') {
    conditions.push({ type: { notIn: ['gih', 'deadline', 'deadline_undo'] } });
  } else if (operation === 'check') {
    conditions.push({ type: { notIn: ['gih', 'deadline', 'deadline_undo', 'emptied', 'vk_emptied', 'vk_emptied_undo'] } });
  } else if (operation === 'emptied') {
    conditions.push({ type: { in: ['emptied', 'vk_emptied', 'vk_emptied_undo'] } });
  } else if (operation === 'deadlines') {
    conditions.push({ type: { in: ['deadline', 'deadline_undo'] } });
  } else if (operation === 'room') {
    conditions.push({ type: { not: 'deadline' } });
  } else if (operation === 'gih') {
    conditions.push({ type: 'gih', status: 'done' });
  } else if (operation !== 'all') {
    const error = new Error('Неизвестный тип операции');
    error.statusCode = 400;
    throw error;
  }
}

async function roomCondition(roomText) {
  if (!roomText) return null;
  if (!/^\d+$/.test(roomText)) {
    const error = new Error('Номер комнаты должен содержать только цифры');
    error.statusCode = 400;
    throw error;
  }
  const matchingRooms = await prisma.$queryRawUnsafe(
    'SELECT id FROM rooms WHERE CAST(number AS TEXT) = $1',
    roomText
  );
  return { roomId: { in: matchingRooms.map(room => room.id) } };
}

router.get('/', async (req, res) => {
  try {
    const { type, status, limit } = req.query;
    const where = {};
    if (type) where.type = type;
    else where.type = { not: 'deadline' };
    if (status) where.status = status;
    const checks = await prisma.check.findMany({
      where,
      include: { room: true, gihItems: { include: { product: true } } },
      orderBy: { checkDate: 'desc' },
      ...(limit ? { take: parseInt(limit, 10) } : {})
    });
    res.json(checks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lightweight timestamp/type list used to place per-day counters in the custom calendar.
router.get('/history/calendar', async (req, res) => {
  try {
    const range = dateRangeFromQuery(req.query, 45);
    if (!range) return res.status(400).json({ error: 'Укажите диапазон дат календаря' });
    const where = {
      AND: [
        { checkDate: range },
        { OR: [{ type: { not: 'gih' } }, { type: 'gih', status: 'done' }] }
      ]
    };
    const items = await prisma.check.findMany({
      where,
      select: { checkDate: true, type: true },
      orderBy: { checkDate: 'asc' }
    });
    res.set('Cache-Control', 'no-store');
    res.json({ items });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Не удалось загрузить даты Истории' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const operation = String(req.query.operation || 'all');
    const roomText = String(req.query.room || '').trim();
    const roomIdRaw = String(req.query.roomId || '').trim();
    const roomId = roomIdRaw ? parseInt(roomIdRaw, 10) : null;
    if (roomIdRaw && (!Number.isInteger(roomId) || roomId <= 0)) {
      return res.status(400).json({ error: 'Некорректный ID комнаты' });
    }
    const range = dateRangeFromQuery(req.query, 33);

    const conditions = historyBaseConditions();
    applyOperationFilter(conditions, operation);
    if (range) conditions.push({ checkDate: range });
    if (roomId) conditions.push({ roomId });

    const matchedRoomCondition = await roomCondition(roomText);
    if (matchedRoomCondition) conditions.push(matchedRoomCondition);

    const where = { AND: conditions };

    // Date view and room search are deliberately unpaginated. The daily view must show
    // every operation for that day, while a room search spans the selected category
    // across dates (as in the legacy minibars History).
    if (range || roomText || roomId) {
      const items = await prisma.check.findMany({
        where,
        include: { room: true, gihItems: { include: { product: true } } },
        orderBy: [{ checkDate: 'desc' }, { id: 'desc' }]
      });
      res.set('Cache-Control', 'no-store');
      return res.json({ items, total: items.length, page: 1, pageCount: 1, pageSize: items.length });
    }

    // Keep the previous paginated API behaviour for callers that still use it.
    const requestedPage = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
    const result = await prisma.$transaction(async tx => {
      const total = await tx.check.count({ where });
      const pageCount = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(requestedPage, pageCount);
      const items = await tx.check.findMany({
        where,
        include: { room: true, gihItems: { include: { product: true } } },
        orderBy: [{ checkDate: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      });
      return { items, total, page, pageCount };
    });

    res.set('Cache-Control', 'no-store');
    res.json({ ...result, pageSize });
  } catch (error) {
    console.error('GET /api/checks/history error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Не удалось загрузить историю' });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const data = { roomId: parseInt(b.roomId, 10), type: b.type || 'gih', status: b.status || 'draft', gihRoomStatus: b.gihRoomStatus || null, notes: b.notes || null };
    const items = await snapshotGihItems(prisma, b.gihItems || []);
    if (items.length) data.gihItems = { create: items };
    const check = await prisma.check.create({ data, include: { room: true, gihItems: { include: { product: true } } } });
    res.json(check);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, gihRoomStatus, notes, pills, gihItems, roomId } = req.body || {};
    const data = {};
    if (status !== undefined) data.status = status;
    if (gihRoomStatus !== undefined) data.gihRoomStatus = gihRoomStatus;
    if (notes !== undefined) data.notes = notes;
    if (roomId !== undefined) data.roomId = parseInt(roomId, 10);
    if (status === 'done') data.checkDate = new Date();
    const check = await prisma.$transaction(async tx => {
      if (Array.isArray(gihItems)) {
        const existingItems = await tx.gihItem.findMany({ where: { checkId: id }, select: { productId: true } });
        const existingCounts = new Map();
        existingItems.forEach(item => existingCounts.set(item.productId, (existingCounts.get(item.productId) || 0) + 1));
        const create = await snapshotGihItems(tx, gihItems, existingCounts);
        await tx.gihItem.deleteMany({ where: { checkId: id } });
        if (create.length) await tx.gihItem.createMany({ data: create.map(item => ({ ...item, checkId: id })) });
      } else if (Array.isArray(pills)) {
        await Promise.all(pills.map(p => tx.gihItem.update({ where: { id: parseInt(p.id, 10) }, data: { itemStatus: p.itemStatus } })));
      }
      return tx.check.update({ where: { id }, data, include: { room: true, gihItems: { include: { product: true } } } });
    });
    res.json(check);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});
router.delete('/:id', async (req, res) => {
  try { await prisma.check.delete({ where: { id: parseInt(req.params.id, 10) } }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
export default router;
