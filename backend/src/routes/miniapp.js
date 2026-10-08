import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { clientOffset, startOfLocalDay } from '../lib/timezone.js';

const router = Router();
const COMPLETED_ACTIONS = new Set(['sent', 'empty']);

function todayFor(req) {
  return startOfLocalDay(new Date(), clientOffset(req));
}

async function ensureTodayTasks(date) {
  const rooms = await prisma.room.findMany({
    select: { id: true }
  });

  if (!rooms.length) return;

  await prisma.miniAppRoomTask.createMany({
    data: rooms.map(room => ({
      roomId: room.id,
      taskDate: date
    })),
    skipDuplicates: true
  });
}

router.get('/queue', async (req, res) => {
  try {
    const taskDate = todayFor(req);
    await ensureTodayTasks(taskDate);

    const tasks = await prisma.miniAppRoomTask.findMany({
      where: { taskDate },
      include: {
        room: {
          select: {
            id: true,
            number: true,
            floor: true,
            category: true
          }
        }
      },
      orderBy: { room: { number: 'asc' } }
    });

    const rooms = tasks.map(task => ({
      id: task.room.id,
      number: String(task.room.number),
      floor: task.room.floor,
      category: task.room.category,
      status: task.status,
      action: task.action,
      completedAt: task.completedAt
    }));

    const completed = rooms.filter(room => COMPLETED_ACTIONS.has(room.action)).length;

    res.set('Cache-Control', 'no-store');
    res.json({
      date: taskDate.toISOString().slice(0, 10),
      total: rooms.length,
      remaining: rooms.length - completed,
      completed,
      rooms
    });
  } catch (err) {
    console.error('GET miniapp queue error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/rooms/:id/complete', async (req, res) => {
  try {
    const roomId = Number.parseInt(req.params.id, 10);
    const action = String(req.body?.action || '').trim();

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return res.status(400).json({ error: 'Некорректный roomId' });
    }

    if (!COMPLETED_ACTIONS.has(action)) {
      return res.status(400).json({ error: 'action должен быть sent или empty' });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true }
    });

    if (!room) {
      return res.status(404).json({ error: 'Номер не найден' });
    }

    const taskDate = todayFor(req);

    await prisma.miniAppRoomTask.upsert({
      where: {
        roomId_taskDate: {
          roomId,
          taskDate
        }
      },
      update: {
        status: 'completed',
        action,
        completedAt: new Date()
      },
      create: {
        roomId,
        taskDate,
        status: 'completed',
        action,
        completedAt: new Date()
      }
    });

    res.json({ ok: true, roomId, action, date: taskDate.toISOString().slice(0, 10) });
  } catch (err) {
    console.error('POST miniapp complete error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
