import { router } from 'expo-router';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { getTrainerRoutines } from '@/features/trainer/api/trainer-api';
import {
  capitalize,
  formatRoutineSchedule,
  getRoutineStatusLabel,
} from '@/features/trainer/models/trainer-presentation';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';

export function useTrainerRoutinesViewModel() {
  const routines = useAuthorizedResource(getTrainerRoutines);

  return {
    routines: (routines.data ?? []).map((routine) => ({
      id: routine.id,
      title: routine.title,
      objective: routine.objective ?? '',
      level: capitalize(routine.level),
      statusLabel: getRoutineStatusLabel(routine.status),
      isPublished: routine.status === 'published',
      schedule: formatRoutineSchedule(routine),
      exerciseCount: routine.exercises.length,
      imageUrl: routine.imageUrl,
    })),
    isLoading: routines.isLoading,
    isRefreshing: routines.isRefreshing,
    errorMessage: routines.error
      ? getAccessErrorMessage(routines.error, 'No encontramos tus rutinas.')
      : null,
    retry: routines.retry,
    refresh: routines.refresh,
    openRoutine(routineId: string) {
      router.push({ pathname: '/trainer/routines/[id]', params: { id: routineId } });
    },
  };
}
