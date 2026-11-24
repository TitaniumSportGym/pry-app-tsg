import { RepositoryCache } from '@/core/repository/repository-cache';
import { ADMIN_KEYS } from '@/features/admin/repositories/admin-repository';
import { ADMIN_ROUTINES_KEY, createAdminRoutinesRepository } from '@/features/admin/repositories/admin-routines-repository';
import { TRAINER_KEYS } from '@/features/trainer/repositories/trainer-repository';
import { ROUTINE_KEYS } from '@/features/training/repositories/routines-repository';

import { countAdminRoutines, getAdminRoutineActions, parseAdminRoutine, parseAdminRoutines } from './admin-routine';

const A = '30cdac88-08ac-42e0-9c26-d52b3e295f84';
const B = '7a1d2c3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d';
const raw = (id: string, extra: Record<string, unknown> = {}) => ({ id, title: 'Rutina', status: 'pending_review', exercises: [], ...extra });

describe('Rutinas del administrador — modelo', () => {
  it('toma el nombre del entrenador de los campos disponibles', () => {
    expect(parseAdminRoutine(raw(A, { trainerName: 'Rogelio' }))?.trainerName).toBe('Rogelio');
    expect(parseAdminRoutine(raw(A, { trainer: { fullName: 'Ana López' } }))?.trainerName).toBe('Ana López');
    expect(parseAdminRoutine(raw(A, { trainerEmail: 'coach@gym.test' }))?.trainerName).toBe('coach@gym.test');
    expect(parseAdminRoutine(raw(A))?.trainerName).toBe('Entrenador');
    expect(parseAdminRoutine(raw('no-uuid'))).toBeNull();
  });

  it('lee { ok, routines }, descarta inválidas y ordena por fecha', () => {
    const list = parseAdminRoutines({
      ok: true,
      routines: [raw(A, { updatedAt: '2026-01-01' }), raw(B, { updatedAt: '2026-11-01' }), { id: 'x' }],
    });
    expect(list.map((routine) => routine.id)).toEqual([B, A]);
    expect(parseAdminRoutines(null)).toEqual([]);
  });

  it('cuenta por estado y define las decisiones posibles', () => {
    const list = parseAdminRoutines([raw(A), raw(B, { status: 'published' })]);
    expect(countAdminRoutines(list)).toEqual({ pending_review: 1, published: 1, rejected: 0, archived: 0 });
    expect(getAdminRoutineActions('pending_review')).toEqual({ canApprove: true, canReject: true, canArchive: false });
    expect(getAdminRoutineActions('published')).toEqual({ canApprove: false, canReject: true, canArchive: true });
    expect(getAdminRoutineActions('rejected')).toEqual({ canApprove: true, canReject: false, canArchive: false });
    expect(getAdminRoutineActions('archived')).toEqual({ canApprove: false, canReject: false, canArchive: false });
  });
});

describe('Rutinas del administrador — repositorio', () => {
  function setup() {
    const cache = new RepositoryCache(() => 0);
    const source = {
      getAdminRoutines: jest.fn(async () => parseAdminRoutines([raw(A)])),
      decideAdminRoutine: jest.fn(async () => undefined),
    };
    return { cache, source, repository: createAdminRoutinesRepository(source, cache) };
  }

  it('busca la rutina dentro de la lista en caché', async () => {
    const { repository, source } = setup();
    expect((await repository.getRoutine(A))?.id).toBe(A);
    expect(await repository.getRoutine(B)).toBeNull();
    expect(source.getAdminRoutines).toHaveBeenCalledTimes(1);
  });

  it('cada decisión invalida admin, entrenador y rutinas de socios', async () => {
    const { repository, source, cache } = setup();
    const invalidate = jest.spyOn(cache, 'invalidate');
    await repository.decide(A, 'approve');
    expect(source.decideAdminRoutine).toHaveBeenCalledWith(A, 'approve');
    expect(invalidate.mock.calls.map(([key]) => key)).toEqual([ADMIN_ROUTINES_KEY, ADMIN_KEYS.catalogCounts, TRAINER_KEYS.all, ROUTINE_KEYS.all]);
  });
});
