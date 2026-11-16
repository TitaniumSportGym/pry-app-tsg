import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { getOrderPaymentStatus } from '@/features/memberships/api/checkout-api';
import type { OrderPaymentStatus } from '@/features/memberships/models/payment-status';
import { useAppActive } from '@/hooks/use-app-active';
import { isUuid } from '@/utils/uuid';

/** El webhook de Mercado Pago suele tardar unos segundos; se consulta cada 3 s hasta ~1 min. */
export const PAYMENT_POLL_INTERVAL_MS = 3_000;
export const PAYMENT_MAX_ATTEMPTS = 20;
const MAX_CONSECUTIVE_ERRORS = 3;

type PollState = 'verifying' | 'still-pending' | 'rejected' | 'error' | 'approved';
export type PaymentResultStatus = PollState | 'invalid';

/**
 * Consulta GET /api/orders/:id/payment-status hasta que el servidor confirme o rechace el pago.
 * Solo el servidor (alimentado por el webhook) decide: el parámetro con el que Mercado Pago
 * regrese a la app nunca se toma en cuenta. Se pausa con la app en segundo plano o la
 * pantalla oculta, porque en Android el navegador de pago no bloquea la app.
 */
export function useOrderPaymentPolling(orderId: string | undefined, onApproved?: () => void) {
  const validOrder = isUuid(orderId) ? orderId : null;
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const canPoll = Boolean(validOrder) && isFocused && appActive;

  const [state, setState] = useState<PollState>('verifying');
  const [order, setOrder] = useState<OrderPaymentStatus | null>(null);
  const [round, setRound] = useState(0);
  const attempts = useRef(0);
  const errors = useRef(0);
  const approvedCallback = useRef(onApproved);

  useEffect(() => {
    approvedCallback.current = onApproved;
  }, [onApproved]);

  useEffect(() => {
    if (!canPoll || state !== 'verifying' || !validOrder) return;

    let cancelled = false;
    const check = async () => {
      try {
        const status = await getOrderPaymentStatus(validOrder);
        if (cancelled) return;
        errors.current = 0;
        setOrder(status);
        if (status.outcome === 'approved') {
          setState('approved');
          approvedCallback.current?.();
          return;
        }
        if (status.outcome === 'rejected') {
          setState('rejected');
          return;
        }
      } catch {
        if (cancelled) return;
        errors.current += 1;
        if (errors.current >= MAX_CONSECUTIVE_ERRORS) {
          setState('error');
          return;
        }
      }
      attempts.current += 1;
      if (attempts.current >= PAYMENT_MAX_ATTEMPTS) {
        setState('still-pending');
        return;
      }
      setRound((value) => value + 1);
    };

    const timer = setTimeout(check, attempts.current === 0 ? 0 : PAYMENT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canPoll, state, validOrder, round]);

  return {
    status: (validOrder ? state : 'invalid') as PaymentResultStatus,
    order,
    orderId: validOrder,
    checkAgain() {
      attempts.current = 0;
      errors.current = 0;
      setState('verifying');
      setRound((value) => value + 1);
    },
  };
}
