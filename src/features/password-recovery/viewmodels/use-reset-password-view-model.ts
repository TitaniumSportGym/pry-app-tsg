import { router } from "expo-router";
import { useState } from "react";

import { resetPassword } from "@/features/password-recovery/api/password-recovery-api";
import { usePasswordRecovery } from "@/features/password-recovery/models/password-recovery-context";
import { getPasswordRecoveryError } from "@/features/password-recovery/models/password-recovery-errors";
import {
  type ResetPasswordFieldErrors,
  validateNewPassword,
} from "@/features/password-recovery/models/reset-password-model";

export function useResetPasswordViewModel() {
  const { email, otp, clearRecovery } = usePasswordRecovery();
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPasswordValue] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setPassword(value: string) {
    setPasswordValue(value);
    setFieldErrors((current) => ({ ...current, password: undefined }));
    setFormError(null);
  }

  function setConfirmPassword(value: string) {
    setConfirmPasswordValue(value);
    setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
    setFormError(null);
  }

  async function submit() {
    if (!email || !otp) {
      setFormError(
        "La sesión de recuperación ya no está disponible. Solicita otro código.",
      );
      return;
    }

    const errors = validateNewPassword(password, confirmPassword);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await resetPassword({ email, otp, newPassword: password });
      clearRecovery();
      router.replace({ pathname: "/login", params: { passwordReset: "1" } });
    } catch (error) {
      setFormError(
        getPasswordRecoveryError(
          error,
          "No fue posible cambiar la contraseña. Solicita un código nuevo e inténtalo otra vez.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function restart() {
    router.replace("/forgot-password");
  }

  return {
    hasRecoveryData: Boolean(email && otp),
    password,
    confirmPassword,
    fieldErrors,
    formError,
    isSubmitting,
    setPassword,
    setConfirmPassword,
    submit,
    restart,
  };
}
