import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import * as ordersApi from '@/features/orders/api/orders-api';
import type { ClientOrder } from '@/features/orders/models/order';

/** Corto: el administrador puede cambiar el estado de entrega en cualquier momento. */
const ORDERS_TTL_MS = 30_000;

export const ORDER_KEYS = {
  all: 'orders',
  list: 'orders:list',
  detail: (orderId: string) => `orders:detail:${orderId}`,
} as const;

export interface OrdersDataSource {
  getMyProductOrders(): Promise<ClientOrder[]>;
  getOrder(orderId: string): Promise<ClientOrder>;
  cancelOrder(orderId: string): Promise<void>;
}

export interface OrdersRepository {
  getOrders(options?: ReadOptions): Promise<ClientOrder[]>;
  getOrder(orderId: string, options?: ReadOptions): Promise<ClientOrder>;
  cancelOrder(orderId: string): Promise<void>;
  /** Llamar después de pagar o cancelar: las pantallas abiertas se recargan. */
  invalidate(): void;
}

export function createOrdersRepository(
  dataSource: OrdersDataSource = ordersApi,
  cache: RepositoryCache = repositoryCache,
): OrdersRepository {
  return {
    getOrders: (options = {}) =>
      cache.read(ORDER_KEYS.list, () => dataSource.getMyProductOrders(), {
        ...options,
        ttlMs: ORDERS_TTL_MS,
      }),
    getOrder: (orderId, options = {}) =>
      cache.read(ORDER_KEYS.detail(orderId), () => dataSource.getOrder(orderId), {
        ...options,
        ttlMs: ORDERS_TTL_MS,
      }),
    async cancelOrder(orderId) {
      await dataSource.cancelOrder(orderId);
      cache.invalidate(ORDER_KEYS.all);
    },
    invalidate: () => cache.invalidate(ORDER_KEYS.all),
  };
}

export const ordersRepository = createOrdersRepository();
