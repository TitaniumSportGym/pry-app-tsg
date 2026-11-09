import { router, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { createAccessPass } from '@/features/access/api/access-api';
import { formatDateOnly } from '@/features/access/models/access-format';
import { ACCESS_PASS_TTL_MS } from '@/features/access/models/access-pass';
import { formatMoney } from '@/features/admin/models/admin-format';
import { getOrderPaymentStatus } from '@/features/memberships/api/checkout-api';
import { isValidOrderId } from '@/features/memberships/models/checkout';
import type { OrderPaymentStatus } from '@/features/memberships/models/payment-status';
import type { ActiveSubscription } from '@/features/memberships/models/subscription';
import { membershipsRepository } from '@/features/memberships/repositories/memberships-repository';
import { paymentsRepository } from '@/features/payments/repositories/payments-repository';
import { routinesRepository } from '@/features/training/repositories/routines-repository';
import { useAppActive } from '@/hooks/use-app-active';

/** El webhook de Mercado Pago suele tardar unos segundos; se consulta cada 3 s hasta ~1 min. */
export const PAYMENT_POLL_INTERVAL_MS = 3_000;
export const PAYMENT_MAX_ATTEMPTS = 20;
const MAX_CONSECUTIVE_ERRORS = 3;

type ResultState =
  | { kind: 'verifying' }
  | { kind: 'still-pending' }
  | { kind: 'rejected' }
  | { kind: 'error' }
  | { kind: 'approved' };

export type PaymentResultStatus = ResultState['kind'] | 'invalid';

/**
 * Pantallas 33 y 40 · Verificando pago → Membresía activada.
 * El pago solo se da por aprobado cuando el servidor lo confirma; el parámetro con el que
 * Mercado Pago o un enlace regresen a la app nunca se toma en cuenta.
 */
export function useMembershipPaymentResultViewModel(orderId: string | undefined) {
  const validOrder = isValidOrderId(orderId) ? orderId : null;
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const canPoll = Boolean(validOrder) && isFocused && appActive;

  const [state, setState] = useState<ResultState>({ kind: 'verifying' });
  const [order, setOrder] = useState<OrderPaymentStatus | null>(null);
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const attempts = useRef(0);
  const errors = useRef(0);

  // Ya aprobado: se recargan las pantallas que dependen del pago y se prepara el acceso.
  const completePurchase = useCallback(async () => {
    paymentsRepository.invalidate();
    routinesRepository.invalidate();
    membershipsRepository.invalidateSubscription();
    try {
      setSubscription(await membershipsRepository.getMySubscription({ force: true }));
    } catch {
      // Los datos del plan son informativos; el pago ya está confirmado.
    }
    try {
      setQrValue((await createAccessPass()).token);
    } catch {
      // La activación puede tardar (o el plan grupal espera integrantes): "Mi acceso" lo explica.
    }
  }, []);

  useEffect(() => {
    if (!canPoll || state.kind !== 'verifying' || !validOrder) return;

    let cancelled = false;
    const check = async () => {
      try {
        const status = await getOrderPaymentStatus(validOrder);
        if (cancelled) return;
        errors.current = 0;
        setOrder(status);
        if (status.outcome === 'approved') {
          setState({ kind: 'approved' });
          void completePurchase();
          return;
        }
        if (status.outcome === 'rejected') {
          setState({ kind: 'rejected' });
          return;
        }
      } catch {
        if (cancelled) return;
        errors.current += 1;
        if (errors.current >= MAX_CONSECUTIVE_ERRORS) {
          setState({ kind: 'error' });
          return;
        }
      }
      attempts.current += 1;
      if (attempts.current >= PAYMENT_MAX_ATTEMPTS) {
        setState({ kind: 'still-pending' });
        return;
      }
      setRound((value) => value + 1);
    };

    const timer = setTimeout(check, attempts.current === 0 ? 0 : PAYMENT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canPoll, state.kind, validOrder, round, completePurchase]);

  // La vista previa del pase se descarta al caducar o al dejar de verse la pantalla.
  useEffect(() => {
    if (!qrValue || !isFocused || !appActive) return;
    const timer = setTimeout(() => setQrValue(null), ACCESS_PASS_TTL_MS);
    return () => {
      clearTimeout(timer);
      setQrValue(null);
    };
  }, [qrValue, isFocused, appActive]);

  const plan = subscription
    ? {
        name: subscription.planName,
        validity:
          subscription.startsAt && subscription.endsAt
            ? `Vigente del ${formatDateOnly(subscription.startsAt)} al ${formatDateOnly(subscription.endsAt)}`
            : subscription.endsAt
              ? `Vigente hasta ${formatDateOnly(subscription.endsAt)}`
              : 'Membresía vigente',
        amount: subscription.amount !== null ? formatMoney(subscription.amount) : null,
      }
    : null;

  return {
    status: (validOrder ? state.kind : 'invalid') as PaymentResultStatus,
    orderLabel: order?.orderNumber ?? null,
    orderTotal: order?.total !== null && order?.total !== undefined ? formatMoney(order.total) : null,
    plan,
    /** Vista previa del QR (solo en memoria); null si el acceso aún no está disponible. */
    qrValue,
    checkAgain() {
      attempts.current = 0;
      errors.current = 0;
      setState({ kind: 'verifying' });
      setRound((value) => value + 1);
    },
    openAccess() {
      router.replace('/account/access');
    },
    openPayments() {
      router.replace('/account/payments');
    },
    openMemberships() {
      router.replace('/memberships');
    },
    goHome() {
      router.replace('/');
    },
  };
}
