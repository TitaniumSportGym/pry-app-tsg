/**
 * Cart kept on the device (the backend has no cart endpoints).
 * Prices are a snapshot for display only: the order total must be recalculated
 * by the server when the payment flow exists.
 */

export const MAX_UNITS_PER_PRODUCT = 10;

export interface CartProductSnapshot {
  productId: number;
  name: string;
  price: number;
  imageUrl: string | null;
  /** Short variant line, e.g. "Sin sabor · 300 g". */
  detail: string;
  stock: number;
}

export interface CartItem extends CartProductSnapshot {
  quantity: number;
}

export type CartState = readonly CartItem[];

function maxUnits(stock: number) {
  return Math.max(0, Math.min(stock, MAX_UNITS_PER_PRODUCT));
}

/** Adds units of a product; never exceeds its stock or the per-product limit. */
export function addToCart(cart: CartState, product: CartProductSnapshot, units = 1): CartState {
  const limit = maxUnits(product.stock);
  if (limit === 0 || units <= 0) return cart;

  const existing = cart.find((item) => item.productId === product.productId);
  if (!existing) {
    return [...cart, { ...product, quantity: Math.min(units, limit) }];
  }

  return cart.map((item) =>
    item.productId === product.productId
      ? { ...item, ...product, quantity: Math.min(item.quantity + units, limit) }
      : item,
  );
}

export function setQuantity(cart: CartState, productId: number, quantity: number): CartState {
  return cart.map((item) =>
    item.productId === productId
      ? { ...item, quantity: Math.max(1, Math.min(Math.floor(quantity), maxUnits(item.stock))) }
      : item,
  );
}

export function removeFromCart(cart: CartState, productId: number): CartState {
  return cart.filter((item) => item.productId !== productId);
}

export function getCartCount(cart: CartState) {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

export function getCartTotal(cart: CartState) {
  return (
    Math.round(cart.reduce((total, item) => total + item.price * item.quantity, 0) * 100) / 100
  );
}

export function canIncrease(item: CartItem) {
  return item.quantity < maxUnits(item.stock);
}

export function getQuantityInCart(cart: CartState, productId: number) {
  return cart.find((item) => item.productId === productId)?.quantity ?? 0;
}
