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
