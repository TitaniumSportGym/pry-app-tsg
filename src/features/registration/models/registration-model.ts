import { validateEmail } from "@/features/authentication/models/auth-validation";
import { isPasswordValid } from "@/features/authentication/models/password-policy";

export interface RegistrationFieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  privacyAccepted?: string;
}

export function validateRegistration(
  emailValue: string,
  password: string,
  confirmPassword: string,
  privacyAccepted: boolean,
) {
  const { email, error: emailError } = validateEmail(emailValue);
  const errors: RegistrationFieldErrors = {};

  if (emailError) errors.email = emailError;

  if (!password) {
    errors.password = "Ingresa una contraseña.";
  } else if (!isPasswordValid(password)) {
    errors.password = "La contraseña todavía no cumple todos los requisitos.";
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Las contraseñas no coinciden.";
  }

  if (!privacyAccepted) {
    errors.privacyAccepted = "Debes aceptar el Aviso de Privacidad para crear tu cuenta.";
  }

  return { email, errors };
}
