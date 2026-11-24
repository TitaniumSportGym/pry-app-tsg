import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

import {
  createAccessPass,
  getAdminAccessHistory,
  getMyAccessHistory,
  scanAccessCode,
} from './access-api';

jest.mock('@/services/apiClient', () => ({ apiRequest: jest.fn() }));

const apiRequestMock = jest.mocked(apiRequest);
const TOKEN = 'hG5Wa8zF1rD0vQ3uN9bK2sC7eL4mP6xT8yJ0aR5dVUw';

const historyResponse = {
  ok: true,
  history: [
    {
      id: '25ae449c-b5ab-4b45-9be3-3fd7602a659a',
      userId: 'b2ec5cc4-2186-4f87-bcff-b2240678f907',
      subscriptionId: '14257730-455a-4ea0-a989-dba527867b41',
      scannedBy: '07489b9b-cf1f-41c9-b494-f17d63aa7810',
      scannedAt: '2026-11-03T21:00:20.000Z',
      result: 'granted',
    },
    { id: 'roto', scannedAt: 'no es fecha' },
  ],
  pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
};

describe('access-api', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('pide el pase con POST /api/access/qr y cuerpo vacío (el usuario sale del JWT)', async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      token: TOKEN,
      expiresAt: '2026-11-03T21:01:00.000Z',
      subscription: { status: 'active', endsAt: '2026-12-03' },
    });

    const pass = await createAccessPass();

    expect(apiRequestMock).toHaveBeenCalledWith('/api/access/qr', { method: 'POST', body: {} });
    expect(pass).toEqual({
      token: TOKEN,
      expiresAt: new Date('2026-11-03T21:01:00.000Z'),
      subscription: { status: 'active', endsAt: '2026-12-03' },
    });
  });

  it.each([
    [{ ok: true, expiresAt: '2026-11-03T21:01:00.000Z' }],
    [{ ok: true, token: 'con espacios no', expiresAt: '2026-11-03T21:01:00.000Z' }],
    [{ ok: true, token: TOKEN, expiresAt: 'mañana' }],
    [null],
  ])('rechaza un pase que no se puede mostrar (%#)', async (response) => {
    apiRequestMock.mockResolvedValue(response);

    await expect(createAccessPass()).rejects.toMatchObject({ status: 502 });
  });

  it('propaga el error del backend (p. ej. sin membresía) sin cambiarlo', async () => {
    const error = new ApiError('Se requiere membresía', 403, undefined, 'MEMBERSHIP_REQUIRED');
    apiRequestMock.mockRejectedValue(error);

    await expect(createAccessPass()).rejects.toBe(error);
  });

  it('envía el token leído tal cual a POST /api/access/scan y devuelve la entrada', async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      accessGranted: true,
      message: 'Acceso permitido',
      access: {
        id: '25ae449c-b5ab-4b45-9be3-3fd7602a659a',
        userId: 'b2ec5cc4-2186-4f87-bcff-b2240678f907',
        scannedAt: '2026-11-03T21:00:20.000Z',
        subscriptionStatus: 'active',
      },
    });

    const access = await scanAccessCode(TOKEN);

    expect(apiRequestMock).toHaveBeenCalledWith('/api/access/scan', {
      method: 'POST',
      body: { token: TOKEN },
    });
    expect(access.userId).toBe('b2ec5cc4-2186-4f87-bcff-b2240678f907');
    expect(access.scannedAt).toEqual(new Date('2026-11-03T21:00:20.000Z'));
  });

  it.each([
    [{ ok: true, accessGranted: false, access: {} }],
    [{ ok: true, message: 'Acceso permitido' }],
    [{ ok: true, accessGranted: 'true', access: { id: 'a', userId: 'u', scannedAt: '2026-11-03T21:00:20.000Z' } }],
  ])('no da por concedida una respuesta sin accessGranted === true (%#)', async (response) => {
    apiRequestMock.mockResolvedValue(response);

    await expect(scanAccessCode(TOKEN)).rejects.toMatchObject({ status: 502 });
  });

  it('pagina el historial propio y descarta registros dañados', async () => {
    apiRequestMock.mockResolvedValue(historyResponse);

    const page = await getMyAccessHistory({ page: 2 });

    expect(apiRequestMock).toHaveBeenCalledWith('/api/access/me/history?page=2&limit=20');
    expect(page).toEqual({
      entries: [
        {
          id: '25ae449c-b5ab-4b45-9be3-3fd7602a659a',
          userId: 'b2ec5cc4-2186-4f87-bcff-b2240678f907',
          scannedAt: new Date('2026-11-03T21:00:20.000Z'),
          granted: true,
        },
      ],
      page: 2,
      totalPages: 2,
      total: 21,
    });
  });

  it('filtra el historial administrativo por fechas', async () => {
    apiRequestMock.mockResolvedValue({ ok: true, history: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });

    const page = await getAdminAccessHistory({ page: 1, limit: 100, from: '2026-11-01', to: '2026-11-03' });

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/access/admin/history?page=1&limit=100&from=2026-11-01&to=2026-11-03',
    );
    expect(page).toEqual({ entries: [], page: 1, totalPages: 0, total: 0 });
  });
});
