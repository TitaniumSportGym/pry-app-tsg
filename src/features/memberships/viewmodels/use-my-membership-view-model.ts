import { router } from 'expo-router';

import { formatMoney } from '@/features/admin/models/admin-format';
import { formatDateOnly } from '@/features/access/models/access-format';
import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { formatDaysLeft } from '@/features/memberships/models/subscription';
import {
  getAccessLevelLabel,
  getPlanTypeLabel,
  getSubscriptionState,
  getValidityProgress,
} from '@/features/memberships/models/subscription-detail';
import { MEMBERSHIP_KEYS } from '@/features/memberships/repositories/memberships-repository';
import { myMembershipRepository } from '@/features/memberships/repositories/my-membership-repository';
import { formatPaymentDateTime, getPaymentMethodLabel } from '@/features/payments/models/payment-history';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const SKELETON_DELAY_MS = 300;

/** Más → Mi membresía: la suscripción del cliente, su estado, vigencia, beneficios y pago. */
export function useMyMembershipViewModel() {
  const resource = useAuthorizedResource(myMembershipRepository.getDetail, {
    reloadOn: [MEMBERSHIP_KEYS.subscription],
  });
  const detail = resource.data;
  const now = new Date();
  const state = detail ? getSubscriptionState(detail, now) : null;

  const membership = detail
    ? {
        planName: detail.plan.name.toUpperCase(),
        state: state!,
        validity:
          detail.startsAt && detail.endsAt
            ? `Vigente del ${formatDateOnly(detail.startsAt)} al ${formatDateOnly(detail.endsAt)}`
            : detail.endsAt
              ? `Vigente hasta ${formatDateOnly(detail.endsAt)}`
              : 'Membresía vigente',
        daysLeft: detail.endsAt ? formatDaysLeft(detail.endsAt, now) : null,
        startLabel: detail.startsAt ? formatDateOnly(detail.startsAt) : null,
        endLabel: detail.endsAt ? formatDateOnly(detail.endsAt) : null,
        progress: getValidityProgress(detail, now),
        description: detail.plan.description,
        facts: [
          { label: 'Tipo de plan', value: getPlanTypeLabel(detail.plan) },
          ...(detail.plan.durationDays ? [{ label: 'Duración', value: `${detail.plan.durationDays} días` }] : []),
          { label: 'Nivel de acceso', value: getAccessLevelLabel(detail.plan.accessLevel) },
          { label: 'Renovación automática', value: detail.autoRenew ? 'Activada' : 'No' },
        ],
        benefits: detail.plan.benefits,
        payment: detail.payment
          ? {
              amount: detail.payment.amount !== null ? formatMoney(detail.payment.amount) : null,
              method: getPaymentMethodLabel(detail.payment.method),
              paidAt: detail.payment.paidAt ? formatPaymentDateTime(detail.payment.paidAt) : null,
              folio: detail.payment.receiptFolio,
              orderNumber: detail.payment.orderNumber,
            }
          : null,
        /** Por vencer: la acción principal es renovar; si no, abrir el acceso QR. */
        primaryAction: state?.tone === 'expiring' ? ('renew' as const) : ('access' as const),
      }
    : null;

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No encontramos tu membresía.')
      : null,
    hasNoMembership: !resource.isLoading && !resource.error && detail === null,
    membership,
    retry: resource.retry,
    refresh: resource.refresh,
    openAccess() {
      router.push('/account/access');
    },
    openPlans() {
      router.push('/memberships');
    },
    openPayments() {
      router.push('/account/payments');
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/account');
    },
  };
}
