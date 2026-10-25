import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Share } from 'react-native';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { getQuantityInCart, MAX_UNITS_PER_PRODUCT } from '@/features/cart/models/cart';
import { getProduct } from '@/features/store/api/products-api';
import {
  formatProductPrice,
  getStockLabel,
  isSoldOut,
  parseProductId,
  toCartProduct,
} from '@/features/store/models/product';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useCart } from '@/hooks/use-cart';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { ApiError } from '@/types/auth';

const SKELETON_DELAY_MS = 300;
const ADDED_FEEDBACK_MS = 1800;
const NOT_FOUND_MESSAGE = 'No encontramos este producto.';

/** Screen 11 · Detalle: product data plus "Agregar" and "Comprar". */
export function useProductDetailViewModel(rawProductId: unknown) {
  const cart = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const load = useCallback(async () => {
    const productId = parseProductId(rawProductId);

    if (productId === null) {
      throw new ApiError(NOT_FOUND_MESSAGE, 404);
    }

    return getProduct(productId);
  }, [rawProductId]);

  const resource = useAuthorizedResource(load);
  const product = resource.data;

  useEffect(() => {
    if (!justAdded) return;
    const timeout = setTimeout(() => setJustAdded(false), ADDED_FEEDBACK_MS);
    return () => clearTimeout(timeout);
  }, [justAdded]);

  const inCart = product ? getQuantityInCart(cart.items, product.id) : 0;
  const maxUnits = product ? Math.min(product.stock, MAX_UNITS_PER_PRODUCT) : 0;
  const requiresLogin = !cart.isAvailable;
  const canAdd = product !== null && !isSoldOut(product) && (requiresLogin || inCart < maxUnits);

  function addProduct() {
    if (!product || !canAdd || requiresLogin) return false;
    cart.add(toCartProduct(product));
    return true;
  }

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error ? getAccessErrorMessage(resource.error, NOT_FOUND_MESSAGE) : null,
    product: product
      ? {
          name: product.name,
          brand: product.brand,
          category: product.categoryName.toUpperCase(),
          price: formatProductPrice(product.price),
          stockLabel: getStockLabel(product),
          soldOut: isSoldOut(product),
          imageUrls: product.imageUrls,
          description: product.description,
          specs: product.specs,
          features: product.features,
        }
      : null,
    canAdd,
    requiresLogin,
    /** True when pressing "Agregar" will really put the product in the cart. */
    willAddToCart: !requiresLogin && canAdd,
    justAdded,
    cartNote: requiresLogin
      ? 'Inicia sesión para agregar productos a tu carrito.'
      : inCart === 0
        ? null
        : inCart >= maxUnits
          ? `Tienes ${inCart} en tu carrito, el máximo disponible.`
          : `Tienes ${inCart} en tu carrito.`,
    retry: resource.retry,
    refresh: resource.refresh,
    addToCart() {
      // The cart belongs to an account: guests are sent to sign in first.
      if (requiresLogin) {
        router.push('/login');
        return;
      }
      if (addProduct()) setJustAdded(true);
    },
    buyNow() {
      if (requiresLogin) {
        router.push('/login');
        return;
      }
      // Buying adds the product (if there is room) and goes to the cart to pay.
      if (product && !isSoldOut(product)) {
        addProduct();
        router.navigate('/cart');
      }
    },
    share() {
      if (!product) return;
      void Share.share({
        message: `${product.name} · ${formatProductPrice(product.price)} en la Tienda Titanium Sport Gym`,
      }).catch(() => undefined);
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/store');
    },
  };
}
