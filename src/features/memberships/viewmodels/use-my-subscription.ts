import { useCallback } from 'react';

import { describeValidity } from '@/features/memberships/models/subscription';
import {
  MEMBERSHIP_KEYS,
  membershipsRepository,
} from '@/features/memberships/repositories/memberships-repository';
import { useAuth } from '@/hooks/use-auth';
import { useAuthorizedResource, type LoadOptions } from '@/hooks/use-authorized-resource';

export interface CurrentPlan {
  name: string;
  validity: string;
}

/**
 * Plan vigente del cliente de la sesión (null sin sesión, sin membresía o si no se pudo leer).
 * Se recarga solo cuando un pago invalida la membresía.
 */
export function useMySubscription(enabled = true) {
  const { status, role } = useAuth();
  const isClient = enabled && status === 'authenticated' && role === 'cliente';

  const load = useCallback(
    async (options: LoadOptions) => (isClient ? membershipsRepository.getMySubscription(options) : null),
    [isClient],
  );
  const resource = useAuthorizedResource(load, { reloadOn: [MEMBERSHIP_KEYS.subscription] });
  const subscription = resource.data;

  const plan: CurrentPlan | null = subscription
    ? { name: subscription.planName, validity: describeValidity(subscription, new Date()) }
    : null;

  return { plan, isLoading: isClient && resource.isLoading, refresh: resource.refresh };
}
