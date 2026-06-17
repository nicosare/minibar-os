/** Смещение клиента: минуты UTC−local (как Date.getTimezoneOffset()) */
export function clientOffset(req) {
  const raw = req?.headers?.['x-timezone-offset'];
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

function fallbackTimeZone() {
  return process.env.APP_TIMEZONE || process.env.TZ || 'Europe/Moscow';
}

/** Календарная дата в локальной зоне клиента или APP_TIMEZONE */
export function getLocalParts(date = new Date(), offsetMinutes = null) {
  if (offsetMinutes != null) {
    const localMs = date.getTime() - offsetMinutes * 60 * 1000;
    const ld = new Date(localMs);
    return {
      year: ld.getUTCFullYear(),
      month: ld.getUTCMonth() + 1,
      day: ld.getUTCDate()
    };
  }

  const tz = fallbackTimeZone();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [year, month, day] = formatter.format(date).split('-').map(Number);
  return { year, month, day };
}

/** Date-only для Prisma @db.Date (полночь UTC календарного дня) */
export function dateFromParts({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day));
}

export function startOfLocalDay(date = new Date(), offsetMinutes = null) {
  const { year, month, day } = getLocalParts(date, offsetMinutes);
  return dateFromParts({ year, month, day });
}

export function endOfLocalMonth(date = new Date(), offsetMinutes = null) {
  const { year, month } = getLocalParts(date, offsetMinutes);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return dateFromParts({ year, month, day: lastDay });
}

export function addLocalDays(date, days, offsetMinutes = null) {
  const { year, month, day } = getLocalParts(date, offsetMinutes);
  return new Date(Date.UTC(year, month - 1, day + days));
}

export function daysLeftInclusive(fromDate, endDate) {
  return Math.max(1, Math.ceil((endDate - fromDate) / (1000 * 60 * 60 * 24)) + 1);
}
