import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import { getMembershipPlan, getMembershipPlans } from '@/features/memberships/api/memberships-api';
import type { MembershipPlan } from '@/features/memberships/models/membership';

/** Plans and prices are edited by the gym from time to time, not minute to minute. */
const PLANS_TTL_MS = 10 * 60_000;

export const MEMBERSHIP_KEYS = {
  all: 'memberships',
  plans: 'memberships:plans',
  plan: (planId: string) => `memberships:plan:${planId}`,
} as const;

export interface MembershipsRepository {
  getPlans(options?: ReadOptions): Promise<MembershipPlan[]>;
  getPlan(planId: string, options?: ReadOptions): Promise<MembershipPlan>;
}

export interface MembershipsDataSource {
  getMembershipPlans(): Promise<MembershipPlan[]>;
  getMembershipPlan(planId: string): Promise<MembershipPlan>;
}

const DEFAULT_DATA_SOURCE: MembershipsDataSource = { getMembershipPlans, getMembershipPlan };

export function createMembershipsRepository(
  dataSource: MembershipsDataSource = DEFAULT_DATA_SOURCE,
  cache: RepositoryCache = repositoryCache,
): MembershipsRepository {
  return {
    getPlans: (options = {}) =>
      cache.read(MEMBERSHIP_KEYS.plans, () => dataSource.getMembershipPlans(), {
        ...options,
        ttlMs: PLANS_TTL_MS,
      }),
    getPlan: (planId, options = {}) =>
      cache.read(MEMBERSHIP_KEYS.plan(planId), () => dataSource.getMembershipPlan(planId), {
        ...options,
        ttlMs: PLANS_TTL_MS,
      }),
  };
}

export const membershipsRepository = createMembershipsRepository();
