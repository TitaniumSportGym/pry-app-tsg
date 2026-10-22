import { router } from 'expo-router';
import { useCallback } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { HOME_ACTIONS, type HomeActionId } from '@/features/home/models/home-actions';
import { getInitials, getMemberId, pickRecommendedProducts } from '@/features/home/models/home';
import { getMyPayments } from '@/features/payments/api/payments-api';
import {
  formatPaymentAmount,
  formatPaymentDate,
  getPaymentStatusLabel,
} from '@/features/payments/models/payment';
import { getProducts } from '@/features/store/api/products-api';
import { formatProductPrice } from '@/features/store/models/product';
import { useAuth } from '@/hooks/use-auth';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const SKELETON_DELAY_MS = 300;

const ACTION_ROUTES = {
  memberships: '/memberships',
  store: '/store',
} as const satisfies Partial<Record<HomeActionId, string>>;

export function useHomeViewModel() {
  const { status, user } = useAuth();
  const isAuthenticated = status === 'authenticated';
  const memberId = isAuthenticated ? getMemberId(user?.email) : null;

  const products = useAuthorizedResource(getProducts);

  // Guests have no payments, so no request is made without a session.
  const loadPayments = useCallback(
    async () => (isAuthenticated ? getMyPayments() : []),
    [isAuthenticated],
  );
  const payments = useAuthorizedResource(loadPayments);
  const lastPayment = payments.data?.[0] ?? null;

  const showProductsSkeleton = useDelayedFlag(products.isLoading, SKELETON_DELAY_MS);
  const showPaymentsSkeleton = useDelayedFlag(
    isAuthenticated && payments.isLoading,
    SKELETON_DELAY_MS,
  );

  return {
    isAuthenticated,
    eyebrow: memberId ? `Socio ${memberId}` : 'Bienvenido a Titanium',
    greeting: isAuthenticated ? '¡Hola de nuevo!' : 'Hola, invitado',
    initials: getInitials(memberId),
    actions: HOME_ACTIONS,

    recommended: {
      isLoading: products.isLoading,
      showSkeleton: showProductsSkeleton,
      errorMessage: products.error
        ? getAccessErrorMessage(products.error, 'No encontramos productos.')
        : null,
      items: pickRecommendedProducts(products.data ?? []).map((product) => ({
        id: product.id,
        name: product.name,
        price: formatProductPrice(product.price),
        imageUrl: product.imageUrls[0],
      })),
      retry: products.retry,
    },

    lastPayment: {
      isLoading: isAuthenticated && payments.isLoading,
      showSkeleton: showPaymentsSkeleton,
      errorMessage: payments.error
        ? getAccessErrorMessage(payments.error, 'No encontramos tus pagos.')
        : null,
      item: lastPayment
        ? {
            amount: formatPaymentAmount(lastPayment.amount),
            detail: `${lastPayment.orderNumber ?? 'Pago'} · ${formatPaymentDate(lastPayment.date)}`,
            status: lastPayment.status,
            statusLabel: getPaymentStatusLabel(lastPayment.status),
          }
        : null,
      retry: payments.retry,
    },

    isRefreshing: products.isRefreshing || payments.isRefreshing,
    refresh() {
      products.refresh();
      payments.refresh();
    },

    openAction(actionId: HomeActionId) {
      if (actionId === 'memberships' || actionId === 'store') {
        router.push(ACTION_ROUTES[actionId]);
      }
    },
    openMemberships() {
      router.push('/memberships');
    },
    openStore() {
      router.push('/store');
    },
    openProduct(productId: number) {
      router.push({ pathname: '/store/[id]', params: { id: String(productId) } });
    },
    openLogin() {
      router.push('/login');
    },
  };
}
