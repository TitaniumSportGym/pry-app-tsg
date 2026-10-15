import { ApiError } from "@/types/auth";

export const FORBIDDEN_MESSAGE = "No tienes permisos para consultar esta información.";
export const SESSION_EXPIRED_MESSAGE = "Tu sesión expiró. Inicia sesión de nuevo.";
export const NETWORK_ERROR_MESSAGE =
  "No fue posible conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
export const SERVER_ERROR_MESSAGE =
  "Ocurrió un problema al cargar la información. Inténtalo más tarde.";

/**
 * Maps API failures to messages that are safe to show.
 * Server error details (such as database errors) are never shown as-is.
 */
export function getAccessErrorMessage(error: unknown, notFoundMessage: string) {
  if (!(error instanceof ApiError)) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (error.status === 401) {
    return SESSION_EXPIRED_MESSAGE;
  }

  if (error.status === 403) {
    return FORBIDDEN_MESSAGE;
  }

  if (error.status === 404) {
    return notFoundMessage;
  }

  return SERVER_ERROR_MESSAGE;
}
