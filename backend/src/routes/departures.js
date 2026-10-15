import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { clientOffset, getLocalParts } from '../lib/timezone.js';

const router = Router();
const SESSION_KEY = 'departures-session-v1';
const VERIFIED_TYPES = ['vk_room', 'vk_emptied'];
const VALID_MARKS = new Set(['resident', 'arrival']);

function dateKeyFromParts(parts) {
  return String(parts.year).padStart(4, '0') + '-' +
    String(parts.month).padStart(2, '0') + '-' +
    String(parts.day).padStart(2, '0');
}

function localMidnightUtc(parts, offsetMinutes) {
  const targetLocalAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  if (offsetMinutes !== null && offsetMinutes !== undefined) {
    // Date.getTimezoneOffset() is UTC minus local time.
    return new Date(targetLocalAsUtc + offsetMinutes * 60 * 1000);
  }

  // Fallback for non-browser callers without X-Timezone-Offset.
  const timeZone = process.env.APP_TIMEZONE || process.env.TZ || 'Europe/Moscow';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });
  let guess = targetLocalAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const values = Object.fromEntries(
      formatter.formatToParts(new Date(guess))
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, Number(part.value)])
    );
    const displayedAsUtc = Date.UTC(
      values.year, values.month - 1, values.day,
      values.hour, values.minute, values.second
    );
    guess += targetLocalAsUtc - displayedAsUtc;
  }
  return new Date(guess);
}

function todayRange(req) {
  const now = new Date();
  const offset = clientOffset(req);
  const parts = getLocalParts(now, offset);
  const nextDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  const nextParts = {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate()
  };
  return {
    dateKey: dateKeyFromParts(parts),
    start: localMidnightUtc(parts, offset),
    end: localMidnightUtc(nextParts, offset)
  };
}


function blankSession(dateKey) {
  return { dateKey, fileName: '', pdfRooms: [], marks: {}, manualRooms: [] };
}

function parseSession(value, dateKey) {
  let parsed = null;
  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
  } catch (_) {
    parsed = null;
  }
  if (!parsed || parsed.dateKey !== dateKey) return blankSession(dateKey);

  const pdfRooms = Array.isArray(parsed.pdfRooms)
    ? [...new Set(parsed.pdfRooms.map(value => String(value).trim()).filter(value => /^\d{1,4}$/.test(value)))]
    : [];
  const marks = {};
  if (parsed.marks && typeof parsed.marks === 'object' && !Array.isArray(parsed.marks)) {
    for (const [number, mark] of Object.entries(parsed.marks)) {
      if (/^\d{1,4}$/.test(number) && VALID_MARKS.has(mark)) marks[number] = mark;
    }
  }
  const manualRooms = [];
  const manualSeen = new Set();
  if (Array.isArray(parsed.manualRooms)) {
    for (const item of parsed.manualRooms) {
      const rawNumber = String(item?.number ?? '').trim();
      if (!/^\d{1,4}$/.test(rawNumber)) continue;
      const number = String(Number(rawNumber));
      if (manualSeen.has(number)) continue;
      manualSeen.add(number);
      manualRooms.push({ number, emptied: item?.emptied === true });
    }
  }
  return {
    dateKey,
    fileName: String(parsed.fileName || '').slice(0, 240),
    pdfRooms,
    marks,
    manualRooms
  };
}


async function readSession(db, dateKey) {
  const row = await db.setting.findUnique({ where: { key: SESSION_KEY } });
  const session = parseSession(row?.value, dateKey);
  const storedValue = JSON.stringify(session);
  if (!row || row.value !== storedValue) {
    await db.setting.upsert({
      where: { key: SESSION_KEY },
      create: { key: SESSION_KEY, value: storedValue },
      update: { value: storedValue }
    });
  }
  return session;
}

async function updateSession(req, updater) {
  const { dateKey } = todayRange(req);
  return prisma.$transaction(async tx => {
    const current = await readSession(tx, dateKey);
    const next = updater(current);
    const normalized = parseSession(next, dateKey);
    await tx.setting.upsert({
      where: { key: SESSION_KEY },
      create: { key: SESSION_KEY, value: JSON.stringify(normalized) },
      update: { value: JSON.stringify(normalized) }
    });
    return normalized;
  });
}

router.get('/', async (req, res) => {
  try {
    const range = todayRange(req);
    const [rooms, checks, session] = await Promise.all([
      prisma.room.findMany({
        select: {
          id: true,
          number: true,
          floor: true,
          category: true,
          expiryStatus: true
        },
        orderBy: { number: 'asc' }
      }),
      prisma.check.findMany({
        where: {
          checkDate: { gte: range.start, lt: range.end },
          type: { in: VERIFIED_TYPES },
          status: 'done',
          roomId: { not: null }
        },
        select: {
          checkDate: true,
          room: { select: { number: true } }
        },
        orderBy: [{ checkDate: 'desc' }, { id: 'desc' }]
      }),
      readSession(prisma, range.dateKey)
    ]);

    const roomByNumber = new Map(rooms.map(room => [String(room.number), room]));
    const seen = new Set();
    const checkedToday = [];
    for (const check of checks) {
      if (!check.room) continue;
      const number = String(check.room.number);
      if (seen.has(number)) continue;
      seen.add(number);
      const room = roomByNumber.get(number);
      checkedToday.push({
        number,
        checkedAt: check.checkDate,
        emptied: room?.expiryStatus === 'empty'
      });
    }

    res.set('Cache-Control', 'no-store');
    res.json({ dateKey: range.dateKey, rooms, checkedToday, session });
  } catch (error) {
    console.error('GET /api/departures error:', error);
    res.status(500).json({ error: error.message || 'Не удалось загрузить данные Выездов' });
  }
});

