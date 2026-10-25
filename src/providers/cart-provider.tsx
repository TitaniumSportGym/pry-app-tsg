import { createContext, useMemo, useState, type PropsWithChildren } from 'react';

import {
  addToCart,
  removeFromCart,
  setQuantity,
  type CartProductSnapshot,
  type CartState,
} from '@/features/cart/models/cart';
import { useAuth } from '@/hooks/use-auth';

export interface CartContextValue {
  items: CartState;
  /** Only signed-in users have a cart. */
  isAvailable: boolean;
  add: (product: CartProductSnapshot, units?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

/**
 * Keeps the cart in memory for this session. Only signed-in users can add to it,
 * and it is emptied when the user signs out, so a shared phone never shows
 * someone else's cart.
 */
export function CartProvider({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const [items, setItems] = useState<CartState>([]);
  const [lastStatus, setLastStatus] = useState(status);

  if (status !== lastStatus) {
    setLastStatus(status);
    if (lastStatus === 'authenticated' && status === 'unauthenticated') setItems([]);
  }

  const isAvailable = status === 'authenticated';

  const value = useMemo<CartContextValue>(
    () => ({
      items: isAvailable ? items : [],
      isAvailable,
      add: (product, units) => {
        if (isAvailable) setItems((current) => addToCart(current, product, units));
      },
      updateQuantity: (productId, quantity) =>
        setItems((current) => setQuantity(current, productId, quantity)),
      remove: (productId) => setItems((current) => removeFromCart(current, productId)),
      clear: () => setItems([]),
    }),
    [isAvailable, items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
