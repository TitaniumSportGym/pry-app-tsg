export interface EmailValidationResult {
  email: string;
  error?: string;
}

export function validateEmail(value: string): EmailValidationResult {
  const email = value.trim().toLowerCase();

  if (!email) {
    return { email, error: "Ingresa tu correo electrónico." };
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
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
