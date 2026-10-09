import { useState } from "react";

import { useAuth } from "@/hooks/use-auth";

export function useHomeViewModel() {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function logout() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  return { email: user?.email ?? "Usuario", isSigningOut, logout };
}
