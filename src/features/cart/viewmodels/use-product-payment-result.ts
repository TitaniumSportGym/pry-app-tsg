import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { getOrderPaymentStatus } from '@/features/memberships/api/checkout-api';
import { isValidOrderId } from '@/features/memberships/models/checkout';
import type { OrderPaymentStatus } from '@/features/memberships/models/payment-status';
import { useAppActive } from '@/hooks/use-app-active';
import { useCart } from '@/hooks/use-cart';
import { apiRequest } from '@/services/apiClient';

export type ProductPaymentResultKind = 'invalid' | 'verifying' | 'pending' | 'approved' | 'rejected' | 'error';

/** The webhook-confirmed backend is the only source of truth for paid orders. */
export function useProductPaymentResult(orderId: string | undefined) {
  const validOrder = isValidOrderId(orderId) ? orderId : null;
  const [kind, setKind] = useState<ProductPaymentResultKind>(validOrder ? 'verifying' : 'invalid');
  const [status, setStatus] = useState<OrderPaymentStatus | null>(null);
  const [generation, setGeneration] = useState(0);
  const attempts = useRef(0);
  const failures = useRef(0);
  const cart = useCart();
  const focused = useIsFocused();
  const active = useAppActive();

  useEffect(() => {
    if (!validOrder || !focused || !active || kind !== 'verifying') return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const next = await getOrderPaymentStatus(validOrder);
        if (cancelled) return;
        setStatus(next);
        failures.current = 0;
        if (next.outcome === 'approved') {
          setKind('approved');
          // Only clear when the present cart still matches the paid order exactly.
          // Never discard products a customer added during the browser round-trip.
          try {
            const response = await apiRequest<{ order?: { items?: Array<{ itemType: string; productId: number; quantity: number }> } }>(
              '/api/orders/' + encodeURIComponent(validOrder),
            );
            if (cancelled) return;
            const purchased = response.order?.items?.filter((item) => item.itemType === 'product') ?? [];
            const sameItems = purchased.length === cart.items.length && purchased.length > 0 &&
              purchased.every((item) => cart.items.some((entry) =>
                entry.productId === Number(item.productId) && entry.quantity === Number(item.quantity)));
            if (sameItems) cart.clear();
          } catch {
            // The payment is confirmed regardless of the optional cart refresh.
          }
          return;
        }
        if (next.outcome === 'rejected') {
          setKind('rejected');
          return;
        }
      } catch {
        if (cancelled) return;
        failures.current += 1;
        if (failures.current >= 3) {
          setKind('error');
          return;
        }
      }
      attempts.current += 1;
      if (attempts.current >= 20) setKind('pending');
      else setGeneration((value) => value + 1);
    }, attempts.current === 0 ? 0 : 3000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [validOrder, focused, active, kind, generation, cart]);

  return {
    kind: validOrder ? kind : 'invalid',
    orderNumber: status?.orderNumber ?? null,
    total: status?.total ?? null,
    retry() {
      attempts.current = 0;
      failures.current = 0;
      setKind('verifying');
      setGeneration((value) => value + 1);
    },
    openStore() { router.replace('/store'); },
    openCart() { router.replace('/cart'); },
    openOrders() { router.replace('/account/orders'); },
    goHome() { router.replace('/'); },
  };
}
