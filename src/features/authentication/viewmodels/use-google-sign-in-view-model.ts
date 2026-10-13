import { router } from 'expo-router';
import { useState } from "react";

import { GoogleAuthError } from "@/features/authentication/models/google-auth-callback";
import { useAuth } from "@/hooks/use-auth";

export function useGoogleSignInViewModel() {
  const { signInWithGoogle } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    try {
      const authenticated = await signInWithGoogle();
      if (authenticated) router.replace('/');
    } catch (authError) {
      setError(
        authError instanceof GoogleAuthError
          ? authError.message
          : "No fue posible iniciar sesión con Google. Inténtalo de nuevo.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return { error, isSubmitting, submit };
}
