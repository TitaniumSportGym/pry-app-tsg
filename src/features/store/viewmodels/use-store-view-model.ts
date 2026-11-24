import { router } from 'expo-router';
import { useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import {
  getCategorySummaries,
  getNewestProducts,
  MAX_SEARCH_LENGTH,
  sanitizeSearch,
} from '@/features/store/models/product';
import { toProductCardItem } from '@/features/store/models/product-card-item';
import { productsRepository } from '@/features/store/repositories/products-repository';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const SKELETON_DELAY_MS = 300;

/** Screen 09 · Tienda: search, categories and newest products. */
export function useStoreViewModel() {
  const resource = useAuthorizedResource(productsRepository.getProducts);
  const [query, setQuery] = useState('');
  const products = resource.data ?? [];

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No encontramos productos disponibles.')
      : null,
    isEmpty: !resource.isLoading && !resource.error && products.length === 0,
    query,
    maxQueryLength: MAX_SEARCH_LENGTH,
    categories: getCategorySummaries(products),
    newest: getNewestProducts(products).map(toProductCardItem),
    retry: resource.retry,
    refresh: resource.refresh,
    setQuery(value: string) {
      setQuery(sanitizeSearch(value));
    },
    submitSearch() {
      const text = query.trim();
      if (!text) return;
      router.push({ pathname: '/store/catalog', params: { q: text } });
    },
    openCatalog() {
      router.push('/store/catalog');
    },
    openCategory(categoryId: number) {
      router.push({ pathname: '/store/catalog', params: { category: String(categoryId) } });
    },
    openProduct(productId: number) {
      router.push({ pathname: '/store/[id]', params: { id: String(productId) } });
    },
  };
}
