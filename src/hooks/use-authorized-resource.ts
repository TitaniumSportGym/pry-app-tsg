import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { shouldInvalidateSession } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

/**
 * Loads data from a protected endpoint.
 * When the server rejects the session, the local session is closed too;
 * a plain 403 (missing permission) keeps the user signed in.
 */
export function useAuthorizedResource<T>(load: () => Promise<T>) {
  const { signOut } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestId = useRef(0);

  // State is only updated once the request settles, and only for the latest request.
  const track = useCallback(
    (request: Promise<T>) => {
      const currentRequest = ++requestId.current;
      const isCurrent = () => currentRequest === requestId.current;

      request
        .then(
          (result) => {
            if (!isCurrent()) return;
            setData(result);
            setError(null);
          },
          async (loadError: unknown) => {
            if (!isCurrent()) return;
            setError(loadError);

            if (
              loadError instanceof ApiError &&
              shouldInvalidateSession(loadError.status, loadError.data)
            ) {
              await signOut();
            }
          },
        )
        .finally(() => {
          if (!isCurrent()) return;
          setIsLoading(false);
          setIsRefreshing(false);
        });
    },
    [signOut],
  );

  useEffect(() => {
    track(load());

    return () => {
      // Ignore responses that arrive after the screen is gone.
      requestId.current += 1;
    };
  }, [load, track]);

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    retry() {
      setError(null);
      setIsLoading(true);
      track(load());
    },
    refresh() {
      setIsRefreshing(true);
      track(load());
    },
  };
}
