import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import {
  getAdminOrders,
  getAdminPayments,
  getAdminProducts,
  getAdminRoutines,
  getAdminShippingRates,
  getAdminUsers,
} from '@/features/admin/api/admin-api';
import { parseAdminMembers, type AdminMember } from '@/features/admin/models/admin-member';
import { parseAdminOrders, type AdminOrder } from '@/features/admin/models/admin-order';
import { parseShippingRates, type ShippingRate } from '@/features/admin/models/shipping-rate';

/** Pedidos y pagos cambian durante el día (Mercado Pago, clientes comprando): un minuto basta. */
const ADMIN_TTL_MS = 60_000;

export const ADMIN_KEYS = {
  all: 'admin',
  members: 'admin:members',
  orders: 'admin:orders',
  payments: 'admin:payments',
  catalogCounts: 'admin:catalog-counts',
  shippingRates: 'admin:shipping-rates',
} as const;

export interface AdminCatalogCounts {
  products: number;
  activeShippingRates: number;
  routines: number;
}

export interface AdminRepository {
  getMembers(options?: ReadOptions): Promise<AdminMember[]>;
  getOrders(options?: ReadOptions): Promise<AdminOrder[]>;
  /** Pagos crudos más recientes; el tablero solo los resume. */
  getPayments(options?: ReadOptions): Promise<unknown>;
  getCatalogCounts(options?: ReadOptions): Promise<AdminCatalogCounts>;
  getShippingRates(options?: ReadOptions): Promise<ShippingRate[]>;
}

export interface AdminDataSource {
  getAdminUsers(): Promise<unknown>;
  getAdminOrders(): Promise<unknown>;
  getAdminPayments(): Promise<unknown>;
  getAdminProducts(): Promise<unknown>;
  getAdminShippingRates(): Promise<unknown>;
  getAdminRoutines(): Promise<unknown>;
}

const countActive = (rates: unknown) =>
  Array.isArray(rates)
    ? rates.filter((rate) => (rate as Record<string, unknown> | null)?.active === true).length
    : 0;

export function createAdminRepository(
  dataSource: AdminDataSource = {
    getAdminUsers,
    getAdminOrders,
    getAdminPayments,
    getAdminProducts,
    getAdminShippingRates,
    getAdminRoutines,
  },
  cache: RepositoryCache = repositoryCache,
): AdminRepository {
  const read = <T>(key: string, fetcher: () => Promise<T>, options: ReadOptions = {}) =>
    cache.read(key, fetcher, { ...options, ttlMs: ADMIN_TTL_MS });

  return {
    getMembers: (options) =>
      read(ADMIN_KEYS.members, async () => parseAdminMembers(await dataSource.getAdminUsers()), options),
    getOrders: (options) =>
      read(ADMIN_KEYS.orders, async () => parseAdminOrders(await dataSource.getAdminOrders()), options),
    getPayments: (options) => read(ADMIN_KEYS.payments, () => dataSource.getAdminPayments(), options),
    getCatalogCounts: (options) =>
      read(
        ADMIN_KEYS.catalogCounts,
        async () => {
          const [products, rates, routines] = await Promise.all([
            dataSource.getAdminProducts(),
            dataSource.getAdminShippingRates(),
            dataSource.getAdminRoutines(),
          ]);
          return {
            products: Array.isArray(products) ? products.length : 0,
            activeShippingRates: countActive(rates),
            routines: Array.isArray(routines) ? routines.length : 0,
          };
        },
        options,
      ),
    getShippingRates: (options) =>
      read(
        ADMIN_KEYS.shippingRates,
        async () => parseShippingRates(await dataSource.getAdminShippingRates()),
        options,
      ),
  };
}

export const adminRepository = createAdminRepository();
