import { resolveApiRequestUrl } from '@/config/api-url-policy';
import { getApiBaseUrl } from '@/config/env';
import { extractErrorCode, extractErrorMessage, shouldInvalidateSession } from '@/services/apiClient';
import { getAccessToken, invalidateAccessToken } from '@/services/sessionService';
import { ApiError } from '@/types/auth';

export type UploadProgress = (fraction: number) => void;

export interface UploadOptions {
  method?: 'POST' | 'PUT' | 'PATCH';
  body: FormData;
  /** Avance del envío entre 0 y 1 (lo que ya salió del teléfono). */
  onProgress?: UploadProgress;
  signal?: AbortSignal;
}

/** Mensaje y código de una subida cancelada por el usuario: no es un error que haya que mostrar. */
export const UPLOAD_CANCELLED_CODE = 'UPLOAD_CANCELLED';

export function isUploadCancelled(error: unknown) {
  return error instanceof ApiError && error.code === UPLOAD_CANCELLED_CODE;
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Envío multipart con progreso y cancelación. `fetch` no informa el avance de la subida, así
 * que se usa XMLHttpRequest con las mismas reglas que `apiRequest`: siempre con la sesión,
 * solo hacia el backend permitido y cerrando la sesión si el servidor la rechaza.
 */
export async function uploadRequest<T>(
  path: string,
  { method = 'POST', body, onProgress, signal }: UploadOptions,
): Promise<T> {
  const url = resolveApiRequestUrl(getApiBaseUrl(), path, __DEV__);
  const token = await getAccessToken();

  if (!token) {
    const error = new ApiError('Authentication required.', 401, { code: 'NO_TOKEN' });
    error.sessionInvalidationHandled = true;
    await invalidateAccessToken(null).catch(() => undefined);
    throw error;
  }
  if (signal?.aborted) throw new ApiError('Subida cancelada.', 0, undefined, UPLOAD_CANCELLED_CODE);

  const { status, responseBody } = await new Promise<{ status: number; responseBody: unknown }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const abort = () => xhr.abort();

      xhr.open(method, url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(1, event.loaded / event.total));
      };
      xhr.onload = () => {
        signal?.removeEventListener('abort', abort);
        resolve({ status: xhr.status, responseBody: parseBody(xhr.responseText) });
      };
      xhr.onerror = () => {
        signal?.removeEventListener('abort', abort);
        reject(new TypeError('Network request failed'));
      };
      xhr.onabort = () => reject(new ApiError('Subida cancelada.', 0, undefined, UPLOAD_CANCELLED_CODE));
      signal?.addEventListener('abort', abort);
      xhr.send(body);
    },
  );

  if (status < 200 || status >= 300) {
    const error = new ApiError(extractErrorMessage(responseBody), status, responseBody, extractErrorCode(responseBody));
    if (shouldInvalidateSession(status, responseBody)) {
      error.sessionInvalidationHandled = true;
      await invalidateAccessToken(token).catch(() => undefined);
    }
    throw error;
  }

  onProgress?.(1);
  return (responseBody ?? null) as T;
}
