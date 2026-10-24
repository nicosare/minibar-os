import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { clientOffset, getLocalParts } from '../lib/timezone.js';

const router = Router();
const SESSION_KEY = 'arrivals-session-v1';
const NUMBER_PATTERN = /^\d{1,4}$/;
const ENTRY_FIELDS = new Set(['vip', 'empty', 'time', 'comment', 'ready']);

function dateKeyFromParts(parts) {
  return String(parts.year).padStart(4, '0') + '-' +
    String(parts.month).padStart(2, '0') + '-' +
    String(parts.day).padStart(2, '0');
}

function localMidnightUtc(parts, offsetMinutes) {
  const targetLocalAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
  if (offsetMinutes !== null && offsetMinutes !== undefined) {
    return new Date(targetLocalAsUtc + offsetMinutes * 60 * 1000);
  }
  const timeZone = process.env.APP_TIMEZONE || process.env.TZ || 'Europe/Moscow';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  let guess = targetLocalAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const values = Object.fromEntries(formatter.formatToParts(new Date(guess))
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)]));
    const displayedAsUtc = Date.UTC(values.year, values.month - 1, values.day,
      values.hour, values.minute, values.second);
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

function blankEntry() {
  return { vip: false, empty: false, time: '', comment: '', ready: false };
}

function normalizeEntry(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const time = String(source.time || '').trim();
  const comment = String(source.comment || '').trim();
  return {
    vip: source.vip === true,
    empty: source.empty === true,
    time: /^\d{2}:\d{2}$/.test(time) ? time : '',
    comment: comment.slice(0, 500),
    ready: source.ready === true
  };
}

function blankSession(dateKey) {
  return { dateKey, fileName: '', pdfRooms: [], entries: {} };
}

