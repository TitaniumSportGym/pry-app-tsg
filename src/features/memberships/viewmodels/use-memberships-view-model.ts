import { router } from 'expo-router';
import { useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import {
  formatDuration,
  formatPrice,
  getPlanBadge,
  getPlanTypeLabel,
  isGroupPlan,
} from '@/features/memberships/models/membership';
import {
  getMembershipRoutes,
  type MembershipArea,
} from '@/features/memberships/models/membership-area';
import { membershipsRepository } from '@/features/memberships/repositories/memberships-repository';
import { useMembershipPurchase } from '@/features/memberships/viewmodels/use-membership-purchase';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const SKELETON_DELAY_MS = 300;

export function useMembershipsViewModel(area: MembershipArea) {
  const routes = getMembershipRoutes(area);
  const resource = useAuthorizedResource(membershipsRepository.getPlans);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const purchase = useMembershipPurchase(area);

  const plans = resource.data ?? [];
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No encontramos membresías disponibles.')
      : null,
    isEmpty: !resource.isLoading && !resource.error && plans.length === 0,
    planOptions: plans.map((plan) => ({ id: plan.id, name: plan.name })),
    selectedPlan: selectedPlan
      ? {
          id: selectedPlan.id,
          name: selectedPlan.name,
          summary: `${getPlanTypeLabel(selectedPlan.type)} · ${formatDuration(selectedPlan.durationDays)}`,
          badge: getPlanBadge(selectedPlan),
          price: formatPrice(selectedPlan.price),
          priceNote: isGroupPlan(selectedPlan)
            ? `por ${formatDuration(selectedPlan.durationDays)} · ${formatPrice(selectedPlan.pricePerPerson)} por persona`
            : `por ${formatDuration(selectedPlan.durationDays)}`,
          benefits: selectedPlan.benefits,
        }
      : null,
    canBuy: purchase.canBuy,
    isBuying: purchase.isBuying,
    purchaseError: purchase.purchaseError,
    buySelectedPlan() {
      if (selectedPlan) void purchase.buy(selectedPlan.id);
    },
    retry: resource.retry,
    refresh: resource.refresh,
    selectPlan: setSelectedPlanId,
    openDetail() {
      if (!selectedPlan) return;
      router.push({ pathname: routes.detail, params: { id: selectedPlan.id } });
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace(routes.parent);
    },
  };
}
