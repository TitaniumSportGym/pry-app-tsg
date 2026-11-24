import { trainerProfile } from '../../../../tests/fixtures/privacy';

import { apiRequest } from '@/services/apiClient';

import { getTrainerPersonalProfile, rectifyTrainerPersonalProfile } from './personal-data-api';

jest.mock('@/services/apiClient', () => ({ apiRequest: jest.fn() }));
const request = jest.mocked(apiRequest);
const draft = { fullName: ' Nombre corregido ', phone: ' 7717654321 ' };

beforeEach(() => jest.resetAllMocks());

describe('API de rectificación existente', () => {
  it('consulta el perfil del entrenador con autenticación', async () => {
    request.mockResolvedValue({ profile: trainerProfile() });
    await expect(getTrainerPersonalProfile('user-1')).resolves.toEqual(trainerProfile());
    expect(request).toHaveBeenCalledWith('/api/trainer/profile', { method: 'GET', auth: true });
  });

  it('preserva los campos actuales del PUT y confirma la respuesta del servidor', async () => {
    const current = trainerProfile({ specialty: 'Especialidad actualizada en web' });
    const normalized = { fullName: draft.fullName.trim(), phone: draft.phone.trim() };
    request.mockResolvedValueOnce({ profile: current }).mockResolvedValueOnce({ profile: { ...current, ...normalized } });

    await expect(rectifyTrainerPersonalProfile('user-1', draft, () => true)).resolves.toEqual({ ...current, ...normalized });

    const { trainerId: _trainerId, ...otherFields } = current;
    expect(request).toHaveBeenNthCalledWith(2, '/api/trainer/profile', {
      method: 'PUT', auth: true, body: { ...otherFields, ...normalized },
    });
    expect(request.mock.calls[1][1]?.body).not.toHaveProperty('email');
    expect(request.mock.calls[1][1]?.body).not.toHaveProperty('rol');
  });

  it('no hace peticiones con datos inválidos', async () => {
    await expect(rectifyTrainerPersonalProfile('user-1', { fullName: 'a'.repeat(161), phone: '' }, () => true)).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it('no escribe si la sesión cambia mientras se consulta el perfil', async () => {
    request.mockResolvedValue({ profile: trainerProfile() });
    await expect(rectifyTrainerPersonalProfile('user-1', draft, () => false)).rejects.toThrow('La sesión de esta edición cambió.');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('no escribe si el GET falla o devuelve otra identidad', async () => {
    request.mockRejectedValueOnce(new Error('Offline'));
    await expect(rectifyTrainerPersonalProfile('user-1', draft, () => true)).rejects.toThrow('Offline');
    request.mockResolvedValueOnce({ profile: trainerProfile({ trainerId: 'other-user' }) });
    await expect(rectifyTrainerPersonalProfile('user-1', draft, () => true)).rejects.toThrow();
    expect(request.mock.calls.every(([, options]) => options?.method === 'GET')).toBe(true);
  });

  it.each(['fullName', 'phone'] as const)('no confirma un guardado si el servidor no refleja %s', async (field) => {
    request.mockResolvedValueOnce({ profile: trainerProfile() });
    request.mockResolvedValueOnce({ profile: trainerProfile({
      fullName: draft.fullName.trim(), phone: draft.phone.trim(), [field]: 'Valor anterior',
    }) });
    await expect(rectifyTrainerPersonalProfile('user-1', draft, () => true)).rejects.toThrow('El servidor no confirmó los datos solicitados.');
  });

  it('propaga un rechazo del PUT', async () => {
    request.mockResolvedValueOnce({ profile: trainerProfile() }).mockRejectedValueOnce(new Error('Save failed'));
    await expect(rectifyTrainerPersonalProfile('user-1', draft, () => true)).rejects.toThrow('Save failed');
  });
});
