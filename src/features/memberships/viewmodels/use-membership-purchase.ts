import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { createMembershipCheckout } from '@/features/memberships/api/checkout-api';
import { getCheckoutErrorMessage, getIdempotencyKey } from '@/features/memberships/models/checkout';
import type { MembershipArea } from '@/features/memberships/models/membership-area';
import { useAuth } from '@/hooks/use-auth';

/**
 * "Comprar" for a membership plan, shared by the list and the detail screens.
 * Guests are sent to sign in; clients get the Mercado Pago checkout in the
 * system's secure browser. Trainers browse plans only, so they get no button.
 */
export function useMembershipPurchase(area: MembershipArea) {
  const { status } = useAuth();
  const [isBuying, setIsBuying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return {
    canBuy: area === 'client',
    isBuying,
    purchaseError: errorMessage,
    async buy(membershipPlanId: string) {
      if (isBuying) return;
      setErrorMessage(null);

      if (status !== 'authenticated') {
        router.push('/login');
        return;
      }

      setIsBuying(true);
      try {
        const key = getIdempotencyKey(`membership:${membershipPlanId}`);
        const { checkoutUrl } = await createMembershipCheckout(membershipPlanId, key);
        await WebBrowser.openBrowserAsync(checkoutUrl);
      } catch (error) {
        setErrorMessage(getCheckoutErrorMessage(error));
      } finally {
        setIsBuying(false);
      }
    },
  };
}
