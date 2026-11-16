import { RepositoryCache } from '@/core/repository/repository-cache';
import { emptyExerciseDraft, emptyRoutineDraft, toProfileDraft, parseTrainerProfile } from '@/features/trainer/models/trainer-routine';

import { TRAINER_KEYS } from './trainer-repository';
import { createTrainerRoutinesRepository, type TrainerWriteSource } from './trainer-routines-repository';

function setup() {
  const cache = new RepositoryCache(() => 0);
  const source = {
    createTrainerRoutine: jest.fn(async () => ({ id: 'nueva' })),
    updateTrainerRoutine: jest.fn(async () => ({ id: 'existente' })),
    deleteTrainerRoutine: jest.fn(async () => undefined),
    submitTrainerRoutine: jest.fn(async () => undefined),
    archiveTrainerRoutine: jest.fn(async () => undefined),
    uploadExerciseVideo: jest.fn(async () => undefined),
    setExerciseVideoUrl: jest.fn(async () => undefined),
    removeExerciseVideo: jest.fn(async () => undefined),
    updateTrainerProfile: jest.fn(async () => ({ fullName: 'Rogelio' })),
  } as unknown as jest.Mocked<TrainerWriteSource>;
  const invalidate = jest.spyOn(cache, 'invalidate');
  return { cache, source, invalidate, repository: createTrainerRoutinesRepository(source, cache) };
}

const draft = { ...emptyRoutineDraft(), title: 'Fuerza', exercises: [{ ...emptyExerciseDraft(), name: 'Press' }] };
const file = { uri: 'file:///v.mp4', name: 'v.mp4', type: 'video/mp4', size: 1, durationMs: null };

describe('Repositorio de escrituras del entrenador', () => {
  it('crea o actualiza según haya id y avisa a las lecturas', async () => {
    const { repository, source, invalidate } = setup();
    const onProgress = jest.fn();

    await repository.saveRoutine(draft, { status: 'draft', onProgress });
    expect(source.createTrainerRoutine).toHaveBeenCalledWith(expect.any(FormData), { onProgress });

    await repository.saveRoutine(draft, { routineId: 'r1', status: 'pending_review' });
    expect(source.updateTrainerRoutine).toHaveBeenCalledWith('r1', expect.any(FormData), {});
    expect(invalidate).toHaveBeenCalledWith(TRAINER_KEYS.all);
  });

  it('invalida después de cada acción y no antes si falla', async () => {
    const { repository, source, invalidate } = setup();
    await repository.submitRoutine('r1');
    await repository.archiveRoutine('r1');
    await repository.deleteRoutine('r1');
    await repository.uploadExerciseVideo('r1', 'e1', file);
    await repository.setExerciseVideoUrl('r1', 'e1', '  https://youtu.be/a  ');
    await repository.removeExerciseVideo('r1', 'e1');
    expect(source.setExerciseVideoUrl).toHaveBeenCalledWith('r1', 'e1', 'https://youtu.be/a');
    expect(source.uploadExerciseVideo).toHaveBeenCalledWith('r1', 'e1', file, {});
    expect(invalidate).toHaveBeenCalledTimes(6);

    invalidate.mockClear();
    jest.mocked(source.submitTrainerRoutine).mockRejectedValueOnce(new Error('500'));
    await expect(repository.submitRoutine('r1')).rejects.toThrow('500');
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('guarda el perfil con foto opcional', async () => {
    const { repository, source } = setup();
    const profile = toProfileDraft(parseTrainerProfile({ fullName: 'Rogelio', specialty: 'Fuerza' }));
    await expect(repository.saveProfile(profile, null)).resolves.toEqual({ fullName: 'Rogelio' });
    expect(source.updateTrainerProfile).toHaveBeenCalledWith(expect.any(FormData), {});
  });
});
