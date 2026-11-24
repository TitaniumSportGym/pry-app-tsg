import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import { getMySubscriptionDetail } from '@/features/memberships/api/memberships-api';
import type { SubscriptionDetail } from '@/features/memberships/models/subscription-detail';
import { MEMBERSHIP_KEYS } from '@/features/memberships/repositories/memberships-repository';

/** Corto, igual que la membresía vigente: un pago aprobado la cambia en cualquier momento. */
const DETAIL_TTL_MS = 60_000;

/**
 * Vive bajo el prefijo de la membresía vigente: cuando un pago llama a
 * `membershipsRepository.invalidateSubscription()`, este detalle también se recarga.
 */
export const MY_MEMBERSHIP_KEY = `${MEMBERSHIP_KEYS.subscription}:detail`;

export function createMyMembershipRepository(
  fetchDetail: () => Promise<SubscriptionDetail | null> = getMySubscriptionDetail,
  cache: RepositoryCache = repositoryCache,
) {
  return {
    getDetail: (options: ReadOptions = {}) =>
      cache.read(MY_MEMBERSHIP_KEY, fetchDetail, { ...options, ttlMs: DETAIL_TTL_MS }),
  };
}

export const myMembershipRepository = createMyMembershipRepository();
