import { getCartCount } from '@/features/cart/models/cart';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/hooks/use-cart';

/** Counters for the client tab bar: pieces in the cart, only with a session. */
export function useClientTabBadges() {
  const { status } = useAuth();
  const { items } = useCart();

  return { cart: status === 'authenticated' ? getCartCount(items) : 0 };
}
