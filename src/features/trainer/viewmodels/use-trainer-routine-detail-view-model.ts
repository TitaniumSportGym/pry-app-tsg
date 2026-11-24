import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { getTrainerNotice, toRoutineDetail } from '@/features/trainer/models/routine-detail-presentation';
import { formatEdited } from '@/features/trainer/models/trainer-routine-presentation';
import { canArchiveRoutine, canEditRoutine, canSubmitRoutine } from '@/features/trainer/models/trainer-routine';
import { TRAINER_KEYS, trainerRepository } from '@/features/trainer/repositories/trainer-repository';
import { trainerRoutinesRepository } from '@/features/trainer/repositories/trainer-routines-repository';
import { useExerciseVideoPlayer } from '@/features/training/viewmodels/use-exercise-video-player';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { ApiError } from '@/types/auth';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { isUuid } from '@/utils/uuid';

const NOT_FOUND_MESSAGE = 'No encontramos esta rutina.';
type Action = 'submit' | 'archive' | 'delete';

/** Pantallas 86–88 · Entrenador — detalle de su rutina con las acciones de cada estado. */
export function useTrainerRoutineDetailViewModel(routineId: unknown) {
  const validId = isUuid(routineId) ? routineId : null;
  const load = useCallback(
    (options: LoadOptions) =>
      validId ? trainerRepository.getRoutine(validId, options) : Promise.reject(new ApiError(NOT_FOUND_MESSAGE, 404)),
    [validId],
  );
  const resource = useAuthorizedResource(load, { reloadOn: [TRAINER_KEYS.all] });
  const player = useExerciseVideoPlayer();
  const [busy, setBusy] = useState<Action | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const routine = resource.data;
  const status = routine?.status ?? '';

  async function run(action: Action, task: () => Promise<unknown>, fallback: string) {
    if (busy) return false;
    setBusy(action);
    setActionError(null);
    try {
      await task();
      return true;
    } catch (error) {
      setActionError(getApiErrorMessage(error, fallback));
      return false;
    } finally {
      setBusy(null);
    }
  }

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, 300),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error ? getAccessErrorMessage(resource.error, NOT_FOUND_MESSAGE) : null,
    routine: routine ? toRoutineDetail(routine) : null,
    edited: routine ? formatEdited(routine) : '',
    notice: routine ? getTrainerNotice(status) : null,
    canEdit: Boolean(routine) && canEditRoutine(status),
    canSubmit: Boolean(routine) && canSubmitRoutine(status),
    canArchive: Boolean(routine) && canArchiveRoutine(status),
    canDelete: Boolean(routine) && status !== 'pending_review' && status !== 'published',
    isRejected: status === 'rejected',
    busy,
    actionError,
    retry: resource.retry,
    refresh: resource.refresh,
    activeVideo: player.activeVideo,
    openVideo: player.openVideo,
    closeVideo: player.closeVideo,
    openVideoExternally: player.openExternally,
    edit() {
      if (validId) router.push({ pathname: '/trainer/routines/editor', params: { id: validId } });
    },
    submit() {
      if (!validId) return Promise.resolve(false);
      return run('submit', () => trainerRoutinesRepository.submitRoutine(validId), 'No pudimos enviar la rutina a revisión.');
    },
    archive() {
      if (!validId) return Promise.resolve(false);
      return run('archive', () => trainerRoutinesRepository.archiveRoutine(validId), 'No pudimos archivar la rutina.');
    },
    async remove() {
      if (!validId) return;
      const removed = await run('delete', () => trainerRoutinesRepository.deleteRoutine(validId), 'No pudimos eliminar la rutina.');
      if (removed) router.replace('/trainer/routines');
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/trainer/routines');
    },
  };
}
