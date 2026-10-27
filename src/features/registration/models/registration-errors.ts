import { ApiError } from "@/types/auth";

interface ValidationIssue {
  msg?: unknown;
}

function getValidationMessages(data: unknown) {
  if (!data || typeof data !== "object" || !("errors" in data)) return [];

  const errors = data.errors;
  if (!Array.isArray(errors)) return [];

  return errors
    .map((issue) => (issue as ValidationIssue)?.msg)
    .filter(
      (message): message is string =>
        typeof message === "string" && message.length > 0,
    );
}

export function getRegistrationErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 409)
    return "Ya existe una cuenta asociada a este correo.";

  const validationMessages = getValidationMessages(error.data);
  if (validationMessages.length > 0) return validationMessages.join("\n");

  const message = error.message.trim();
  const isTechnicalResponse =
    !message ||
    message === "Request failed." ||
    message.startsWith("<") ||
    message.length > 240;

  return isTechnicalResponse ? fallback : message;
}
