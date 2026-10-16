import { validateEmail } from "@/features/authentication/models/auth-validation";
import { UnsupportedRoleError } from "@/features/authorization/models/user-role";
import { ApiError } from "@/types/auth";

export interface LoginFieldErrors {
  email?: string;
  password?: string;
}

export function validateLogin(emailValue: string, password: string) {
  const { email, error: emailError } = validateEmail(emailValue);
  const errors: LoginFieldErrors = {};

  if (emailError) {
    errors.email = emailError;
  }

  if (!password) {
    errors.password = "Ingresa tu contraseña.";
  }

  return { email, errors };
}

export function getLoginErrorMessage(error: unknown) {
  if (error instanceof UnsupportedRoleError) {
    return error.message;
  }

  if (error instanceof ApiError) {
    return error.status === 401
      ? "Correo o contraseña incorrectos."
      : error.message;
  }

  return "No fue posible iniciar sesión. Revisa tu conexión e inténtalo de nuevo.";
}
