import { router } from 'expo-router';

import { canIncrease, getCartCount, getCartTotal } from '@/features/cart/models/cart';
import { formatProductPrice } from '@/features/store/models/product';
import { useCart } from '@/hooks/use-cart';

/** Screen 12 · Carrito. Only signed-in users can open it; payment (screen 13) does not exist yet. */
export function useCartViewModel() {
  const cart = useCart();
  const count = getCartCount(cart.items);

  return {
    requiresLogin: !cart.isAvailable,
    isEmpty: cart.items.length === 0,
    count,
    countLabel: `Total (${count} ${count === 1 ? 'producto' : 'productos'})`,
    total: formatProductPrice(getCartTotal(cart.items)),
    items: cart.items.map((item) => ({
      id: item.productId,
      name: item.name,
      detail: item.detail,
      price: formatProductPrice(item.price * item.quantity),
      imageUrl: item.imageUrl,
      quantity: item.quantity,
      canIncrease: canIncrease(item),
      canDecrease: item.quantity > 1,
    })),
    increase(productId: number) {
      const item = cart.items.find((entry) => entry.productId === productId);
      if (item) cart.updateQuantity(productId, item.quantity + 1);
    },
    decrease(productId: number) {
      const item = cart.items.find((entry) => entry.productId === productId);
      if (item) cart.updateQuantity(productId, item.quantity - 1);
    },
    remove: cart.remove,
    openLogin() {
      router.push('/login');
    },
    openRegister() {
      router.push('/register');
    },
    openStore() {
      router.navigate('/store');
    },
    openProduct(productId: number) {
      router.push({ pathname: '/store/[id]', params: { id: String(productId) } });
    },
  };
}
