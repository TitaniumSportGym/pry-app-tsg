import { isPasswordValid } from "@/features/authentication/models/password-policy";

export interface ResetPasswordFieldErrors {
  password?: string;
  confirmPassword?: string;
}

export function validateNewPassword(password: string, confirmPassword: string) {
  const errors: ResetPasswordFieldErrors = {};

  if (!password) {
    errors.password = "Ingresa una contraseña nueva.";
  } else if (!isPasswordValid(password)) {
    errors.password = "La contraseña todavía no cumple todos los requisitos.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirma la contraseña nueva.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }

  return errors;
}
