import { ApiError } from "@/types/auth";

export function getPasswordRecoveryError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;

  const message = error.message.trim();
  const isTechnicalResponse =
    !message ||
    message === "Request failed." ||
    message.startsWith("<") ||
    message.length > 240;

  return isTechnicalResponse ? fallback : message;
}
