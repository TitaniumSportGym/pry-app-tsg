import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  ADMIN_DECISION_COPY,
  getAdminRoutineActions,
  type AdminRoutineDecision,
} from '@/features/admin/models/admin-routine';
import { ADMIN_ROUTINES_KEY, adminRoutinesRepository } from '@/features/admin/repositories/admin-routines-repository';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { toRoutineDetail, type RoutineNotice } from '@/features/trainer/models/routine-detail-presentation';
import { formatEdited } from '@/features/trainer/models/trainer-routine-presentation';
import { useExerciseVideoPlayer } from '@/features/training/viewmodels/use-exercise-video-player';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { ApiError } from '@/types/auth';
import { getApiErrorMessage } from '@/utils/api-error-message';
import { isUuid } from '@/utils/uuid';

const NOT_FOUND_MESSAGE = 'No encontramos esta rutina.';

function getAdminNotice(status: string, videoCount: number): RoutineNotice | null {
  if (status === 'pending_review') {
    return {
      tone: 'warning',
      title: 'Pendiente de tu revisión',
      text: `Revisa los ejercicios y ${videoCount === 1 ? 'su video' : `sus ${videoCount} videos`} antes de aprobarla para los socios.`,
    };
  }
  if (status === 'published') return { tone: 'success', title: 'Publicada', text: 'Los socios con membresía activa ya la ven.' };
  if (status === 'rejected') return { tone: 'error', title: 'Rechazada', text: 'El entrenador puede corregirla y volver a enviarla.' };
  if (status === 'archived') return { tone: 'neutral', title: 'Archivada', text: 'Los socios ya no la ven.' };
  return null;
}

/** Pantalla 91 · Admin — Revisar rutina: aprobar, rechazar o archivar. */
export function useAdminRoutineReviewViewModel(routineId: unknown) {
  const validId = isUuid(routineId) ? routineId : null;
  const load = useCallback(
    async (options: LoadOptions) => {
      const routine = validId ? await adminRoutinesRepository.getRoutine(validId, options) : null;
      if (!routine) throw new ApiError(NOT_FOUND_MESSAGE, 404);
      return routine;
    },
    [validId],
  );
  const resource = useAuthorizedResource(load, { reloadOn: [ADMIN_ROUTINES_KEY] });
  const player = useExerciseVideoPlayer();
  const [busy, setBusy] = useState<AdminRoutineDecision | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const routine = resource.data;
  const detail = routine ? toRoutineDetail(routine) : null;
  const actions = getAdminRoutineActions(routine?.status ?? '');

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, 300),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error ? getAccessErrorMessage(resource.error, NOT_FOUND_MESSAGE) : null,
    routine: detail,
    trainerName: routine?.trainerName ?? '',
    edited: routine ? formatEdited(routine) : '',
    notice: routine && detail ? getAdminNotice(routine.status, detail.videoCount) : null,
    ...actions,
    hasActions: Boolean(routine) && (actions.canApprove || actions.canReject || actions.canArchive),
    copy: ADMIN_DECISION_COPY,
    busy,
    actionError,
    retry: resource.retry,
    refresh: resource.refresh,
    activeVideo: player.activeVideo,
    openVideo: player.openVideo,
    closeVideo: player.closeVideo,
    openVideoExternally: player.openExternally,
    async decide(decision: AdminRoutineDecision) {
      if (!validId || busy) return;
      setBusy(decision);
      setActionError(null);
      try {
        await adminRoutinesRepository.decide(validId, decision);
        if (router.canGoBack()) router.back();
        else router.replace('/admin/routines');
      } catch (error) {
        setActionError(getApiErrorMessage(error, ADMIN_DECISION_COPY[decision].error));
      } finally {
        setBusy(null);
      }
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/admin/routines');
    },
  };
}
