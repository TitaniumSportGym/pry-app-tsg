import { router } from 'expo-router';
import { useCallback } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { HOME_ACTIONS, type HomeActionId } from '@/features/home/models/home-actions';
import { getInitials, getMemberId, pickRecommendedProducts } from '@/features/home/models/home';
import {
  formatPaymentAmount,
  formatPaymentDate,
  getPaymentStatusLabel,
} from '@/features/payments/models/payment';
import {
  PAYMENT_KEYS,
  paymentsRepository,
} from '@/features/payments/repositories/payments-repository';
import { useMySubscription } from '@/features/memberships/viewmodels/use-my-subscription';
import { formatProductPrice } from '@/features/store/models/product';
import { productsRepository } from '@/features/store/repositories/products-repository';
import { useAuth } from '@/hooks/use-auth';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const SKELETON_DELAY_MS = 300;

/** Acciones rápidas con pantalla; las que no aparecen aquí se muestran como "PRONTO". */
const ACTION_ROUTES: Partial<Record<HomeActionId, '/memberships' | '/store' | '/account/payments'>> = {
  memberships: '/memberships',
  payments: '/account/payments',
  store: '/store',
};

export function useHomeViewModel() {
  const { status, user } = useAuth();
  const isAuthenticated = status === 'authenticated';
  const memberId = isAuthenticated ? getMemberId(user?.email) : null;

  const products = useAuthorizedResource(productsRepository.getProducts);
  const subscription = useMySubscription();

  // Guests have no payments, so no request is made without a session.
  const loadPayments = useCallback(
    async (options: LoadOptions) =>
      isAuthenticated ? paymentsRepository.getRecentPayments(options) : [],
    [isAuthenticated],
  );
  const payments = useAuthorizedResource(loadPayments, { reloadOn: [PAYMENT_KEYS.all] });
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
    currentPlan: subscription.plan,

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
      subscription.refresh();
    },

    openAction(actionId: HomeActionId) {
      const route = ACTION_ROUTES[actionId];
      if (route) router.push(route);
    },
    openMemberships() {
      router.push('/memberships');
    },
    openAccess() {
      router.push('/account/access');
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
