import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';

export function useHomeViewModel() {
  const { status, user } = useAuth();
  const isAuthenticated = status === 'authenticated';

  return {
    isAuthenticated,
    displayName: user?.email?.split('@')[0] ?? 'invitado',
    openPrimaryAction() {
      router.push(isAuthenticated ? '/account' : '/login');
    },
    openRegister() {
      router.push('/register');
    },
  };
}
