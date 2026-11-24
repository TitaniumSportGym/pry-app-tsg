import { parseDate } from '@/features/admin/models/admin-format';

/** Respuesta de POST /api/access/scan cuando el servidor concede la entrada. */
export interface GrantedAccess {
  id: string;
  userId: string;
  scannedAt: Date;
  subscriptionStatus: string;
}

/** Un registro de GET /api/access/me/history o /api/access/admin/history. */
export interface AccessHistoryEntry {
  id: string;
  userId: string;
  scannedAt: Date;
  granted: boolean;
}

export interface AccessHistoryPage {
  entries: AccessHistoryEntry[];
  page: number;
  totalPages: number;
  total: number;
}

/** El backend acepta hasta 100 registros por página. */
export const ACCESS_HISTORY_PAGE_SIZE = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toCount(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : fallback;
}

/**
 * Solo una respuesta con accessGranted === true confirma la entrada; cualquier otra
 * forma se trata como no confirmada.
 */
export function parseGrantedAccess(raw: unknown): GrantedAccess | null {
  if (!isRecord(raw) || raw.accessGranted !== true || !isRecord(raw.access)) return null;

  const { access } = raw;
  const scannedAt = parseDate(access.scannedAt);
  if (typeof access.id !== 'string' || typeof access.userId !== 'string' || !scannedAt) {
    return null;
  }

  return {
    id: access.id,
    userId: access.userId,
    scannedAt,
    subscriptionStatus:
      typeof access.subscriptionStatus === 'string' ? access.subscriptionStatus : 'active',
  };
}

export function parseAccessHistory(raw: unknown): AccessHistoryPage {
  const record = isRecord(raw) ? raw : {};
  const entries = Array.isArray(record.history)
    ? record.history.flatMap((item): AccessHistoryEntry[] => {
        if (!isRecord(item) || typeof item.id !== 'string' || typeof item.userId !== 'string') {
          return [];
        }
        const scannedAt = parseDate(item.scannedAt);
        return scannedAt
          ? [{ id: item.id, userId: item.userId, scannedAt, granted: item.result === 'granted' }]
          : [];
      })
    : [];
  const pagination = isRecord(record.pagination) ? record.pagination : {};

  return {
    entries,
    page: Math.max(1, toCount(pagination.page, 1)),
    totalPages: toCount(pagination.totalPages, entries.length > 0 ? 1 : 0),
    total: toCount(pagination.total, entries.length),
  };
}
