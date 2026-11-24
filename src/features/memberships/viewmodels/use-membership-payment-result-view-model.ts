import { router, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { createAccessPass } from '@/features/access/api/access-api';
import { formatDateOnly } from '@/features/access/models/access-format';
import { ACCESS_PASS_TTL_MS } from '@/features/access/models/access-pass';
import { formatMoney } from '@/features/admin/models/admin-format';
import type { ActiveSubscription } from '@/features/memberships/models/subscription';
import { membershipsRepository } from '@/features/memberships/repositories/memberships-repository';
import { paymentsRepository } from '@/features/payments/repositories/payments-repository';
import { useOrderPaymentPolling } from '@/features/payments/viewmodels/use-order-payment-polling';
import { routinesRepository } from '@/features/training/repositories/routines-repository';
import { useAppActive } from '@/hooks/use-app-active';

export {
  PAYMENT_MAX_ATTEMPTS,
  PAYMENT_POLL_INTERVAL_MS,
  type PaymentResultStatus,
} from '@/features/payments/viewmodels/use-order-payment-polling';

/**
 * Pantallas 33 y 40 · Verificando pago → Membresía activada.
 * El pago solo se da por aprobado cuando el servidor lo confirma; el parámetro con el que
 * Mercado Pago o un enlace regresen a la app nunca se toma en cuenta.
 */
export function useMembershipPaymentResultViewModel(orderId: string | undefined) {
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);

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

  const polling = useOrderPaymentPolling(
    orderId,
    useCallback(() => void completePurchase(), [completePurchase]),
  );

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

  const { order } = polling;

  return {
    status: polling.status,
    orderLabel: order?.orderNumber ?? null,
    orderTotal: order?.total !== null && order?.total !== undefined ? formatMoney(order.total) : null,
    plan,
    /** Vista previa del QR (solo en memoria); null si el acceso aún no está disponible. */
    qrValue,
    checkAgain: polling.checkAgain,
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
