import { router } from 'expo-router';
import { useState } from 'react';

import {
  ADMIN_ROUTINE_FILTERS,
  countAdminRoutines,
  type AdminRoutineFilter,
} from '@/features/admin/models/admin-routine';
import { ADMIN_ROUTINES_KEY, adminRoutinesRepository } from '@/features/admin/repositories/admin-routines-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { toRoutineCardItem } from '@/features/trainer/models/trainer-routine-presentation';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const ACTION_BY_FILTER: Record<AdminRoutineFilter, string> = {
  pending_review: 'Revisar',
  published: 'Ver rutina',
  rejected: 'Ver rutina',
  archived: 'Ver rutina',
};

/** Pantalla 90 · Admin — Rutinas de los entrenadores, por estado. */
export function useAdminRoutinesViewModel() {
  const resource = useAuthorizedResource(adminRoutinesRepository.getRoutines, { reloadOn: [ADMIN_ROUTINES_KEY] });
  const [filter, setFilter] = useState<AdminRoutineFilter>('pending_review');
  const routines = resource.data ?? [];
  const counts = countAdminRoutines(routines);
  const now = new Date();
  const visible = routines.filter((routine) => routine.status === filter);

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, 300),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error ? getAccessErrorMessage(resource.error, 'No pudimos cargar las rutinas.') : null,
    subtitle: counts.pending_review
      ? `${counts.pending_review} ${counts.pending_review === 1 ? 'rutina espera' : 'rutinas esperan'} tu revisión`
      : 'Nada pendiente por revisar',
    filters: ADMIN_ROUTINE_FILTERS.map((option) => ({ ...option, label: `${option.label} · ${counts[option.value]}` })),
    selectedFilter: filter,
    selectFilter: setFilter,
    isEmpty: !resource.isLoading && !resource.error && visible.length === 0,
    emptyCopy:
      filter === 'pending_review'
        ? { title: 'TODO AL DÍA', description: 'No hay rutinas esperando revisión. Cuando un entrenador envíe una, aparecerá aquí.' }
        : { title: 'SIN RUTINAS', description: 'No hay rutinas con este estado.' },
    items: visible.map((routine) => ({
      ...toRoutineCardItem(routine, now),
      meta: routine.trainerName,
      action: ACTION_BY_FILTER[filter],
    })),
    retry: resource.retry,
    refresh: resource.refresh,
    open(routineId: string) {
      router.push({ pathname: '/admin/routines/[id]', params: { id: routineId } });
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/admin/account');
    },
  };
}
