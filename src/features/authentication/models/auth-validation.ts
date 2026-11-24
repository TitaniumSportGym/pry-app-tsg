export interface EmailValidationResult {
  email: string;
  error?: string;
}

export function validateEmail(value: string): EmailValidationResult {
  const email = value.trim().toLowerCase();

  if (!email) {
    return { email, error: "Ingresa tu correo electrónico." };
  }

  // Preserve the existing permissive format: nonempty parts around @ and
  // the last dot, with no whitespace. Each scan is linear, with no backtracking.
  const at = email.indexOf("@", 1);
  const dot = email.lastIndexOf(".");
  if (at === -1 || dot <= at + 1 || dot === email.length - 1 || /\s/.test(email)) {
    return { email, error: "Ingresa un correo electrónico válido." };
  }

  return { email };
}

export function normalizeOtp(value: string, length = 6) {
  return value.replace(/\D/g, "").slice(0, length);
}

export function isValidOtp(value: string, length = 6) {
  return new RegExp(`^\\d{${length}}$`).test(value);
}
