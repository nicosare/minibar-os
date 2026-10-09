import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
const router = Router();
router.get('/', async (req, res) => {
  try {
    const { type, status, limit } = req.query; const where = {};
    if (type) where.type = type; if (status) where.status = status;
    const checks = await prisma.check.findMany({
      where, include: { room: true, gihItems: { include: { product: true } } },
      orderBy: { checkDate: 'desc' }, ...(limit ? { take: parseInt(limit, 10) } : {})
    });
    res.json(checks);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = 25;
    const operation = String(req.query.operation || 'all');
    const roomText = String(req.query.room || '').trim();

    if (!['all', 'check', 'emptied', 'gih'].includes(operation)) {
      return res.status(400).json({ error: 'Неизвестный тип операции' });
    }

    if (roomText && !/^\d+$/.test(roomText)) {
      return res.status(400).json({ error: 'Номер комнаты должен содержать только цифры' });
    }

    const conditions = [
      // Скрываем незавершённые GIH-черновики, но оставляем остальные операции.
      {
        OR: [
          { type: { not: 'gih' } },
          { status: 'done' }
        ]
      }
    ];

    if (operation === 'check') {
      conditions.push({ type: { notIn: ['gih', 'emptied', 'vk_emptied'] } });
    } else if (operation === 'emptied') {
      conditions.push({ type: { in: ['emptied', 'vk_emptied'] } });
    } else if (operation === 'gih') {
      conditions.push({ type: 'gih' });
    }

    if (roomText) {
      conditions.push({
        room: {
          is: {
            number: parseInt(roomText, 10)
          }
        }
      });
    }

    const where = { AND: conditions };
    const [total, items] = await prisma.$transaction([
      prisma.check.count({ where }),
      prisma.check.findMany({
        where,
        include: {
          room: true,
          gihItems: { include: { product: true } }
        },
        orderBy: [
          { checkDate: 'desc' },
          { id: 'desc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      })
    ]);

    const pages = Math.ceil(total / pageSize);
    res.json({
      items,
      total,
      page: Math.min(page, Math.max(1, pages)),
      pageSize,
      pageCount: pages
    });
  } catch (error) {
    console.error('GET /api/checks/history error:', error);
    res.status(500).json({ error: error.message || 'Не удалось загрузить историю' });
  }
});

router.post('/', async (req, res) => {
  try {
    const b = req.body || {};
    const data = { roomId: parseInt(b.roomId, 10), type: b.type || 'gih', status: b.status || 'draft', gihRoomStatus: b.gihRoomStatus || null, notes: b.notes || null };
    const items = [];
    (b.gihItems || []).forEach(it => { const q = Math.max(0, parseInt(it.qty, 10) || 1); for (let k = 0; k < q; k++) items.push({ productId: parseInt(it.productId, 10), itemStatus: 'pending' }); });
    if (items.length) data.gihItems = { create: items };
    const check = await prisma.check.create({ data, include: { room: true, gihItems: { include: { product: true } } } });
    res.json(check);
  } catch (e) { res.status(500).json({ error: e.message }); }
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
        await tx.gihItem.deleteMany({ where: { checkId: id } });
        const create = [];
        gihItems.forEach(it => { const q = Math.max(0, parseInt(it.qty, 10) || 1); for (let k = 0; k < q; k++) create.push({ checkId: id, productId: parseInt(it.productId, 10), itemStatus: 'pending' }); });
        if (create.length) await tx.gihItem.createMany({ data: create });
      } else if (Array.isArray(pills)) {
        await Promise.all(pills.map(p => tx.gihItem.update({ where: { id: parseInt(p.id, 10) }, data: { itemStatus: p.itemStatus } })));
      }
      return tx.check.update({ where: { id }, data, include: { room: true, gihItems: { include: { product: true } } } });
    });
    res.json(check);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await prisma.check.delete({ where: { id: parseInt(req.params.id, 10) } }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
export default router;
