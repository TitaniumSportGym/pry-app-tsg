import { router } from "expo-router";
import { useState } from "react";

import { validateEmail } from "@/features/authentication/models/auth-validation";
import { requestPasswordReset } from "@/features/password-recovery/api/password-recovery-api";
import { usePasswordRecovery } from "@/features/password-recovery/models/password-recovery-context";
import { getPasswordRecoveryError } from "@/features/password-recovery/models/password-recovery-errors";

export function useRequestResetViewModel() {
  const { beginRecovery } = usePasswordRecovery();
  const [email, setEmailValue] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setEmail(value: string) {
    setEmailValue(value);
    setFieldError(undefined);
    setFormError(null);
  }

  async function submit() {
    const { email: normalizedEmail, error } = validateEmail(email);
    if (error) {
      setFieldError(error);
      return;
    }

    setFieldError(undefined);
    setFormError(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(normalizedEmail);
      beginRecovery(normalizedEmail);
      router.push("/verify-reset-code");
    } catch (requestError) {
      setFormError(
        getPasswordRecoveryError(
          requestError,
          "No fue posible procesar la solicitud. Revisa tu conexión e inténtalo de nuevo.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return { email, fieldError, formError, isSubmitting, setEmail, submit };
}
