const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

/** $1,378.00 */
export function formatMoney(amount: number) {
  return currency.format(amount);
}

/** $3,420 (para cifras grandes del tablero, sin centavos). */
export function formatMoneyShort(amount: number) {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

/** 12 oct 2026 */
export function formatShortDate(date: Date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Hoy · martes 3 nov 2026 */
export function formatTodayLabel(date: Date) {
  return `Hoy · ${WEEKDAYS[date.getDay()]} ${formatShortDate(date)}`;
}

/** 12:34 p.m. */
export function formatTime(date: Date) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours < 12 ? 'a.m.' : 'p.m.';
  return `${hours % 12 || 12}:${minutes} ${suffix}`;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** "Pagado hoy · 12:12 p.m.", "Pagado ayer · 6:15 p.m." o "Pagado 1 nov 2026 · 9:00 a.m.". */
export function formatRelativeDateTime(date: Date, now: Date) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const day = isSameDay(date, now)
    ? 'hoy'
    : isSameDay(date, yesterday)
      ? 'ayer'
      : formatShortDate(date);
  return `${day} · ${formatTime(date)}`;
}

export function parseDate(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseAmount(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

/** Dos letras para el avatar a partir de un nombre o correo. */
export function getAvatarInitials(nameOrEmail: string) {
  const base = nameOrEmail.split('@')[0] ?? '';
  const words = base
    .split(/[\s._-]+/)
    .map((word) => word.replace(/[^a-zA-ZÀ-ÿ]/g, ''))
    .filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] ?? '').slice(0, 2).toUpperCase() || '?';
}
