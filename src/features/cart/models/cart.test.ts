import {
  addToCart,
  canIncrease,
  getCartCount,
  getCartTotal,
  getQuantityInCart,
  MAX_UNITS_PER_PRODUCT,
  removeFromCart,
  setQuantity,
  type CartProductSnapshot,
} from './cart';

const creatine: CartProductSnapshot = {
  productId: 138,
  name: 'Creatina 300 g',
  price: 549,
  imageUrl: null,
  detail: 'Sin sabor · 300 g',
  stock: 3,
};

const shirt: CartProductSnapshot = {
  ...creatine,
  productId: 101,
  name: 'Playera',
  price: 599.5,
  stock: 50,
};

describe('carrito', () => {
  it('agrega un producto y suma unidades si ya estaba', () => {
    let cart = addToCart([], creatine);
    cart = addToCart(cart, creatine);

    expect(cart).toHaveLength(1);
    expect(getQuantityInCart(cart, 138)).toBe(2);
  });

  it('no supera las existencias ni el límite por producto', () => {
    expect(getQuantityInCart(addToCart([], creatine, 9), 138)).toBe(3);
    expect(getQuantityInCart(addToCart([], shirt, 99), 101)).toBe(MAX_UNITS_PER_PRODUCT);
  });

  it('no agrega productos agotados', () => {
    expect(addToCart([], { ...creatine, stock: 0 })).toEqual([]);
  });

  it('ajusta la cantidad entre 1 y el máximo permitido', () => {
    const cart = addToCart([], creatine);

    expect(getQuantityInCart(setQuantity(cart, 138, 0), 138)).toBe(1);
    expect(getQuantityInCart(setQuantity(cart, 138, 7), 138)).toBe(3);
    expect(canIncrease(setQuantity(cart, 138, 3)[0])).toBe(false);
  });

  it('quita productos y calcula total y número de piezas', () => {
    let cart = addToCart(addToCart([], creatine, 2), shirt);

    expect(getCartCount(cart)).toBe(3);
    expect(getCartTotal(cart)).toBe(1697.5);

    cart = removeFromCart(cart, 138);
    expect(getCartCount(cart)).toBe(1);
  });
});
