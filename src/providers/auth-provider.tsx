import { createContext, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  restoreSession,
  verifyOtp as verifyOtpRequest,
} from '@/services/authService';
import type { LoginResponse, UserProfileResponse, UserSession } from '@/types/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: UserProfileResponse | UserSession | null;
  signIn: (email: string, password: string) => Promise<LoginResponse>;
  confirmOtp: (email: string, otp: string) => Promise<LoginResponse>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserProfileResponse | UserSession | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initializeSession() {
      try {
        const result = await restoreSession();

        if (!isMounted) {
          return;
        }

        if (result.authenticated && result.user) {
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

  const completeAuthentication = useCallback(async (response: LoginResponse) => {
    if (response.twoFactorRequired) {
      return response;
    }

    if (!response.accessToken) {
      throw new Error('El servidor no devolvió una sesión válida.');
    }

    const authenticatedUser = response.user ?? (await getCurrentUser());
    setUser(authenticatedUser);
    setStatus('authenticated');

    return response;
  }, []);

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

  const signOut = useCallback(async () => {
    setUser(null);
    setStatus('unauthenticated');

    try {
      await logoutRequest();
    } catch {
      // The local auth state must stay closed even if secure cleanup fails.
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, confirmOtp, signOut }),
    [confirmOtp, signIn, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
