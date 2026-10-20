import { router } from 'expo-router';
import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';

export function useAccountViewModel() {
  const { status, user, role, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function logout() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace('/');
    } finally {
      setIsSigningOut(false);
    }
  }

  return {
    isAuthenticated: status === 'authenticated',
    email: user?.email ?? '',
    isSigningOut,
    // Clients reach memberships from the Servicios tab; trainers have no such tab.
    showMembershipsLink: role === 'entrenador',
    openMemberships() {
      router.push('/trainer/account/memberships');
    },
    openLogin() {
      router.push('/login');
    },
    openRegister() {
      router.push('/register');
    },
    logout,
  };
}
