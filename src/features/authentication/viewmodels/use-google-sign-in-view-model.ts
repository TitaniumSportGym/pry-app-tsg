import { router } from 'expo-router';
import { useState } from "react";

import { GoogleAuthError } from "@/features/authentication/models/google-auth-callback";
import {
  getRoleHome,
  UnsupportedRoleError,
} from "@/features/authorization/models/user-role";
import { useAuth } from "@/hooks/use-auth";

export function useGoogleSignInViewModel() {
  const { signInWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const role = await signInWithGoogle();
      if (role) router.replace(getRoleHome(role));
    } catch (authError) {
      setError(
        authError instanceof GoogleAuthError ||
          authError instanceof UnsupportedRoleError
          ? authError.message
          : "No fue posible iniciar sesión con Google. Inténtalo de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return { error, isSubmitting, submit };
}
