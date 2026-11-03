import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';

export function useAdminHomeViewModel() {
  const { user } = useAuth();

  return {
    email: user?.email ?? '',
    openScanner: () => router.push('/admin/scan'),
  };
}
