import { router } from "expo-router";
import { useEffect, useState } from "react";

import {
  isValidOtp,
  normalizeOtp,
} from "@/features/authentication/models/auth-validation";
import {
  requestPasswordReset,
  verifyPasswordResetCode,
} from "@/features/password-recovery/api/password-recovery-api";
import { usePasswordRecovery } from "@/features/password-recovery/models/password-recovery-context";
import { getPasswordRecoveryError } from "@/features/password-recovery/models/password-recovery-errors";
import { ApiError } from "@/types/auth";

const RESEND_COOLDOWN_SECONDS = 30;

export function useVerifyResetCodeViewModel() {
  const { email, confirmCode } = usePasswordRecovery();
  const [otp, setOtpValue] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);

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
    if (!email) {
      setFormError(
        "Inicia nuevamente la recuperación para solicitar otro código.",
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
      await verifyPasswordResetCode(email, otp);
      confirmCode(otp);
      router.push("/reset-password");
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 400 || error.status === 401)
      ) {
        setFieldError("El código es inválido o ya expiró.");
      } else {
        setFormError(
          getPasswordRecoveryError(
            error,
            "No fue posible verificar el código. Revisa tu conexión e inténtalo de nuevo.",
          ),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend() {
    if (!email || cooldown > 0) return;

    clearMessages();
    setIsResending(true);
    try {
      await requestPasswordReset(email);
      setOtpValue("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStatusMessage(
        "Si el correo está registrado, enviamos un nuevo código.",
      );
    } catch (error) {
      setFormError(
        getPasswordRecoveryError(
          error,
          "No fue posible reenviar el código. Espera un momento e inténtalo de nuevo.",
        ),
      );
    } finally {
      setIsResending(false);
    }
  }

  function restart() {
    router.replace("/forgot-password");
  }

  return {
    email,
    otp,
    fieldError,
    formError,
    statusMessage,
    cooldown,
    isSubmitting,
    isResending,
    setOtp,
    verify,
    resend,
    restart,
  };
}
