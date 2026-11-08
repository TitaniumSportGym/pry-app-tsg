import { useCallback, useEffect, useRef, useState } from 'react';

import { repositoryCache } from '@/core/repository/repository-cache';
import { useAuth } from '@/hooks/use-auth';
import { shouldInvalidateSession } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

export interface LoadOptions {
  /** True al reintentar y al jalar para actualizar: los repositorios ignoran su copia guardada. */
  force: boolean;
}

interface ResourceOptions {
  /**
   * Claves de la caché de repositorios de las que depende esta pantalla (por
   * ejemplo ['payments']). Cuando se invalida alguna, los datos se recargan
   * solos (Observer).
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
              loadError instanceof ApiError && !loadError.sessionInvalidationHandled &&
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

  // Una cadena estable para que quien llama pueda pasar un arreglo en línea.
  const reloadKey = reloadOn?.join('|') ?? '';

  useEffect(() => {
    if (!reloadKey) return;
    const keys = reloadKey.split('|');

    // Solo las invalidaciones provocan una recarga: la limpieza completa ocurre al
    // cerrar sesión, cuando ya no hay sesión con la cual consultar al servidor.
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
