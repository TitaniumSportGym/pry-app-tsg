import { router } from "expo-router";
import { useState } from "react";

import {
  isValidOtp,
  normalizeOtp,
} from "@/features/authentication/models/auth-validation";
import { getRegistrationErrorMessage } from "@/features/registration/models/registration-errors";
import {
  resendVerificationOtp,
  verifyAccountOtp,
} from "@/services/authService";
import { ApiError } from "@/types/auth";

export function useAccountVerificationViewModel(email?: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  const [otp, setOtpValue] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  function clearMessages() {
    setFieldError(undefined);
    setFormError(null);
    setStatusMessage(null);
  }

  function setOtp(value: string) {
    setOtpValue(normalizeOtp(value));
    clearMessages();
  }

  async function verify() {
    if (!normalizedEmail) {
      setFormError(
        "No encontramos el correo que se debe verificar. Vuelve al registro.",
      );
      return;
    }
    if (!isValidOtp(otp)) {
      setFieldError("Ingresa el código de 6 dígitos que recibiste por correo.");
      return;
    }

    clearMessages();
    setIsSubmitting(true);
    try {
      await verifyAccountOtp(normalizedEmail, otp);
      router.replace({ pathname: "/login", params: { accountVerified: "1" } });
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 400 || error.status === 401)
      ) {
        setFieldError("El código es inválido o ya expiró.");
      } else {
        setFormError(
          getRegistrationErrorMessage(
            error,
            "No fue posible verificar el correo. Revisa tu conexión e inténtalo de nuevo.",
          ),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend() {
    if (!normalizedEmail) return;

    clearMessages();
    setIsResending(true);
    try {
      const response = await resendVerificationOtp(normalizedEmail);
      setOtpValue("");
      setStatusMessage(
        response.message || "Enviamos un nuevo código a tu correo.",
      );
    } catch (error) {
      setFormError(
        getRegistrationErrorMessage(
          error,
          "No fue posible reenviar el código. Espera un momento e inténtalo de nuevo.",
        ),
      );
    } finally {
      setIsResending(false);
    }
  }

  return {
    email: normalizedEmail,
    otp,
    fieldError,
    formError,
    statusMessage,
    isSubmitting,
    isResending,
    setOtp,
    verify,
    resend,
  };
}
