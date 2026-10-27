import { router } from 'expo-router';
import { useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { formatPaymentAmount, getPaymentStatusLabel } from '@/features/payments/models/payment';
import {
  filterPayments,
  formatPaymentDateTime,
  getPaymentMethodLabel,
  groupPaymentsByMonth,
  summarizePayments,
  type PaymentFilter,
} from '@/features/payments/models/payment-history';
import {
  PAYMENT_KEYS,
  paymentsRepository,
} from '@/features/payments/repositories/payments-repository';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const SKELETON_DELAY_MS = 300;

/** Screens 26–28 · Mis pagos: history, loading and empty states. */
export function usePaymentsViewModel() {
  const resource = useAuthorizedResource(paymentsRepository.getHistory, {
    reloadOn: [PAYMENT_KEYS.all],
  });
  const [filter, setFilter] = useState<PaymentFilter>('all');

  const entries = resource.data ?? [];
  const summary = summarizePayments(entries);
  const months = groupPaymentsByMonth(filterPayments(entries, filter));

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    isEmpty: !resource.isLoading && !resource.error && entries.length === 0,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No encontramos tus pagos.')
      : null,
    summary: {
      total: formatPaymentAmount(summary.totalPaid),
      currency: summary.currency,
      paidCount: summary.paidCount,
      pendingCount: summary.pendingCount,
      receiptCount: summary.receiptCount,
    },
    filters: [
      { value: 'all', label: `Todos · ${entries.length}` },
      { value: 'paid', label: `Pagados · ${summary.paidCount}` },
      { value: 'pending', label: `Pendientes · ${summary.pendingCount}` },
    ] satisfies { value: PaymentFilter; label: string }[],
    selectedFilter: filter,
    months: months.map((month) => ({
      key: month.key,
      label: month.label,
      payments: month.payments.map((payment) => ({
        id: payment.id,
        title: payment.title,
        kind: payment.kind,
        dateLabel: formatPaymentDateTime(payment.date),
        amount: formatPaymentAmount(payment.amount),
        status: payment.status,
        statusLabel: getPaymentStatusLabel(payment.status),
        methodLabel: getPaymentMethodLabel(payment.method),
        method: payment.method,
        reference: payment.status === 'paid' ? payment.orderNumber : null,
      })),
    })),
    retry: resource.retry,
    refresh: resource.refresh,
    selectFilter: setFilter,
    openMemberships() {
      router.push('/memberships');
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/account');
    },
  };
}

export type PaymentRowItem = ReturnType<
  typeof usePaymentsViewModel
>['months'][number]['payments'][number];
