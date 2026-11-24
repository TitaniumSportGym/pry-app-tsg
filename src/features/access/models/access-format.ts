import { formatShortDate, formatTime, isSameDay } from '@/features/admin/models/admin-format';

/**
 * Fecha sin hora del backend (YYYY-MM-DD, p. ej. endsAt de la membresía).
 * Se arma con los componentes locales para que "2026-12-02" no se muestre como el día 1
 * en zonas horarias detrás de UTC.
 */
export function dateOnlyToLocal(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** 2 dic 2026 */
export function formatDateOnly(value: string) {
  return formatShortDate(dateOnlyToLocal(value));
}

/** "Hoy · 12:34 p.m.", "Ayer · 6:15 p.m." o "1 nov 2026 · 7:05 a.m." */
export function formatAccessMoment(date: Date, now: Date) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const day = isSameDay(date, now)
    ? 'Hoy'
    : isSameDay(date, yesterday)
      ? 'Ayer'
      : formatShortDate(date);
  return `${day} · ${formatTime(date)}`;
}

/** YYYY-MM-DD en UTC: los filtros del historial del backend usan días UTC. */
export function toUtcDateParam(date: Date) {
  return date.toISOString().slice(0, 10);
}
