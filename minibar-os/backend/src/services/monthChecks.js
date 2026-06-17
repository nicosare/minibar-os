/** MM.YY — год двумя цифрами (26 → 2026) */
import { getLocalParts } from '../lib/timezone.js';

export function fullYearFromShort(year2) {
  return 2000 + year2;
}

export function formatPeriod(month, year2) {
  return `${String(month).padStart(2, '0')}.${String(year2).padStart(2, '0')}`;
}

/** Парсит "11.26" или "1126" */
export function parsePeriod(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 4) return null;
  const month = parseInt(digits.slice(0, 2), 10);
  const year = parseInt(digits.slice(2, 4), 10);
  if (month < 1 || month > 12) return null;
  return { month, year, period: formatPeriod(month, year) };
}

/** Активна до начала месяца, следующего за указанным (11.26 → до 12.26) */
export function isAssignmentActive(month, year2, now = new Date(), offsetMinutes = null) {
  const fullYear = fullYearFromShort(year2);
  const expiryYear = month === 12 ? fullYear + 1 : fullYear;
  const expiryMonth = month === 12 ? 1 : month + 1;
  const { year: cy, month: cm } = getLocalParts(now, offsetMinutes);
  if (cy < expiryYear) return true;
  if (cy === expiryYear && cm < expiryMonth) return true;
  return false;
}

export function isCurrentCheckMonth(month, year2, now = new Date(), offsetMinutes = null) {
  const { month: cm, year: cy } = getLocalParts(now, offsetMinutes);
  return cm === month && cy === fullYearFromShort(year2);
}

/** Текущий или следующий календарный месяц (12.25 → 01.26) */
export function isCurrentOrNextCheckMonth(month, year2, now = new Date(), offsetMinutes = null) {
  if (isCurrentCheckMonth(month, year2, now, offsetMinutes)) return true;

  const { month: cm, year: cy } = getLocalParts(now, offsetMinutes);
  const nextMonth = cm === 12 ? 1 : cm + 1;
  const nextYear = cm === 12 ? cy + 1 : cy;

  return month === nextMonth && fullYearFromShort(year2) === nextYear;
}

export async function purgeExpiredMonthChecks(prisma, offsetMinutes = null) {
  const all = await prisma.productMonthCheck.findMany();
  const now = new Date();
  const expiredIds = all
    .filter(r => !isAssignmentActive(r.checkMonth, r.checkYear, now, offsetMinutes))
    .map(r => r.id);
  if (expiredIds.length > 0) {
    await prisma.productMonthCheck.deleteMany({ where: { id: { in: expiredIds } } });
  }
  return expiredIds.length;
}
