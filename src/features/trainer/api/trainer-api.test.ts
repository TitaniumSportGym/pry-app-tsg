import { decideAdminRoutine, getAdminRoutines } from '@/features/admin/api/admin-routines-api';
import { apiRequest } from '@/services/apiClient';
import { uploadRequest } from '@/services/upload-client';

import * as api from './trainer-api';

jest.mock('@/services/apiClient', () => ({ apiRequest: jest.fn() }));
jest.mock('@/services/upload-client', () => ({ uploadRequest: jest.fn() }));

const R = '30cdac88-08ac-42e0-9c26-d52b3e295f84';
const E = '7a1d2c3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d';
const routine = { id: R, title: 'Fuerza', status: 'draft', exercises: [] };
const file = { uri: 'file:///v.mp4', name: 'v.mp4', type: 'video/mp4', size: 1, durationMs: null };

describe('API del entrenador', () => {
  beforeEach(() => {
    jest.mocked(apiRequest).mockReset().mockResolvedValue({ routine });
    jest.mocked(uploadRequest).mockReset().mockResolvedValue({ routine });
  });

  it('lee clientes, rutinas, una rutina y el perfil con los parsers', async () => {
    jest.mocked(apiRequest).mockResolvedValueOnce({ clients: [{ id: 'c' }] }).mockResolvedValueOnce({ clients: null });
    await expect(api.getTrainerClients()).resolves.toEqual([{ id: 'c' }]);
    await expect(api.getTrainerClients()).resolves.toEqual([]);

    jest.mocked(apiRequest).mockResolvedValueOnce({ routines: [routine] });
    await expect(api.getTrainerRoutines()).resolves.toEqual([expect.objectContaining({ id: R })]);
    await expect(api.getTrainerRoutine(R)).resolves.toMatchObject({ id: R });
    expect(apiRequest).toHaveBeenLastCalledWith(`/api/trainer/routines/${R}`);

    jest.mocked(apiRequest).mockResolvedValueOnce({ profile: { fullName: 'Rogelio' } });
    await expect(api.getTrainerProfile()).resolves.toMatchObject({ fullName: 'Rogelio' });
  });

  it('no arma rutas con ids que no son UUID', async () => {
    await expect(api.getTrainerRoutine('../admin')).rejects.toMatchObject({ status: 404 });
    await expect(api.uploadExerciseVideo(R, 'local-1', file)).rejects.toMatchObject({ status: 409 });
    expect(apiRequest).not.toHaveBeenCalled();
    expect(uploadRequest).not.toHaveBeenCalled();
  });

  it('rechaza respuestas que no traen una rutina válida', async () => {
    jest.mocked(apiRequest).mockResolvedValueOnce({ routine: null });
    await expect(api.getTrainerRoutine(R)).rejects.toMatchObject({ status: 404 });
    jest.mocked(uploadRequest).mockResolvedValueOnce({});
    await expect(api.createTrainerRoutine(new FormData())).rejects.toMatchObject({ status: 502 });
  });

  it('envía las escrituras a los endpoints de la web', async () => {
    const body = new FormData();
    const onProgress = jest.fn();
    await api.createTrainerRoutine(body, { onProgress });
    expect(uploadRequest).toHaveBeenLastCalledWith('/api/trainer/routines', { method: 'POST', body, onProgress });
    await api.updateTrainerRoutine(R, body);
    expect(uploadRequest).toHaveBeenLastCalledWith(`/api/trainer/routines/${R}`, { method: 'PUT', body });
    await api.uploadExerciseVideo(R, E, file);
    expect(uploadRequest).toHaveBeenLastCalledWith(`/api/trainer/routines/${R}/exercises/${E}/video`, expect.objectContaining({ method: 'POST' }));
    await api.updateTrainerProfile(body);
    expect(uploadRequest).toHaveBeenLastCalledWith('/api/trainer/profile', { method: 'PUT', body });

    await api.deleteTrainerRoutine(R);
    expect(apiRequest).toHaveBeenLastCalledWith(`/api/trainer/routines/${R}`, { method: 'DELETE' });
    await api.submitTrainerRoutine(R);
    expect(apiRequest).toHaveBeenLastCalledWith(`/api/trainer/routines/${R}/publish`, { method: 'PATCH' });
    await api.archiveTrainerRoutine(R);
    expect(apiRequest).toHaveBeenLastCalledWith(`/api/trainer/routines/${R}/archive`, { method: 'PATCH' });
    await api.setExerciseVideoUrl(R, E, 'https://youtu.be/a');
    expect(apiRequest).toHaveBeenLastCalledWith(`/api/trainer/routines/${R}/exercises/${E}/video-url`, { method: 'PATCH', body: { videoUrl: 'https://youtu.be/a' } });
    await api.removeExerciseVideo(R, E);
    expect(apiRequest).toHaveBeenLastCalledWith(`/api/trainer/routines/${R}/exercises/${E}/video`, { method: 'DELETE' });
  });
});

describe('API de revisión de rutinas (admin)', () => {
  it('lee la lista y envía la decisión con cuerpo vacío', async () => {
    jest.mocked(apiRequest).mockReset().mockResolvedValueOnce({ ok: true, routines: [routine] }).mockResolvedValueOnce(undefined);
    await expect(getAdminRoutines()).resolves.toEqual([expect.objectContaining({ id: R, trainerName: 'Entrenador' })]);
    await decideAdminRoutine(R, 'reject');
    expect(apiRequest).toHaveBeenLastCalledWith(`/api/admin/routines/${R}/reject`, { method: 'PATCH', body: {} });
    await expect(decideAdminRoutine('1', 'approve')).rejects.toMatchObject({ status: 404 });
  });
});
