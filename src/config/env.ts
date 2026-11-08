import { validateApiUrl } from './api-url-policy';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export function getApiBaseUrl(): string {
  const baseUrl = API_BASE_URL.trim();

  if (!baseUrl) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_URL. Add it in .env.local, for example: EXPO_PUBLIC_API_URL=https://URL-REAL",
    );
  }

  let end = baseUrl.length;
  while (end > 0 && baseUrl[end - 1] === "/") {
    end -= 1;
  }
  const normalized = baseUrl.slice(0, end);
  const url = validateApiUrl(normalized, __DEV__);
  if (url.search) throw new Error('The API base URL cannot contain a query.');
  return normalized;
}
