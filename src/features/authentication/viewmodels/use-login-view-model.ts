import { router } from "expo-router";
import { useState } from "react";

import {
  getLoginErrorMessage,
  type LoginFieldErrors,
  validateLogin,
} from "@/features/authentication/models/login-model";
import { useAuth } from "@/hooks/use-auth";

export function useLoginViewModel() {
  const { signIn } = useAuth();
  const [email, setEmailValue] = useState("");
  const [password, setPasswordValue] = useState("");
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});
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

  async function submit() {
    const { email: normalizedEmail, errors } = validateLogin(email, password);
    setFieldErrors(errors);
    setFormError(null);

    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const response = await signIn(normalizedEmail, password);
      if (response.twoFactorRequired) {
        router.push({
          pathname: "/verify-otp",
          params: { email: normalizedEmail },
        });
        return;
      }

      router.replace('/');
    } catch (error) {
      setFormError(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    email,
    password,
    fieldErrors,
    formError,
    isSubmitting,
    setEmail,
    setPassword,
    submit,
  };
}
