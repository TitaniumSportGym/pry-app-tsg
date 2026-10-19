import { router } from 'expo-router';
import { useCallback } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { getProduct } from '@/features/store/api/products-api';
import {
  formatProductPrice,
  getStockLabel,
  isSoldOut,
  parseProductId,
} from '@/features/store/models/product';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';
import { ApiError } from '@/types/auth';

const SKELETON_DELAY_MS = 300;
const NOT_FOUND_MESSAGE = 'No encontramos este producto.';

export function useProductDetailViewModel(rawProductId: unknown) {
  const load = useCallback(async () => {
    const productId = parseProductId(rawProductId);

    if (productId === null) {
      throw new ApiError(NOT_FOUND_MESSAGE, 404);
    }

    return getProduct(productId);
  }, [rawProductId]);

  const resource = useAuthorizedResource(load);
  const product = resource.data;

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
    retry: resource.retry,
    refresh: resource.refresh,
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/store');
    },
  };
}
