import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { upsertTodayRoomStats, updateAllTargets } from '../services/deadlines.js';
import { clientOffset, startOfLocalDay } from '../lib/timezone.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { floor, category, status } = req.query;
    const where = {};
    if (floor) where.floor = parseInt(floor, 10);
    if (category) where.category = category;
    if (status) where.expiryStatus = status;

    const rooms = await prisma.room.findMany({
      where,
      include: { template: { include: { items: { include: { product: true } } } } },
      orderBy: { number: 'asc' }
    });
    res.json(rooms);
  } catch (err) {
    console.error('GET rooms error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-all-deadlines', async (req, res) => {
  try {
    const offset = clientOffset(req);
    await prisma.$transaction(async (tx) => {
      await tx.roomProductStatus.deleteMany({});
      await tx.room.updateMany({ data: { expiryStatus: 'neutral' } });
      
      const today = startOfLocalDay(new Date(), offset);
      const totalRooms = await tx.room.count();

      await tx.deadlineDailyStat.upsert({
        where: { date: today },
        update: {
          validCount: 0,
          emptyCount: 0,
          needsReplacementCount: 0,
          neutralCount: totalRooms
        },
        create: {
          date: today,
          validCount: 0,
          emptyCount: 0,
          needsReplacementCount: 0,
          neutralCount: totalRooms
        }
      });
      
      // ПЕРЕСОЗДАЁМ цель на сегодня: после сброса все neutral = все плохие
      // startBadCount = totalRooms, и при обработке номера processed будет расти правильно
      await tx.deadlineTarget.deleteMany({ where: { date: today } });
      
      // updateAllTargets создаст новую запись с правильным startBadCount = badCount (= totalRooms)
      await updateAllTargets(tx, offset);
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Reset all deadlines error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: {
        template: { include: { items: { include: { product: true } } } },
        customs: { include: { product: true } },
        replacementItems: { include: { product: true } }
      }
    });
    if (!room) return res.status(404).json({ error: 'Not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const room = await prisma.room.update({
      where: { id: parseInt(req.params.id, 10) },
      data: req.body
    });
    res.json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/product-statuses', async (req, res) => {
  try {
    const statuses = await prisma.roomProductStatus.findMany({
      where: { roomId: parseInt(req.params.id, 10) },
      include: { product: true }
    });
    res.json(statuses);
  } catch (err) {
    console.error('GET product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/product-statuses', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const roomId = parseInt(req.params.id, 10);
    const { items, roomStatus } = req.body;

    await prisma.$transaction(async (tx) => {
      await tx.roomProductStatus.deleteMany({ where: { roomId } });

      if (items?.length > 0) {
        const toCreate = items
          .filter(i => (i.qtyToReplace && i.qtyToReplace > 0) || i.expiryStatus === 'needs_replacement')
          .map(i => ({
            roomId,
            productId: parseInt(i.productId, 10),
            expiryStatus: i.expiryStatus || 'needs_replacement',
            qtyToReplace: parseInt(i.qtyToReplace, 10) || 0,
            checkedAt: new Date()
          }));

        if (toCreate.length > 0) {
          await tx.roomProductStatus.createMany({ data: toCreate });
        }
      }

      if (roomStatus) {
        await tx.room.update({
          where: { id: roomId },
          data: { expiryStatus: roomStatus }
        });
      }

      await upsertTodayRoomStats(tx, offset);
      await updateAllTargets(tx, offset);
    });

    const updated = await prisma.roomProductStatus.findMany({
      where: { roomId },
      include: { product: true }
    });
    res.json({ ok: true, statuses: updated });
  } catch (err) {
    console.error('PUT product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/product-statuses', async (req, res) => {
  try {
    const offset = clientOffset(req);
    const roomId = parseInt(req.params.id, 10);
    const { roomStatus } = req.body || {};

    await prisma.$transaction(async (tx) => {
      await tx.roomProductStatus.deleteMany({ where: { roomId } });
      if (roomStatus) {
        await tx.room.update({
          where: { id: roomId },
          data: { expiryStatus: roomStatus }
        });
      }
      await upsertTodayRoomStats(tx, offset);
      await updateAllTargets(tx, offset);
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE product-statuses error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
