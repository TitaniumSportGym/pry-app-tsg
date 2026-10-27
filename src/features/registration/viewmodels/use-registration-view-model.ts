import { router } from "expo-router";
import { useState } from "react";

import { getRegistrationErrorMessage } from "@/features/registration/models/registration-errors";
import {
  type RegistrationFieldErrors,
  validateRegistration,
} from "@/features/registration/models/registration-model";
import { registerMobile } from "@/services/authService";

export function useRegistrationViewModel() {
  const [email, setEmailValue] = useState("");
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPasswordValue] = useState("");
  const [fieldErrors, setFieldErrors] = useState<RegistrationFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setEmail(value: string) {
    setEmailValue(value);
    setFieldErrors((current) => ({ ...current, email: undefined }));
  }

  function setPassword(value: string) {
    setPasswordValue(value);
    setFieldErrors((current) => ({ ...current, password: undefined }));
  }

  function setConfirmPassword(value: string) {
    setConfirmPasswordValue(value);
    setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
  }

  async function submit() {
    const { email: normalizedEmail, errors } = validateRegistration(
      email,
      password,
      confirmPassword,
    );
    setFieldErrors(errors);
    setFormError(null);

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await registerMobile(normalizedEmail, password);
      router.push({
        pathname: "/verify-account",
        params: { email: normalizedEmail },
      });
    } catch (error) {
      setFormError(
        getRegistrationErrorMessage(
          error,
          "No fue posible crear la cuenta. Revisa tu conexión e inténtalo de nuevo.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    email,
    password,
    confirmPassword,
    fieldErrors,
    formError,
    isSubmitting,
    setEmail,
    setPassword,
    setConfirmPassword,
    submit,
  };
}
