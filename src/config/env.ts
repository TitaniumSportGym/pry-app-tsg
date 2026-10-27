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
  return baseUrl.slice(0, end);
}
