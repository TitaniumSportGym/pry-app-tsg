import { getApiBaseUrl } from "../config/env";
import { resolveApiRequestUrl } from '../config/api-url-policy';
import { ApiError } from "../types/auth";
import { getAccessToken, invalidateAccessToken } from "./sessionService";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  auth?: boolean;
  /** Bind session-ending operations to the credential captured when they began. */
  expectedAccessToken?: string;
  headers?: Record<string, string>;
  onResponse?: (metadata: { status: number; headers: Headers }) => void;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function extractErrorCode(data: unknown): string | undefined {
  if (isPlainObject(data) && typeof data.code === "string") {
    return data.code;
  }

  return undefined;
}

function extractErrorMessage(data: unknown): string {
  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => extractErrorMessage(item)).join(", ");
  }

  if (isPlainObject(data)) {
    const message =
      (typeof data.message === "string" && data.message.trim()) ||
      (typeof data.error === "string" && data.error.trim()) ||
      (typeof data.detail === "string" && data.detail.trim()) ||
      (typeof data.errorMessage === "string" && data.errorMessage.trim());

    if (message) {
      return message;
    }

    const code = typeof data.code === "string" ? data.code : undefined;
    if (code) {
      return code;
    }
  }

  return "Request failed.";
}

function toSearchableText(value: unknown): string {
  const serialized = typeof value === "string" ? value : JSON.stringify(value ?? {});
  return serialized.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * 403 de reglas de negocio: la sesión sigue siendo válida. Los del acceso QR hablan del
 * token del pase, no del de sesión, así que su texto no debe cerrar la sesión.
 */
const BUSINESS_FORBIDDEN_CODES = new Set([
  "MEMBERSHIP_REQUIRED",
  "QR_OWNER_INVALID",
  "SELF_SCAN_FORBIDDEN",
]);

export function shouldInvalidateSession(
  status: number,
  body: unknown,
): boolean {
  if (status === 401) {
    return true;
  }

  if (status !== 403) {
    return false;
  }

  const code = extractErrorCode(body);
  if (code && BUSINESS_FORBIDDEN_CODES.has(code)) {
    return false;
  }

  const text = toSearchableText(body);
  const authSignals = [
    "token invalido",
    "invalid token",
    "jwt expired",
    "token expirado",
    "session expired",
    "sesion expirada",
    "session invalid",
    "sesion invalida",
    "token revoked",
    "token revocado",
    "invalid session",
    "token no proporcionado",
    "token missing",
    "unauthorized",
    "authentication required",
    "invalid authorization",
  ];

  return authSignals.some((signal) => text.includes(signal));
}

/** Retry-After in whole seconds; the HTTP-date form is ignored and absurd values are capped. */
export function parseRetryAfterSeconds(value: string | null | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined;
  return Math.min(Number(value.trim()), 3600);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  const text = await response.text();
  return text || null;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true, headers = {}, onResponse } = options;
  const baseUrl = getApiBaseUrl();
  const url = resolveApiRequestUrl(baseUrl, path, __DEV__);

  const requestHeaders = new Headers(headers);
  // Callers cannot smuggle a credential into a public request.
  requestHeaders.delete('Authorization');
  let token: string | null = null;

  async function invalidate(error: ApiError) {
    error.sessionInvalidationHandled = true;
    try { await invalidateAccessToken(token); } catch {
      // Preserve the HTTP failure. The invalidator closes UI/cache in finally.
    }
  }

  if (body !== undefined && body !== null && !isFormData(body)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    token = await getAccessToken();

    if (!token) {
      const error = new ApiError("Authentication required.", 401, { code: "NO_TOKEN" });
      await invalidate(error);
      throw error;
    }

    if (options.expectedAccessToken !== undefined && token !== options.expectedAccessToken) {
      throw new ApiError('The session changed before this request.', 409, undefined, 'SESSION_CHANGED');
    }

    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const requestBody =
    body === undefined || body === null
      ? undefined
      : isFormData(body) || typeof body === "string"
        ? body
        : JSON.stringify(body);

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
    redirect: 'error',
  });

  // Some native fetch implementations do not enforce redirect: 'error'. This
  // rejects an unexpected final origin, but cannot undo a followed redirect.
  if (response.url) resolveApiRequestUrl(baseUrl, response.url, __DEV__);

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    const message = extractErrorMessage(responseBody);
    const apiError = new ApiError(
      message,
      response.status,
      responseBody,
      extractErrorCode(responseBody),
    );
    apiError.retryAfterSeconds = parseRetryAfterSeconds(response.headers?.get?.("retry-after"));

    if (auth && shouldInvalidateSession(response.status, responseBody)) {
      await invalidate(apiError);
    }

    throw apiError;
  }

  onResponse?.({ status: response.status, headers: response.headers });
  return (responseBody ?? null) as T;
}
