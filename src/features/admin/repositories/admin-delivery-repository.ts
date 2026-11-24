import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import * as adminDeliveryApi from '@/features/admin/api/admin-delivery-api';
import type { FulfillmentUpdateInput } from '@/features/admin/models/fulfillment-update';
import type { PickupSettings } from '@/features/admin/models/pickup-point';
import type { ShippingRateInput } from '@/features/admin/models/shipping-rate';
import { ADMIN_KEYS } from '@/features/admin/repositories/admin-repository';
import { DELIVERY_KEYS } from '@/features/delivery/repositories/delivery-repository';

const PICKUP_TTL_MS = 60_000;
export const PICKUP_SETTINGS_KEY = 'admin:pickup-settings';

export interface AdminDeliveryDataSource {
  getPickupSettings(): Promise<PickupSettings>;
  updatePickupSettings(settings: PickupSettings): Promise<PickupSettings>;
  createShippingRate(input: ShippingRateInput): Promise<void>;
  updateShippingRate(rateId: string, input: Partial<ShippingRateInput>): Promise<void>;
  updateOrderFulfillment(orderId: string, input: FulfillmentUpdateInput): Promise<void>;
}

/**
 * Escrituras de entregas del administrador. Cada cambio invalida las lecturas que dependen de
 * él (Observer): la lista de tarifas, los contadores del menú, los pedidos y lo que ve el cliente.
 */
export function createAdminDeliveryRepository(
  dataSource: AdminDeliveryDataSource = adminDeliveryApi,
  cache: RepositoryCache = repositoryCache,
) {
  const afterRates = () => {
    cache.invalidate(ADMIN_KEYS.shippingRates);
    cache.invalidate(ADMIN_KEYS.catalogCounts);
  };

  return {
    getPickupSettings: (options: ReadOptions = {}) =>
      cache.read(PICKUP_SETTINGS_KEY, () => dataSource.getPickupSettings(), { ...options, ttlMs: PICKUP_TTL_MS }),
    async savePickupSettings(settings: PickupSettings) {
      const saved = await dataSource.updatePickupSettings(settings);
      cache.invalidate(PICKUP_SETTINGS_KEY);
      cache.invalidate(DELIVERY_KEYS.options);
      return saved;
    },
    async saveShippingRate(input: ShippingRateInput, rateId?: string) {
      if (rateId) await dataSource.updateShippingRate(rateId, input);
      else await dataSource.createShippingRate(input);
      afterRates();
    },
    async setShippingRateActive(rateId: string, active: boolean) {
      await dataSource.updateShippingRate(rateId, { active });
      afterRates();
    },
    async updateFulfillment(orderId: string, input: FulfillmentUpdateInput) {
      await dataSource.updateOrderFulfillment(orderId, input);
      cache.invalidate(ADMIN_KEYS.orders);
    },
  };
}

export const adminDeliveryRepository = createAdminDeliveryRepository();
