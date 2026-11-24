import { repositoryCache, type RepositoryCache } from '@/core/repository/repository-cache';
import * as trainerApi from '@/features/trainer/api/trainer-api';
import type { TrainerProfile, TrainerRoutine } from '@/features/trainer/models/trainer';
import {
  buildProfileFormData,
  buildRoutineFormData,
  type ProfileDraft,
  type RoutineDraft,
  type RoutineStatus,
} from '@/features/trainer/models/trainer-routine';
import { TRAINER_KEYS } from '@/features/trainer/repositories/trainer-repository';
import type { PickedFile } from '@/services/media-picker';
import type { UploadProgress } from '@/services/upload-client';

interface Upload {
  onProgress?: UploadProgress;
  signal?: AbortSignal;
}

export type TrainerWriteSource = Pick<
  typeof trainerApi,
  | 'createTrainerRoutine'
  | 'updateTrainerRoutine'
  | 'deleteTrainerRoutine'
  | 'submitTrainerRoutine'
  | 'archiveTrainerRoutine'
  | 'uploadExerciseVideo'
  | 'setExerciseVideoUrl'
  | 'removeExerciseVideo'
  | 'updateTrainerProfile'
>;

/**
 * Escrituras del entrenador. Cada cambio invalida las lecturas de `trainer` (Observer): la lista,
 * el detalle, el inicio y el perfil se recargan solos. Las lecturas siguen en trainerRepository.
 */
export function createTrainerRoutinesRepository(
  source: TrainerWriteSource = trainerApi,
  cache: RepositoryCache = repositoryCache,
) {
  const changed = <T>(value: T) => {
    cache.invalidate(TRAINER_KEYS.all);
    return value;
  };

  return {
    async saveRoutine(
      draft: RoutineDraft,
      { routineId, status, image, ...upload }: { routineId?: string | null; status: RoutineStatus; image?: PickedFile | null } & Upload,
    ): Promise<TrainerRoutine> {
      const body = buildRoutineFormData(draft, status, image);
      return changed(
        routineId
          ? await source.updateTrainerRoutine(routineId, body, upload)
          : await source.createTrainerRoutine(body, upload),
      );
    },
    deleteRoutine: async (routineId: string) => changed(await source.deleteTrainerRoutine(routineId)),
    submitRoutine: async (routineId: string) => changed(await source.submitTrainerRoutine(routineId)),
    archiveRoutine: async (routineId: string) => changed(await source.archiveTrainerRoutine(routineId)),
    uploadExerciseVideo: async (routineId: string, exerciseId: string, file: PickedFile, upload: Upload = {}) =>
      changed(await source.uploadExerciseVideo(routineId, exerciseId, file, upload)),
    setExerciseVideoUrl: async (routineId: string, exerciseId: string, url: string) =>
      changed(await source.setExerciseVideoUrl(routineId, exerciseId, url.trim())),
    removeExerciseVideo: async (routineId: string, exerciseId: string) =>
      changed(await source.removeExerciseVideo(routineId, exerciseId)),
    async saveProfile(draft: ProfileDraft, photo: PickedFile | null, upload: Upload = {}): Promise<TrainerProfile> {
      return changed(await source.updateTrainerProfile(buildProfileFormData(draft, photo), upload));
    },
  };
}

export const trainerRoutinesRepository = createTrainerRoutinesRepository();
