import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { sessionEvents } from '@/core/observer/session-events';
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  restoreSession,
  verifyOtp as verifyOtpRequest,
} from '@/services/authService';
import { openGoogleAuthSession } from '@/features/authentication/data/google-auth-gateway';
import {
  parseUserRole,
  UnsupportedRoleError,
  type UserRole,
} from '@/features/authorization/models/user-role';
import { removeAccessToken, saveAccessToken } from '@/services/sessionService';
import type { LoginResponse, UserProfileResponse, UserSession } from '@/types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthenticatedUser = UserProfileResponse | UserSession;

export type AuthOutcome =
  | { status: 'two-factor-required' }
  | { status: 'authenticated'; role: UserRole };

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthenticatedUser | null;
  role: UserRole | null;
  signIn: (email: string, password: string) => Promise<AuthOutcome>;
  confirmOtp: (email: string, otp: string) => Promise<AuthOutcome>;
  /** Resolves with the user's role, or null when the user cancels Google. */
  signInWithGoogle: () => Promise<UserRole | null>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      try {
        const result = await restoreSession();

        if (!isMounted) {
          return;
        }

        if (result.authenticated && result.user) {
          if (!parseUserRole(result.user.rol)) {
            await revokeSession();

            if (isMounted) {
              setUser(null);
              setStatus('unauthenticated');
            }
            return;
          }

          setUser(result.user);
          setStatus('authenticated');
          return;
        }

        setUser(null);
        setStatus('unauthenticated');
      } catch {
        if (isMounted) {
          setUser(null);
          setStatus('unauthenticated');
        }
      }
    }

    void initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // The role always comes from the server response, never from local storage.
  const acceptUser = useCallback(async (authenticatedUser: AuthenticatedUser) => {
    const role = parseUserRole(authenticatedUser.rol);

    if (!role) {
      await revokeSession();
      throw new UnsupportedRoleError();
    }

    setUser(authenticatedUser);
    setStatus('authenticated');
    sessionEvents.notify({ type: 'signed-in', userId: authenticatedUser.id });

    return role;
  }, []);

  const completeAuthentication = useCallback(
    async (response: LoginResponse): Promise<AuthOutcome> => {
      if (response.twoFactorRequired) {
        return { status: 'two-factor-required' };
      }

      if (!response.accessToken) {
        throw new Error('El servidor no devolvió una sesión válida.');
      }

      const authenticatedUser = response.user ?? (await getCurrentUser());
      const role = await acceptUser(authenticatedUser);

      return { status: 'authenticated', role };
    },
    [acceptUser],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const response = await loginRequest(email, password);
      return completeAuthentication(response);
    },
    [completeAuthentication],
  );

  const confirmOtp = useCallback(
    async (email: string, otp: string) => {
      const response = await verifyOtpRequest(email, otp);
      return completeAuthentication(response);
    },
    [completeAuthentication],
  );

  const signInWithGoogle = useCallback(async () => {
    const accessToken = await openGoogleAuthSession();

    if (!accessToken) {
      return null;
    }

    let authenticatedUser: UserProfileResponse;

    try {
      await saveAccessToken(accessToken);
      authenticatedUser = await getCurrentUser();
    } catch (error) {
      await removeAccessToken();
      throw error;
    }

    return acceptUser(authenticatedUser);
  }, [acceptUser]);

  const signOut = useCallback(async () => {
    setUser(null);
    setStatus('unauthenticated');
    sessionEvents.notify({ type: 'signed-out' });

    try {
      await logoutRequest();
    } catch {
      // The local auth state must stay closed even if secure cleanup fails.
    }
  }, []);

  const role = status === 'authenticated' ? parseUserRole(user?.rol) : null;

  const value = useMemo(
    () => ({ status, user, role, signIn, confirmOtp, signInWithGoogle, signOut }),
    [confirmOtp, role, signIn, signInWithGoogle, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Closes the session on the server and removes the stored token. */
async function revokeSession() {
  sessionEvents.notify({ type: 'signed-out' });

  try {
    await logoutRequest();
  } catch {
    // logout already removes the local token; storage failures leave nothing more to do.
  }
}