router.post('/session/reset-pdf', async (req, res) => {
  try {
    const session = await updateSession(req, current => ({
      ...current,
      fileName: '',
      pdfRooms: []
      // Keep manual marks so reloading today's PDF restores them.
    }));
    res.json({ ok: true, session });
  } catch (error) {
    console.error('POST /api/departures/session/reset-pdf error:', error);
    res.status(500).json({ error: error.message || 'Не удалось сбросить список PDF' });
  }
});

router.post('/session/pdf', async (req, res) => {
  try {
    const fileName = String(req.body?.fileName || '').trim().slice(0, 240);
    const requestedRooms = Array.isArray(req.body?.rooms) ? req.body.rooms : [];
    if (!fileName || requestedRooms.length === 0 || requestedRooms.length > 2000) {
      return res.status(400).json({ error: 'Укажите имя PDF-файла и найденные номера комнат' });
    }

    const rooms = await prisma.room.findMany({ select: { number: true } });
    const validRooms = new Set(rooms.map(room => String(room.number)));
    const numbers = [...new Set(requestedRooms.map(value => String(value).trim())
      .filter(value => /^\d{1,4}$/.test(value) && validRooms.has(String(Number(value)))))];

    if (!numbers.length) {
      return res.status(400).json({ error: 'В PDF не найдено номеров, существующих в системе' });
    }

    const session = await updateSession(req, current => ({
      ...current,
      fileName,
      pdfRooms: numbers
      // marks are intentionally retained when the same-day PDF is replaced.
    }));
    res.json({ ok: true, session });
  } catch (error) {
    console.error('POST /api/departures/session/pdf error:', error);
    res.status(500).json({ error: error.message || 'Не удалось сохранить список из PDF' });
  }
});

router.patch('/session/mark', async (req, res) => {
  try {
    const number = String(req.body?.number ?? '').trim();
    const mark = req.body?.mark === null || req.body?.mark === '' ? null : req.body?.mark;
    if (!/^\d{1,4}$/.test(number) || (mark !== null && !VALID_MARKS.has(mark))) {
      return res.status(400).json({ error: 'Некорректная отметка номера' });
    }

    const session = await updateSession(req, current => {
      if (!current.pdfRooms.includes(String(Number(number)))) {
        const error = new Error('Номер отсутствует в текущем списке PDF');
        error.statusCode = 409;
        throw error;
      }
      const marks = { ...current.marks };
      if (mark === null) delete marks[String(Number(number))];
      else marks[String(Number(number))] = mark;
      return { ...current, marks };
    });
    res.json({ ok: true, session });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error('PATCH /api/departures/session/mark error:', error);
    res.status(status).json({ error: error.message || 'Не удалось сохранить отметку номера' });
  }
});


router.post('/session/manual-room', async (req, res) => {
  try {
    const rawNumber = String(req.body?.number ?? '').trim();
    if (!/^\d{1,4}$/.test(rawNumber)) {
      return res.status(400).json({ error: 'Введите корректный номер комнаты' });
    }
    const number = String(Number(rawNumber));
    const emptied = req.body?.emptied === true;
    const rooms = await prisma.room.findMany({ select: { id: true, number: true } });
    const room = rooms.find(item => String(item.number) === number);
    if (!room) {
      return res.status(404).json({ error: 'Номер ' + number + ' не найден в системе' });
    }

    const range = todayRange(req);
    const alreadyChecked = await prisma.check.findFirst({
      where: {
        checkDate: { gte: range.start, lt: range.end },
        type: { in: VERIFIED_TYPES },
        status: 'done',
        roomId: room.id
      },
      select: { id: true }
    });
    if (alreadyChecked && !emptied) {
      return res.status(409).json({
        error: 'Номер ' + number + ' уже проверяли сегодня. Включите «Опустошить», чтобы добавить его несмотря на проверку.'
      });
    }

    const session = await updateSession(req, current => {
      const manualRooms = current.manualRooms.filter(item => item.number !== number);
      manualRooms.push({ number, emptied });
      return { ...current, manualRooms };
    });
    res.json({ ok: true, session });
  } catch (error) {
    console.error('POST /api/departures/session/manual-room error:', error);
    res.status(500).json({ error: error.message || 'Не удалось добавить ручной номер' });
  }
});

router.delete('/session/manual-room/:number', async (req, res) => {
  try {
    const rawNumber = String(req.params.number ?? '').trim();
    if (!/^\d{1,4}$/.test(rawNumber)) {
      return res.status(400).json({ error: 'Некорректный номер комнаты' });
    }
    const number = String(Number(rawNumber));
    const session = await updateSession(req, current => ({
      ...current,
      manualRooms: current.manualRooms.filter(item => item.number !== number)
    }));
    res.json({ ok: true, session });
  } catch (error) {
    console.error('DELETE /api/departures/session/manual-room error:', error);
    res.status(500).json({ error: error.message || 'Не удалось убрать ручной номер' });
  }
});

router.post('/print', async (req, res) => {
  try {
    const count = Number(req.body?.count);
    if (!Number.isInteger(count) || count < 0 || count > 2000) {
      return res.status(400).json({ error: 'Некорректное количество номеров для печати' });
    }
    const record = await prisma.check.create({
      data: {
        type: 'departures_print',
        status: 'done',
        checkDate: new Date(),
        notes: 'Количество номеров в итоговом списке: ' + count
      }
    });
    res.status(201).json({ ok: true, id: record.id, checkDate: record.checkDate });
  } catch (error) {
    console.error('POST /api/departures/print error:', error);
    res.status(500).json({ error: error.message || 'Не удалось записать печать Departures в историю' });
  }
});

export default router;