function parseSession(value, dateKey) {
  let parsed = null;
  try { parsed = typeof value === 'string' ? JSON.parse(value) : value; } catch (_) { parsed = null; }
  if (!parsed || parsed.dateKey !== dateKey) return blankSession(dateKey);

  const pdfRooms = Array.isArray(parsed.pdfRooms)
    ? [...new Set(parsed.pdfRooms.map(value => String(value).trim())
      .filter(value => NUMBER_PATTERN.test(value)).map(value => String(Number(value)))]
    : [];
  const entries = {};
  if (parsed.entries && typeof parsed.entries === 'object' && !Array.isArray(parsed.entries)) {
    for (const [rawNumber, value] of Object.entries(parsed.entries)) {
      if (NUMBER_PATTERN.test(rawNumber)) entries[String(Number(rawNumber))] = normalizeEntry(value);
    }
  }
  pdfRooms.forEach(number => { if (!entries[number]) entries[number] = blankEntry(); });
  return {
    dateKey,
    fileName: String(parsed.fileName || '').slice(0, 240),
    pdfRooms,
    entries
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

function knownNumbers(rooms) {
  return new Set(rooms.map(room => String(room.number)));
}

function parseRequestedNumbers(body) {
  if (Array.isArray(body?.numbers)) {
    return body.numbers.map(value => String(value).trim()).filter(value => NUMBER_PATTERN.test(value));
  }
  const raw = String(body?.text ?? body?.numbers ?? '');
  return raw.split(/[^\d]+/).filter(value => NUMBER_PATTERN.test(value));
}

function sanitizeTime(value) {
  const time = String(value ?? '').trim();
  if (!time) return '';
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const [hour, minute] = time.split(':').map(Number);
  return hour <= 23 && minute <= 59 ? time : null;
}

async function getMiniAppArrivalList(req) {
  const { dateKey } = todayRange(req);
  const [rooms, session] = await Promise.all([
    prisma.room.findMany({ select: { number: true, floor: true, category: true }, orderBy: { number: 'asc' } }),
    readSession(prisma, dateKey)
  ]);
  const known = knownNumbers(rooms);
  const roomNumbers = session.pdfRooms.filter(number => known.has(number));
  const readyNumbers = roomNumbers.filter(number => session.entries[number]?.ready === true);
  const entries = Object.fromEntries(roomNumbers.map(number => [number, normalizeEntry(session.entries[number])]));
  return {
    dateKey,
    name: 'Заезды',
    fileName: session.fileName,
    sourceReady: Boolean(session.fileName && roomNumbers.length),
    sourceCount: roomNumbers.length,
    assignedCount: roomNumbers.length,
    readyCount: readyNumbers.length,
    remainingCount: Math.max(0, roomNumbers.length - readyNumbers.length),
    roomNumbers,
    readyNumbers,
    entries
  };
}

router.get('/', async (req, res) => {
  try {
    const { dateKey } = todayRange(req);
    const [rooms, session] = await Promise.all([
      prisma.room.findMany({
        select: { id: true, number: true, floor: true, category: true },
        orderBy: { number: 'asc' }
      }),
      readSession(prisma, dateKey)
    ]);
    res.set('Cache-Control', 'no-store');
    res.json({ dateKey, rooms, session });
  } catch (error) {
    console.error('GET /api/arrivals error:', error);
    res.status(500).json({ error: error.message || 'Не удалось загрузить данные Заездов' });
  }
});

router.post('/session/reset-pdf', async (req, res) => {
  try {
    const session = await updateSession(req, current => ({
      ...current, fileName: '', pdfRooms: [], entries: {}
    }));
    res.json({ ok: true, session });
  } catch (error) {
    console.error('POST /api/arrivals/session/reset-pdf error:', error);
    res.status(500).json({ error: error.message || 'Не удалось сбросить список Заездов' });
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
    const known = knownNumbers(rooms);
    const numbers = [...new Set(requestedRooms.map(value => String(value).trim())
      .filter(value => NUMBER_PATTERN.test(value)).map(value => String(Number(value)))
      .filter(number => known.has(number)))];
    if (!numbers.length) {
      return res.status(400).json({ error: 'В PDF не найдено номеров, существующих в системе' });
    }
    const session = await updateSession(req, current => {
      const entries = { ...current.entries };
      numbers.forEach(number => { if (!entries[number]) entries[number] = blankEntry(); });
      return { ...current, fileName, pdfRooms: numbers, entries };
    });
    res.json({ ok: true, session });
  } catch (error) {
    console.error('POST /api/arrivals/session/pdf error:', error);
    res.status(500).json({ error: error.message || 'Не удалось сохранить список из PDF' });
  }
});

router.post('/session/rooms', async (req, res) => {
  try {
    const requested = [...new Set(parseRequestedNumbers(req.body).map(value => String(Number(value))))];
    if (!requested.length) return res.status(400).json({ error: 'Введите один или несколько номеров комнат' });
    const rooms = await prisma.room.findMany({ select: { number: true } });
    const known = knownNumbers(rooms);
    const valid = requested.filter(number => known.has(number));
    const unknown = requested.filter(number => !known.has(number));
    if (!valid.length) return res.status(400).json({ error: 'Ни один из указанных номеров не найден в системе' });
    const session = await updateSession(req, current => {
      const pdfRooms = [...current.pdfRooms];
      const entries = { ...current.entries };
      valid.forEach(number => {
        if (!pdfRooms.includes(number)) pdfRooms.push(number);
        if (!entries[number]) entries[number] = blankEntry();
      });
      return { ...current, pdfRooms, entries };
    });
    res.json({ ok: true, session, added: valid.length, unknown });
  } catch (error) {
    console.error('POST /api/arrivals/session/rooms error:', error);
    res.status(500).json({ error: error.message || 'Не удалось добавить номера' });
  }
});

router.patch('/session/room', async (req, res) => {
  try {
    const rawNumber = String(req.body?.number ?? '').trim();
    const number = String(Number(rawNumber));
    const field = String(req.body?.field || '').trim();
    if (!NUMBER_PATTERN.test(rawNumber) || !ENTRY_FIELDS.has(field)) {
      return res.status(400).json({ error: 'Некорректный номер или поле' });
    }

    let value = req.body?.value;
    if (field === 'vip' || field === 'empty' || field === 'ready') {
      if (typeof value !== 'boolean') return res.status(400).json({ error: 'Для флажка требуется true или false' });
    } else if (field === 'time') {
      value = sanitizeTime(value);
      if (value === null) return res.status(400).json({ error: 'Введите время в формате ЧЧ:ММ' });
    } else {
      value = String(value ?? '').trim().slice(0, 500);
    }

    const session = await updateSession(req, current => {
      if (!current.pdfRooms.includes(number)) {
        const error = new Error('Номер не входит в текущий список Заездов');
        error.statusCode = 409;
        throw error;
      }
      const entries = { ...current.entries };
      entries[number] = { ...blankEntry(), ...normalizeEntry(entries[number]), [field]: value };
      return { ...current, entries };
    });
    res.json({ ok: true, session });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error('PATCH /api/arrivals/session/room error:', error);
    res.status(status).json({ error: error.message || 'Не удалось сохранить данные номера' });
  }
});

router.delete('/session/room', async (req, res) => {
  try {
    const rawNumber = String(req.body?.number ?? '').trim();
    const number = String(Number(rawNumber));
    if (!NUMBER_PATTERN.test(rawNumber)) return res.status(400).json({ error: 'Некорректный номер' });
    const session = await updateSession(req, current => {
      const entries = { ...current.entries };
      delete entries[number];
      return { ...current, pdfRooms: current.pdfRooms.filter(item => item !== number), entries };
    });
    res.json({ ok: true, session });
  } catch (error) {
    console.error('DELETE /api/arrivals/session/room error:', error);
    res.status(500).json({ error: error.message || 'Не удалось удалить номер из Заездов' });
  }
});

router.get('/miniapp-list', async (req, res) => {
  try {
    const list = await getMiniAppArrivalList(req);
    res.set('Cache-Control', 'no-store');
    res.json(list);
  } catch (error) {
    console.error('GET /api/arrivals/miniapp-list error:', error);
    res.status(500).json({ error: error.message || 'Не удалось загрузить список Заезды для Mini App' });
  }
});

router.patch('/miniapp-list/room', async (req, res) => {
  try {
    const rawNumber = String(req.body?.number ?? '').trim();
    const number = String(Number(rawNumber));
    const field = String(req.body?.field || '').trim();
    if (!NUMBER_PATTERN.test(rawNumber) || !ENTRY_FIELDS.has(field)) {
      return res.status(400).json({ error: 'Некорректный номер или поле' });
    }
    let value = req.body?.value;
    if (field === 'vip' || field === 'empty' || field === 'ready') {
      if (typeof value !== 'boolean') return res.status(400).json({ error: 'Для флажка требуется true или false' });
    } else if (field === 'time') {
      value = sanitizeTime(value);
      if (value === null) return res.status(400).json({ error: 'Введите время в формате ЧЧ:ММ' });
    } else {
      value = String(value ?? '').trim().slice(0, 500);
    }

    const { dateKey } = todayRange(req);
    const current = await readSession(prisma, dateKey);
    if (!current.pdfRooms.includes(number)) {
      return res.status(409).json({ error: 'Номер больше не входит в активный список Заезды' });
    }
    const session = await updateSession(req, currentSession => {
      const entries = { ...currentSession.entries };
      entries[number] = { ...blankEntry(), ...normalizeEntry(entries[number]), [field]: value };
      return { ...currentSession, entries };
    });
    const list = await getMiniAppArrivalList(req);
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, list, session });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error('PATCH /api/arrivals/miniapp-list/room error:', error);
    res.status(status).json({ error: error.message || 'Не удалось обновить список Заезды' });
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
        type: 'arrivals_print',
        status: 'done',
        checkDate: new Date(),
        notes: 'Количество номеров в итоговом списке: ' + count
      }
    });
    res.status(201).json({ ok: true, id: record.id, checkDate: record.checkDate });
  } catch (error) {
    console.error('POST /api/arrivals/print error:', error);
    res.status(500).json({ error: error.message || 'Не удалось записать печать Заездов в историю' });
  }
});

export default router;
