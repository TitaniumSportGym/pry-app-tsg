import { router } from 'expo-router';
import { useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { getProducts } from '@/features/store/api/products-api';
import {
  filterProducts,
  getCategories,
  MAX_SEARCH_LENGTH,
  parseCategoryParam,
  sanitizeSearch,
} from '@/features/store/models/product';
import { toProductCardItem } from '@/features/store/models/product-card-item';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const SKELETON_DELAY_MS = 300;

interface CatalogParams {
  category?: unknown;
  q?: unknown;
}

/** Screen 10 · Catálogo. Route params are validated before they are used. */
export function useCatalogViewModel(params: CatalogParams) {
  const resource = useAuthorizedResource(getProducts);
  const [categoryId, setCategoryId] = useState(() => parseCategoryParam(params.category));
  const [query, setQuery] = useState(() =>
    typeof params.q === 'string' ? sanitizeSearch(params.q) : '',
  );

  const products = resource.data ?? [];
  const categories = getCategories(products);
  const selectedCategory = categories.find((category) => category.id === categoryId) ?? null;
  const visible = filterProducts(products, { categoryId: selectedCategory?.id ?? null, query });

  return {
    title: selectedCategory ? selectedCategory.name.toUpperCase() : 'CATÁLOGO',
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No encontramos productos disponibles.')
      : null,
    query,
    maxQueryLength: MAX_SEARCH_LENGTH,
    categories,
    selectedCategoryId: selectedCategory?.id ?? null,
    products: visible.map(toProductCardItem),
    emptyMessage:
      products.length === 0
        ? 'Aún no hay productos en la tienda.'
        : 'No encontramos productos con esa búsqueda.',
    retry: resource.retry,
    refresh: resource.refresh,
    setQuery(value: string) {
      setQuery(sanitizeSearch(value));
    },
    selectCategory: setCategoryId,
    openProduct(productId: number) {
      router.push({ pathname: '/store/[id]', params: { id: String(productId) } });
    },
    goBack() {
      if (router.canGoBack()) router.back();
      else router.replace('/store');
    },
  };
}
