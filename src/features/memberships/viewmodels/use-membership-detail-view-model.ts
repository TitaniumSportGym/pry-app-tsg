import { router } from 'expo-router';
import { useCallback } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { getMembershipPlan } from '@/features/memberships/api/memberships-api';
import {
  formatDuration,
  formatPeople,
  formatPrice,
  getPlanBadge,
  getPlanTypeLabel,
  isGroupPlan,
  isValidPlanId,
} from '@/features/memberships/models/membership';
import {
  getMembershipRoutes,
  type MembershipArea,
} from '@/features/memberships/models/membership-area';
import { useMembershipPurchase } from '@/features/memberships/viewmodels/use-membership-purchase';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { ApiError } from '@/types/auth';

const SKELETON_DELAY_MS = 300;
const NOT_FOUND_MESSAGE = 'No encontramos esta membresía.';

export function useMembershipDetailViewModel(area: MembershipArea, planId: unknown) {
  const routes = getMembershipRoutes(area);
  const purchase = useMembershipPurchase(area);

  const load = useCallback(async () => {
    if (!isValidPlanId(planId)) {
      throw new ApiError(NOT_FOUND_MESSAGE, 404);
    }

    return getMembershipPlan(planId);
  }, [planId]);

  const resource = useAuthorizedResource(load);
  const plan = resource.data;

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error ? getAccessErrorMessage(resource.error, NOT_FOUND_MESSAGE) : null,
    plan: plan
      ? {
          name: plan.name,
          typeLabel: getPlanTypeLabel(plan.type),
          badge: getPlanBadge(plan),
          description: plan.description,
          price: formatPrice(plan.price),
          duration: formatDuration(plan.durationDays),
          pricePerPerson: isGroupPlan(plan) ? formatPrice(plan.pricePerPerson) : null,
          people: formatPeople(plan),
          requirement: plan.requiresStudentProof ? 'Credencial de estudiante vigente' : null,
          benefits: plan.benefits,
        }
      : null,
    canBuy: purchase.canBuy,
    isBuying: purchase.isBuying,
    purchaseError: purchase.purchaseError,
    buy() {
      if (plan) void purchase.buy(plan.id);
    },
    retry: resource.retry,
    refresh: resource.refresh,
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace(routes.list);
    },
  };
}
