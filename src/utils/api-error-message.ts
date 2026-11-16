import { ApiError } from '@/types/auth';

const MAX_SHOWN_ERROR_LENGTH = 160;
export const SESSION_ERROR_MESSAGE = 'Tu sesión expiró. Inicia sesión de nuevo.';

/**
 * Mensaje para el usuario después de una acción (guardar, cancelar…). Los mensajes de negocio
 * del backend (4xx cortos, p. ej. "El código postal no tiene cobertura") se muestran tal cual;
 * errores del servidor o de red usan el mensaje genérico de la pantalla.
 */
export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 401) return SESSION_ERROR_MESSAGE;

  const message = error.message.trim();
  const isClientError = error.status >= 400 && error.status < 500;
  return isClientError && message && message.length <= MAX_SHOWN_ERROR_LENGTH ? message : fallback;
}
