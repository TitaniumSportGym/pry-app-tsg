import { parseAccessPass } from '@/features/access/models/access-pass';
import {
  ACCESS_HISTORY_PAGE_SIZE,
  parseAccessHistory,
  parseGrantedAccess,
} from '@/features/access/models/access-history';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

/** Ningún dato del pase se registra en logs: los errores solo llevan un mensaje genérico. */
const INVALID_RESPONSE = 'El servidor respondió con datos de acceso no válidos.';

export interface AccessHistoryQuery {
  page?: number;
  limit?: number;
  /** YYYY-MM-DD (UTC, inclusivo). */
  from?: string;
  to?: string;
}

function historyQuery({ page = 1, limit = ACCESS_HISTORY_PAGE_SIZE, from, to }: AccessHistoryQuery) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return params.toString();
}

/** Cliente: token temporal para su QR. El servidor toma al usuario del JWT; el cuerpo va vacío. */
export async function createAccessPass() {
  const pass = parseAccessPass(await apiRequest<unknown>('/api/access/qr', { method: 'POST', body: {} }));
  if (!pass) throw new ApiError(INVALID_RESPONSE, 502);
  return pass;
}

/**
 * Administrador: valida el QR leído y registra la entrada.
 * Se envía el contenido tal como se leyó; solo un accessGranted === true confirma la entrada.
 */
export async function scanAccessCode(token: string) {
  const access = parseGrantedAccess(
    await apiRequest<unknown>('/api/access/scan', { method: 'POST', body: { token } }),
  );
  if (!access) throw new ApiError(INVALID_RESPONSE, 502);
  return access;
}

/** Cliente: solo sus propias entradas. */
export async function getMyAccessHistory(query: AccessHistoryQuery = {}) {
  return parseAccessHistory(await apiRequest<unknown>(`/api/access/me/history?${historyQuery(query)}`));
}

/** Administrador: todas las entradas, con filtro opcional por fechas. */
export async function getAdminAccessHistory(query: AccessHistoryQuery = {}) {
  return parseAccessHistory(
    await apiRequest<unknown>(`/api/access/admin/history?${historyQuery(query)}`),
  );
}
