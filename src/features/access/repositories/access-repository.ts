import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import {
  getAdminAccessHistory,
  getMyAccessHistory,
  type AccessHistoryQuery,
} from '@/features/access/api/access-api';
import { toUtcDateParam } from '@/features/access/models/access-format';
import type { AccessHistoryPage } from '@/features/access/models/access-history';

/** Corto: recepción registra entradas todo el día. Los pases QR nunca pasan por la caché. */
const HISTORY_TTL_MS = 30_000;
/** Para contar las entradas del día se leen como máximo 5 páginas de 100. */
const TODAY_PAGE_SIZE = 100;
const TODAY_MAX_PAGES = 5;

export const ACCESS_KEYS = {
  all: 'access',
  mine: 'access:me',
  admin: 'access:admin',
} as const;

export interface TodayAccessSummary {
  count: number;
  lastAt: Date | null;
  /** True si había más entradas de las que se leyeron (el número es "al menos"). */
  capped: boolean;
}

export interface AccessRepository {
  getMyHistory(page: number, options?: ReadOptions): Promise<AccessHistoryPage>;
  getAdminHistory(page: number, options?: ReadOptions): Promise<AccessHistoryPage>;
  getTodaySummary(options?: ReadOptions): Promise<TodayAccessSummary>;
  /** Después de registrar una entrada: el historial y el resumen se vuelven a pedir. */
  invalidate(): void;
}

export interface AccessDataSource {
  getMyAccessHistory(query: AccessHistoryQuery): Promise<AccessHistoryPage>;
  getAdminAccessHistory(query: AccessHistoryQuery): Promise<AccessHistoryPage>;
}

const DEFAULT_DATA_SOURCE: AccessDataSource = { getMyAccessHistory, getAdminAccessHistory };

/**
 * Los filtros del backend usan días UTC; el "hoy" del gimnasio es el día local.
 * Se piden los días UTC que cubren el día local y se filtra por la hora local.
 */
async function loadTodaySummary(dataSource: AccessDataSource, now: Date) {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const query = { from: toUtcDateParam(startOfDay), to: toUtcDateParam(now), limit: TODAY_PAGE_SIZE };
  let count = 0;
  let lastAt: Date | null = null;
  let page = 1;
  let totalPages = 1;

  for (; page <= Math.min(totalPages, TODAY_MAX_PAGES); page += 1) {
    const result = await dataSource.getAdminAccessHistory({ ...query, page });
    totalPages = result.totalPages;
    for (const entry of result.entries) {
      if (!entry.granted || entry.scannedAt < startOfDay) continue;
      count += 1;
      if (!lastAt || entry.scannedAt > lastAt) lastAt = entry.scannedAt;
    }
  }

  return { count, lastAt, capped: totalPages > TODAY_MAX_PAGES };
}

export function createAccessRepository(
  dataSource: AccessDataSource = DEFAULT_DATA_SOURCE,
  cache: RepositoryCache = repositoryCache,
  now: () => Date = () => new Date(),
): AccessRepository {
  return {
    getMyHistory: (page, options = {}) =>
      cache.read(`${ACCESS_KEYS.mine}:${page}`, () => dataSource.getMyAccessHistory({ page }), {
        ...options,
        ttlMs: HISTORY_TTL_MS,
      }),
    getAdminHistory: (page, options = {}) =>
      cache.read(`${ACCESS_KEYS.admin}:page:${page}`, () => dataSource.getAdminAccessHistory({ page }), {
        ...options,
        ttlMs: HISTORY_TTL_MS,
      }),
    getTodaySummary: (options = {}) =>
      cache.read(`${ACCESS_KEYS.admin}:today`, () => loadTodaySummary(dataSource, now()), {
        ...options,
        ttlMs: HISTORY_TTL_MS,
      }),
    invalidate: () => cache.invalidate(ACCESS_KEYS.all),
  };
}

export const accessRepository = createAccessRepository();
