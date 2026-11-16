import { router } from 'expo-router';
import { useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import {
  matchesRoutine,
  ROUTINE_FILTERS,
  summarizeRoutines,
  toRoutineCardItem,
  type RoutineFilter,
} from '@/features/trainer/models/trainer-routine-presentation';
import { TRAINER_KEYS, trainerRepository } from '@/features/trainer/repositories/trainer-repository';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const SKELETON_DELAY_MS = 300;

/** Pantallas 77–79 · Entrenador — Mis rutinas. */
export function useTrainerRoutinesViewModel() {
  const resource = useAuthorizedResource(trainerRepository.getRoutines, { reloadOn: [TRAINER_KEYS.all] });
  const [filter, setFilter] = useState<RoutineFilter>('all');
  const [query, setQuery] = useState('');
  const routines = resource.data ?? [];
  const now = new Date();

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    isEmpty: !resource.isLoading && !resource.error && routines.length === 0,
    errorMessage: resource.error ? getAccessErrorMessage(resource.error, 'No encontramos tus rutinas.') : null,
    subtitle: routines.length ? summarizeRoutines(routines) : 'Crea y comparte tus rutinas',
    filters: ROUTINE_FILTERS,
    selectedFilter: filter,
    query,
    items: routines.filter((routine) => matchesRoutine(routine, filter, query)).map((routine) => toRoutineCardItem(routine, now)),
    selectFilter: setFilter,
    setQuery,
    retry: resource.retry,
    refresh: resource.refresh,
    open(routineId: string) {
      router.push({ pathname: '/trainer/routines/[id]', params: { id: routineId } });
    },
    create() {
      router.push('/trainer/routines/editor');
    },
  };
}
