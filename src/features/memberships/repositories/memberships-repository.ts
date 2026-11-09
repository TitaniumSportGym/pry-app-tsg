import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import {
  getMembershipPlan,
  getMembershipPlans,
  getMySubscription,
} from '@/features/memberships/api/memberships-api';
import type { MembershipPlan } from '@/features/memberships/models/membership';
import type { ActiveSubscription } from '@/features/memberships/models/subscription';

/** El gimnasio edita planes y precios de vez en cuando, no a cada minuto. */
const PLANS_TTL_MS = 10 * 60_000;
/** Corto: un pago aprobado activa la membresía en cualquier momento. */
const SUBSCRIPTION_TTL_MS = 60_000;

export const MEMBERSHIP_KEYS = {
  all: 'memberships',
  plans: 'memberships:plans',
  plan: (planId: string) => `memberships:plan:${planId}`,
  subscription: 'memberships:subscription',
} as const;

export interface MembershipsRepository {
  getPlans(options?: ReadOptions): Promise<MembershipPlan[]>;
  getPlan(planId: string, options?: ReadOptions): Promise<MembershipPlan>;
  /** Membresía vigente de la sesión (null si no tiene). */
  getMySubscription(options?: ReadOptions): Promise<ActiveSubscription | null>;
  /** Después de un pago: la siguiente lectura de la membresía va al servidor. */
  invalidateSubscription(): void;
}

export interface MembershipsDataSource {
  getMembershipPlans(): Promise<MembershipPlan[]>;
  getMembershipPlan(planId: string): Promise<MembershipPlan>;
  getMySubscription(): Promise<ActiveSubscription | null>;
}

const DEFAULT_DATA_SOURCE: MembershipsDataSource = {
  getMembershipPlans,
  getMembershipPlan,
  getMySubscription,
};

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
    getMySubscription: (options = {}) =>
      cache.read(MEMBERSHIP_KEYS.subscription, () => dataSource.getMySubscription(), {
        ...options,
        ttlMs: SUBSCRIPTION_TTL_MS,
      }),
    invalidateSubscription: () => cache.invalidate(MEMBERSHIP_KEYS.subscription),
  };
}

export const membershipsRepository = createMembershipsRepository();
