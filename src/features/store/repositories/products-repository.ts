import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import { getProduct, getProducts } from '@/features/store/api/products-api';
import type { Product } from '@/features/store/models/product';

/** The public catalog changes rarely; five minutes avoids refetching 160 products per screen. */
const PRODUCTS_TTL_MS = 5 * 60_000;

export const PRODUCT_KEYS = {
  all: 'products',
  list: 'products:list',
  detail: (productId: number) => `products:detail:${productId}`,
} as const;

export interface ProductsRepository {
  getProducts(options?: ReadOptions): Promise<Product[]>;
  getProduct(productId: number, options?: ReadOptions): Promise<Product>;
}

export interface ProductsDataSource {
  getProducts(): Promise<Product[]>;
  getProduct(productId: number): Promise<Product>;
}

/** Store, catalog, home and product detail share one copy of the catalog. */
export function createProductsRepository(
  dataSource: ProductsDataSource = { getProducts, getProduct },
  cache: RepositoryCache = repositoryCache,
): ProductsRepository {
  return {
    getProducts: (options = {}) =>
      cache.read(PRODUCT_KEYS.list, () => dataSource.getProducts(), {
        ...options,
        ttlMs: PRODUCTS_TTL_MS,
      }),
    getProduct: (productId, options = {}) =>
      cache.read(PRODUCT_KEYS.detail(productId), () => dataSource.getProduct(productId), {
        ...options,
        ttlMs: PRODUCTS_TTL_MS,
      }),
  };
}

export const productsRepository = createProductsRepository();
