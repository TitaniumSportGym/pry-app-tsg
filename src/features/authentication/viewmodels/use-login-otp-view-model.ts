import { router } from "expo-router";
import { useState } from "react";

import { normalizeOtp } from "@/features/authentication/models/auth-validation";
import {
  getRoleHome,
  UnsupportedRoleError,
} from "@/features/authorization/models/user-role";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/types/auth";

export function useLoginOtpViewModel(email?: string) {
  const { confirmOtp } = useAuth();
  const [otp, setOtpValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setOtp(value: string) {
    setOtpValue(normalizeOtp(value, 8));
    setError(null);
  }

  async function submit() {
    if (!email || !otp) {
      setError("Ingresa el código de verificación.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const outcome = await confirmOtp(email, otp);
      if (outcome.status === "authenticated") {
        router.replace(getRoleHome(outcome.role));
      }
    } catch (verificationError) {
      setError(
        verificationError instanceof ApiError ||
          verificationError instanceof UnsupportedRoleError
          ? verificationError.message
          : "No fue posible verificar el código. Inténtalo de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function goBack() {
    router.back();
  }

  return { otp, error, isSubmitting, setOtp, submit, goBack };
}
