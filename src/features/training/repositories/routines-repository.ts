import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import { getClientRoutine, getClientRoutines } from '@/features/training/api/training-api';
import type { ClientRoutine } from '@/features/training/models/client-routine';

/** Trainers publish routines occasionally; access also depends on the membership. */
const ROUTINES_TTL_MS = 5 * 60_000;

export const ROUTINE_KEYS = {
  all: 'routines',
  list: 'routines:list',
  detail: (routineId: string) => `routines:detail:${routineId}`,
} as const;

export interface RoutinesRepository {
  getRoutines(options?: ReadOptions): Promise<ClientRoutine[]>;
  getRoutine(routineId: string, options?: ReadOptions): Promise<ClientRoutine>;
  /** Call when the membership may have changed (e.g. after a purchase). */
  invalidate(): void;
}

export interface RoutinesDataSource {
  getClientRoutines(): Promise<ClientRoutine[]>;
  getClientRoutine(routineId: string): Promise<ClientRoutine>;
}

export function createRoutinesRepository(
  dataSource: RoutinesDataSource = { getClientRoutines, getClientRoutine },
  cache: RepositoryCache = repositoryCache,
): RoutinesRepository {
  return {
    getRoutines: (options = {}) =>
      cache.read(ROUTINE_KEYS.list, () => dataSource.getClientRoutines(), {
        ...options,
        ttlMs: ROUTINES_TTL_MS,
      }),
    getRoutine: (routineId, options = {}) => {
      // The list already carries every routine with its exercises: opening one
      // from the list needs no extra request.
      const fromList = options.force
        ? undefined
        : cache.peek<ClientRoutine[]>(ROUTINE_KEYS.list)?.find((item) => item.id === routineId);
      if (fromList) return Promise.resolve(fromList);

      return cache.read(ROUTINE_KEYS.detail(routineId), () => dataSource.getClientRoutine(routineId), {
        ...options,
        ttlMs: ROUTINES_TTL_MS,
      });
    },
    invalidate: () => cache.invalidate(ROUTINE_KEYS.all),
  };
}

export const routinesRepository = createRoutinesRepository();
