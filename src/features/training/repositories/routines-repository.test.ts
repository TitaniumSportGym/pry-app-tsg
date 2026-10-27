import { RepositoryCache } from '@/core/repository/repository-cache';
import type { ClientRoutine } from '@/features/training/models/client-routine';

import { createRoutinesRepository, ROUTINE_KEYS } from './routines-repository';

const ROUTINE_ID = 'f09a7a9b-8cb4-4119-ab5e-8c93afddf35a';

const routine: ClientRoutine = {
  id: ROUTINE_ID,
  title: 'Día de pecho',
  objective: 'Ganancia muscular',
  description: '',
  level: 'intermedio',
  category: 'hipertrofia',
  durationWeeks: 4,
  daysPerWeek: 1,
  estimatedMinutes: 90,
  imageUrl: null,
  trainerEmail: 'entrenador@titanium.com',
  exercises: [],
};

// The repository is built with a fake data source and its own cache (dependency injection).
function setup() {
  const dataSource = {
    getClientRoutines: jest.fn().mockResolvedValue([routine]),
    getClientRoutine: jest.fn().mockResolvedValue(routine),
  };
  const cache = new RepositoryCache();
  return { dataSource, cache, repository: createRoutinesRepository(dataSource, cache) };
}

describe('RoutinesRepository', () => {
  it('guarda la lista y no la vuelve a pedir mientras está vigente', async () => {
    const { dataSource, repository } = setup();

    await repository.getRoutines();
    await repository.getRoutines();

    expect(dataSource.getClientRoutines).toHaveBeenCalledTimes(1);
  });

  it('abre el detalle desde la lista sin otra petición', async () => {
    const { dataSource, repository } = setup();

    await repository.getRoutines();
    expect(await repository.getRoutine(ROUTINE_ID)).toBe(routine);
    expect(dataSource.getClientRoutine).not.toHaveBeenCalled();
  });

  it('pide el detalle al servidor si no está en la lista o al forzar', async () => {
    const { dataSource, repository } = setup();

    await repository.getRoutine(ROUTINE_ID);
    expect(dataSource.getClientRoutine).toHaveBeenCalledTimes(1);

    await repository.getRoutines();
    await repository.getRoutine(ROUTINE_ID, { force: true });
    expect(dataSource.getClientRoutine).toHaveBeenCalledTimes(2);
  });

  it('invalidate vacía las rutinas y avisa a quien observa la caché', async () => {
    const { cache, dataSource, repository } = setup();
    const observer = jest.fn();
    cache.subscribe(observer);

    await repository.getRoutines();
    repository.invalidate();
    await repository.getRoutines();

    expect(observer).toHaveBeenCalledWith({ type: 'invalidated', prefix: ROUTINE_KEYS.all });
    expect(dataSource.getClientRoutines).toHaveBeenCalledTimes(2);
  });
});
