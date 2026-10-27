import { getApiBaseUrl } from "../config/env";
import { ApiError } from "../types/auth";
import { getAccessToken, removeAccessToken } from "./sessionService";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiRequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  auth?: boolean;
  headers?: Record<string, string>;
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

  if (extractErrorCode(body) === "MEMBERSHIP_REQUIRED") {
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
  const { method = "GET", body, auth = true, headers = {} } = options;
  const baseUrl = getApiBaseUrl();
  const isAbsoluteUrl = /^https?:\/\//i.test(path);
  const url = isAbsoluteUrl
    ? path
    : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const requestHeaders = new Headers(headers);

  if (body !== undefined && body !== null && !isFormData(body)) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = await getAccessToken();

    if (!token) {
      throw new ApiError("Authentication required.", 401, { code: "NO_TOKEN" });
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
  });

  const responseBody = await parseResponseBody(response);

  if (!response.ok) {
    const message = extractErrorMessage(responseBody);
    const apiError = new ApiError(
      message,
      response.status,
      responseBody,
      extractErrorCode(responseBody),
    );

    if (auth && shouldInvalidateSession(response.status, responseBody)) {
      await removeAccessToken();
    }

    throw apiError;
  }

  return (responseBody ?? null) as T;
}
