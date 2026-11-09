import {
  parseMembershipPlan,
  parseMembershipPlans,
} from '@/features/memberships/models/membership';
import { parseActiveSubscription } from '@/features/memberships/models/subscription';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

const PLAN_NOT_FOUND = 'Plan de membresía no encontrado';

// Public endpoints: the session token is not sent (auth: false).
export async function getMembershipPlans() {
  const response = await apiRequest<{ plans?: unknown }>('/api/memberships/plans', {
    auth: false,
  });

  return parseMembershipPlans(response?.plans);
}

/** Membresía vigente del usuario de la sesión; null si no tiene una activa hoy. */
export async function getMySubscription() {
  return parseActiveSubscription(await apiRequest<unknown>('/api/memberships/me/subscription'));
}

export async function getMembershipPlan(planId: string) {
  const response = await apiRequest<{ plan?: unknown }>(
    `/api/memberships/plans/${encodeURIComponent(planId)}`,
    { auth: false },
  );
  const plan = parseMembershipPlan(response?.plan);

  // Inactive or malformed plans are treated as missing.
  if (!plan) {
    throw new ApiError(PLAN_NOT_FOUND, 404);
  }

  return plan;
}
