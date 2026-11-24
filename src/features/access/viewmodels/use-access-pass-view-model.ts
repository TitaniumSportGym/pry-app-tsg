import { router, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createAccessPass } from '@/features/access/api/access-api';
import { getPassProblem } from '@/features/access/models/access-errors';
import { formatAccessMoment, formatDateOnly } from '@/features/access/models/access-format';
import {
  formatCountdown,
  getLocalExpiry,
  getSecondsLeft,
  type AccessPass,
} from '@/features/access/models/access-pass';
import { ACCESS_KEYS, accessRepository } from '@/features/access/repositories/access-repository';
import { getInitials, getMemberId } from '@/features/home/models/home';
import {
  MEMBERSHIP_KEYS,
  membershipsRepository,
} from '@/features/memberships/repositories/memberships-repository';
import { useAppActive } from '@/hooks/use-app-active';
import { useAuth } from '@/hooks/use-auth';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';

/**
 * Renovaciones automáticas seguidas antes de pedir un toque: evita generar códigos sin
 * fin si el teléfono se queda con la pantalla abierta (el backend permite 6 por minuto).
 */
const MAX_AUTO_RENEWALS = 10;

type PassState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; pass: AccessPass }
  | { kind: 'expired' }
  | { kind: 'membership' }
  | { kind: 'error'; message: string; retryAt: number };

export type AccessPassStatus = 'loading' | 'ready' | 'expired' | 'unavailable' | 'error';

/**
 * Pantallas 41–42 · Mi acceso.
 * El token del QR vive solo en el estado de esta pantalla: se pide al abrirla, se borra al
 * salir de ella o al mandar la app a segundo plano, y nunca se guarda ni se registra.
 */
export function useAccessPassViewModel() {
  const { status, user } = useAuth();
  const isAuthenticated = status === 'authenticated';
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const visible = isAuthenticated && isFocused && appActive;

  const [state, setState] = useState<PassState>({ kind: 'idle' });
  const [now, setNow] = useState(() => Date.now());
  const requestId = useRef(0);
  const autoRenewals = useRef(0);

  const loadSubscription = useCallback(
    async (options: LoadOptions) =>
      isAuthenticated ? membershipsRepository.getMySubscription(options) : null,
    [isAuthenticated],
  );
  const subscription = useAuthorizedResource(loadSubscription, {
    reloadOn: [MEMBERSHIP_KEYS.subscription],
  });

  const loadLastAccess = useCallback(
    async (options: LoadOptions) =>
      isAuthenticated ? ((await accessRepository.getMyHistory(1, options)).entries[0] ?? null) : null,
    [isAuthenticated],
  );
  const lastAccess = useAuthorizedResource(loadLastAccess, { reloadOn: [ACCESS_KEYS.mine] });

  /** Pide un pase nuevo; quien la llama decide si antes muestra el estado de carga. */
  const requestPass = useCallback(() => {
    const id = ++requestId.current;

    // El estado solo cambia cuando llega la respuesta, y solo para la solicitud más reciente.
    createAccessPass().then(
      (pass) => {
        if (id !== requestId.current) return;
        const receivedAt = Date.now();
        setNow(receivedAt);
        setState({
          kind: 'ready',
          pass: { ...pass, expiresAt: getLocalExpiry(pass.expiresAt, receivedAt) },
        });
      },
      (error: unknown) => {
        if (id !== requestId.current) return;
        const problem = getPassProblem(error);
        if (problem.kind === 'membership') {
          setState({ kind: 'membership' });
        } else {
          const waitMs = problem.kind === 'rate-limited' ? problem.retryAfterSeconds * 1000 : 0;
          setState({ kind: 'error', message: problem.message, retryAt: Date.now() + waitMs });
        }
      },
    );
  }, []);

  // Se pide un pase al mostrarse la pantalla. Al ocultarse (otra pantalla, segundo plano,
  // cierre de sesión) el token se descarta y se ignora cualquier respuesta en camino.
  useEffect(() => {
    if (!visible) return;
    autoRenewals.current = 0;
    requestPass();
    return () => {
      requestId.current += 1;
      setState({ kind: 'idle' });
    };
  }, [visible, requestPass]);

  const readyPass = state.kind === 'ready' ? state.pass : null;
  const waitingRetry = state.kind === 'error' && state.retryAt > now;

  // Cuenta regresiva del pase. Al caducar se pide otro código; tras varias renovaciones
  // seguidas se espera un toque del socio.
  useEffect(() => {
    if (!visible || !readyPass) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (getSecondsLeft(readyPass.expiresAt, current) > 0) return;

      clearInterval(timer);
      if (autoRenewals.current >= MAX_AUTO_RENEWALS) {
        requestId.current += 1;
        setState({ kind: 'expired' });
        return;
      }
      autoRenewals.current += 1;
      setState({ kind: 'loading' });
      requestPass();
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, readyPass, requestPass]);

  // Cuenta regresiva de la espera tras un límite de solicitudes (429).
  useEffect(() => {
    if (!visible || !waitingRetry) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible, waitingRetry]);

  const secondsLeft = readyPass ? getSecondsLeft(readyPass.expiresAt, now) : 0;

  const memberId = getMemberId(user?.email);
  const endsAt = readyPass?.subscription?.endsAt ?? subscription.data?.endsAt ?? null;
  const viewStatus: AccessPassStatus =
    state.kind === 'ready'
      ? 'ready'
      : state.kind === 'expired'
        ? 'expired'
        : state.kind === 'membership'
          ? 'unavailable'
          : state.kind === 'error'
            ? 'error'
            : 'loading';
  const retryInSeconds =
    state.kind === 'error' ? Math.max(0, Math.ceil((state.retryAt - now) / 1000)) : 0;

  return {
    isAuthenticated,
    status: viewStatus,
    /** Contenido del QR; solo existe mientras el pase está vigente y la pantalla visible. */
    qrValue: readyPass?.token ?? null,
    countdown: formatCountdown(secondsLeft),
    memberName: memberId ? `Socio ${memberId}` : 'Socio Titanium',
    memberDetail: user?.email ?? '',
    initials: getInitials(memberId),
    planName: subscription.data?.planName ?? 'Membresía',
    validUntil: endsAt ? formatDateOnly(endsAt) : '—',
    lastAccess: lastAccess.data ? formatAccessMoment(lastAccess.data.scannedAt, new Date(now)) : null,
    errorMessage: state.kind === 'error' ? state.message : null,
    retryInSeconds,
    retry() {
      if (retryInSeconds > 0) return;
      autoRenewals.current = 0;
      setState({ kind: 'loading' });
      requestPass();
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
    openHistory() {
      router.push('/account/access/history');
    },
    openMemberships() {
      router.push('/memberships');
    },
    openLogin() {
      router.push('/login');
    },
  };
}
