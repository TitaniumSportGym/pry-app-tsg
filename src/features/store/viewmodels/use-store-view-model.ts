import { router } from 'expo-router';
import { useState } from 'react';

import { getAccessErrorMessage } from '@/features/authorization/models/access-errors';
import { getProducts } from '@/features/store/api/products-api';
import {
  filterProducts,
  formatProductPrice,
  getCategories,
  isSoldOut,
  MAX_SEARCH_LENGTH,
  sanitizeSearch,
} from '@/features/store/models/product';
import { useAuthorizedResource } from '@/hooks/use-authorized-resource';
import { useDelayedFlag } from '@/hooks/use-delayed-flag';

const SKELETON_DELAY_MS = 300;

export function useStoreViewModel() {
  const resource = useAuthorizedResource(getProducts);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const products = resource.data ?? [];
  const visibleProducts = filterProducts(products, { categoryId, query });
  const isFiltering = query.trim() !== '' || categoryId !== null;

  return {
    showSkeleton: useDelayedFlag(resource.isLoading, SKELETON_DELAY_MS),
    isLoading: resource.isLoading,
    isRefreshing: resource.isRefreshing,
    errorMessage: resource.error
      ? getAccessErrorMessage(resource.error, 'No encontramos productos disponibles.')
      : null,
    query,
    maxQueryLength: MAX_SEARCH_LENGTH,
    categories: getCategories(products),
    selectedCategoryId: categoryId,
    products: visibleProducts.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.categoryName.toUpperCase(),
      price: formatProductPrice(product.price),
      imageUrl: product.imageUrls[0] ?? null,
      soldOut: isSoldOut(product),
    })),
    emptyMessage:
      products.length === 0
        ? 'Aún no hay productos en la tienda.'
        : isFiltering
          ? 'No encontramos productos con esa búsqueda.'
          : null,
    retry: resource.retry,
    refresh: resource.refresh,
    setQuery(value: string) {
      setQuery(sanitizeSearch(value));
    },
    selectCategory: setCategoryId,
    openProduct(productId: number) {
      router.push({ pathname: '/store/[id]', params: { id: String(productId) } });
    },
  };
}
