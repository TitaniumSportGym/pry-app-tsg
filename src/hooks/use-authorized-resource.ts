import { useCallback, useEffect, useRef, useState } from 'react';

import { repositoryCache } from '@/core/repository/repository-cache';
import { useAuth } from '@/hooks/use-auth';
import { shouldInvalidateSession } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

export interface LoadOptions {
  /** True on retry and pull to refresh: repositories skip their cached copy. */
  force: boolean;
}

interface ResourceOptions {
  /**
   * Repository cache keys this screen depends on (e.g. ['payments']). When any
   * of them is invalidated the data reloads by itself (Observer).
   */
  reloadOn?: readonly string[];
}

function matchesPrefix(keys: readonly string[], invalidatedPrefix: string) {
  return keys.some((key) => key.startsWith(invalidatedPrefix) || invalidatedPrefix.startsWith(key));
}

/**
 * Loads data from a protected endpoint.
 * When the server rejects the session, the local session is closed too;
 * a plain 403 (missing permission) keeps the user signed in.
 */
export function useAuthorizedResource<T>(
  load: (options: LoadOptions) => Promise<T>,
  { reloadOn }: ResourceOptions = {},
) {
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
    track(load({ force: false }));

    return () => {
      // Ignore responses that arrive after the screen is gone.
      requestId.current += 1;
    };
  }, [load, track]);

  // A stable string so callers can pass an inline array.
  const reloadKey = reloadOn?.join('|') ?? '';

  useEffect(() => {
    if (!reloadKey) return;
    const keys = reloadKey.split('|');

    // Only invalidations trigger a reload: a full clear happens on sign-out,
    // when there is no session left to ask the server with.
    return repositoryCache.subscribe((event) => {
      if (event.type === 'invalidated' && matchesPrefix(keys, event.prefix)) {
        track(load({ force: false }));
      }
    });
  }, [load, reloadKey, track]);

  return {
    data,
    error,
    isLoading,
    isRefreshing,
    retry() {
      setError(null);
      setIsLoading(true);
      track(load({ force: true }));
    },
    refresh() {
      setIsRefreshing(true);
      track(load({ force: true }));
    },
  };
}
