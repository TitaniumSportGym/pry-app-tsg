import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import {
  formatRest,
  groupExercisesByDay,
  isValidResourceId,
} from '@/features/trainer/models/trainer-presentation';
import {
  getExerciseVideo,
  type ActiveExerciseVideo,
  type ExerciseVideo,
} from '@/features/training/models/exercise-video';
import {
  formatDaysPerWeek,
  formatMinutes,
  formatWeeks,
  getCategoryLabel,
  getLevelLabel,
  isMembershipRequiredError,
} from '@/features/training/models/client-routine';
import { routinesRepository } from '@/features/training/repositories/routines-repository';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';
import { ApiError } from '@/types/auth';

const NOT_FOUND_MESSAGE = 'No encontramos esta rutina.';

function countLabel(count: number) {
  return `${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`;
}

/** Screen 23 · Rutina — Detalle: summary and exercises grouped by day. */
export function useRoutineDetailViewModel(routineId: unknown) {
  const load = useCallback(
    async (options: LoadOptions) => {
      if (!isValidResourceId(routineId)) {
        throw new ApiError(NOT_FOUND_MESSAGE, 404);
      }

      return routinesRepository.getRoutine(routineId, options);
    },
    [routineId],
  );

  const resource = useAuthorizedResource(load);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<ActiveExerciseVideo | null>(null);
  const routine = resource.data;
  const days = routine ? groupExercisesByDay(routine.exercises) : [];
  const activeDay = days.find((day) => day.dayNumber === selectedDay) ?? days[0] ?? null;

  return {
    routine: routine
      ? {
          title: routine.title,
          objective: routine.objective,
          description: routine.description,
          categoryLabel: getCategoryLabel(routine.category),
          levelLabel: getLevelLabel(routine.level),
          imageUrl: routine.imageUrl,
          weeks: formatWeeks(routine.durationWeeks),
          daysPerWeek: `${formatDaysPerWeek(routine.daysPerWeek)} por semana`,
          minutes: formatMinutes(routine.estimatedMinutes),
          exerciseCount: routine.exercises.length,
        }
      : null,
    days: days.map((day) => ({
      dayNumber: day.dayNumber,
      label: `Día ${day.dayNumber} · ${countLabel(day.exercises.length)}`,
    })),
    selectedDay: activeDay?.dayNumber ?? null,
    exercises: (activeDay?.exercises ?? []).map((exercise, index) => ({
      id: exercise.id,
      position: index + 1,
      name: exercise.name,
      description: exercise.description ?? '',
      sets: String(exercise.sets),
      reps: exercise.reps,
      rest: formatRest(exercise.restSeconds),
      notes: exercise.notes ?? '',
      video: getExerciseVideo(exercise.videoUrl),
    })),
    activeVideo,
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    isLocked: isMembershipRequiredError(resource.error),
    errorMessage: resource.error ? getAccessErrorMessage(resource.error, NOT_FOUND_MESSAGE) : null,
    retry: resource.retry,
    refresh: resource.refresh,
    selectDay: setSelectedDay,
    /** YouTube and video files play in the app; other pages open in the browser. */
    openVideo(title: string, video: ExerciseVideo) {
      if (video.kind === 'link') {
        void WebBrowser.openBrowserAsync(video.url);
        return;
      }
      setActiveVideo({ title, video });
    },
    closeVideo() {
      setActiveVideo(null);
    },
    openVideoExternally(url: string) {
      setActiveVideo(null);
      void WebBrowser.openBrowserAsync(url);
    },
    openMemberships() {
      router.push('/memberships');
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/account/routines');
    },
  };
}
