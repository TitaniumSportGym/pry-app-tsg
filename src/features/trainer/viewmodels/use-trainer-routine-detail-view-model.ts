import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import {
  capitalize,
  formatRest,
  formatRoutineSchedule,
  getRoutineStatusLabel,
  getSafeVideoUrl,
  groupExercisesByDay,
  isValidResourceId,
} from '@/features/trainer/models/trainer-presentation';
import { trainerRepository } from '@/features/trainer/repositories/trainer-repository';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';
import { ApiError } from '@/types/auth';

const NOT_FOUND_MESSAGE = 'No encontramos esta rutina.';

export function useTrainerRoutineDetailViewModel(routineId: unknown) {
  const load = useCallback(
    async (options: LoadOptions) => {
      if (!isValidResourceId(routineId)) {
        throw new ApiError(NOT_FOUND_MESSAGE, 404);
      }

      return trainerRepository.getRoutine(routineId, options);
    },
    [routineId],
  );

  const resource = useAuthorizedResource(load);
  const routine = resource.data;

  return {
    routine: routine
      ? {
          title: routine.title,
          objective: routine.objective ?? '',
          description: routine.description ?? '',
          level: capitalize(routine.level),
          category: capitalize(routine.category),
          statusLabel: getRoutineStatusLabel(routine.status),
          schedule: formatRoutineSchedule(routine),
          imageUrl: routine.imageUrl,
          days: groupExercisesByDay(routine.exercises).map((day) => ({
            dayNumber: day.dayNumber,
            exercises: day.exercises.map((exercise) => ({
              id: exercise.id,
              name: exercise.name,
              prescription: `${exercise.sets} series × ${exercise.reps} reps · descanso ${formatRest(exercise.restSeconds)}`,
              description: exercise.description ?? '',
              notes: exercise.notes ?? '',
              videoUrl: exercise.hasVideo ? getSafeVideoUrl(exercise.videoUrl) : null,
            })),
          })),
        }
      : null,
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, NOT_FOUND_MESSAGE)
      : null,
    retry: resource.retry,
    refresh: resource.refresh,
    openVideo(videoUrl: string | null) {
      const safeUrl = getSafeVideoUrl(videoUrl);
      if (safeUrl) void WebBrowser.openBrowserAsync(safeUrl);
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/trainer/routines');
    },
  };
}
