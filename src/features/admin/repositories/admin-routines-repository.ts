import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import * as adminRoutinesApi from '@/features/admin/api/admin-routines-api';
import type { AdminRoutine, AdminRoutineDecision } from '@/features/admin/models/admin-routine';
import { ADMIN_KEYS } from '@/features/admin/repositories/admin-repository';
import { TRAINER_KEYS } from '@/features/trainer/repositories/trainer-repository';
import { ROUTINE_KEYS } from '@/features/training/repositories/routines-repository';

export const ADMIN_ROUTINES_KEY = 'admin:routines';
const ROUTINES_TTL_MS = 30_000;

export interface AdminRoutinesDataSource {
  getAdminRoutines(): Promise<AdminRoutine[]>;
  decideAdminRoutine(routineId: string, decision: AdminRoutineDecision): Promise<void>;
}

/**
 * Rutinas en revisión. Cada decisión invalida la lista, los contadores del menú y las rutinas
 * del entrenador y de los socios (Observer), para que todos vean el nuevo estado.
 */
export function createAdminRoutinesRepository(
  dataSource: AdminRoutinesDataSource = adminRoutinesApi,
  cache: RepositoryCache = repositoryCache,
) {
  const getRoutines = (options: ReadOptions = {}) =>
    cache.read(ADMIN_ROUTINES_KEY, () => dataSource.getAdminRoutines(), { ...options, ttlMs: ROUTINES_TTL_MS });

  return {
    getRoutines,
    async getRoutine(routineId: string, options: ReadOptions = {}) {
      const routines = await getRoutines(options);
      return routines.find((routine) => routine.id === routineId) ?? null;
    },
    async decide(routineId: string, decision: AdminRoutineDecision) {
      await dataSource.decideAdminRoutine(routineId, decision);
      cache.invalidate(ADMIN_ROUTINES_KEY);
      cache.invalidate(ADMIN_KEYS.catalogCounts);
      cache.invalidate(TRAINER_KEYS.all);
      cache.invalidate(ROUTINE_KEYS.all);
    },
  };
}

export const adminRoutinesRepository = createAdminRoutinesRepository();
