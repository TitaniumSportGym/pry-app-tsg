import { useAuth } from '@/hooks/use-auth';

export function useAdminHomeViewModel() {
  const { user } = useAuth();

  return { email: user?.email ?? '' };
}
