import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import * as deliveryApi from '@/features/delivery/api/delivery-api';
import type { Address, AddressInput } from '@/features/delivery/models/address';
import type { PickupLocation } from '@/features/delivery/models/pickup-location';

const ADDRESSES_TTL_MS = 5 * 60_000;
/** El punto de recogida casi no cambia, pero el administrador puede desactivarlo. */
const OPTIONS_TTL_MS = 10 * 60_000;

export const DELIVERY_KEYS = {
  all: 'delivery',
  addresses: 'delivery:addresses',
  options: 'delivery:options',
} as const;

export interface DeliveryDataSource {
  getDeliveryOptions(): Promise<{ pickupLocation: PickupLocation | null }>;
  getMyAddresses(): Promise<Address[]>;
  createAddress(input: AddressInput): Promise<Address>;
  updateAddress(addressId: string, input: AddressInput): Promise<Address>;
  deleteAddress(addressId: string): Promise<void>;
}

export interface DeliveryRepository {
  getOptions(options?: ReadOptions): Promise<{ pickupLocation: PickupLocation | null }>;
  getAddresses(options?: ReadOptions): Promise<Address[]>;
  /** Crea (sin id) o edita una dirección; las pantallas abiertas recargan la lista. */
  saveAddress(input: AddressInput, addressId?: string): Promise<Address>;
  deleteAddress(addressId: string): Promise<void>;
}

export function createDeliveryRepository(
  dataSource: DeliveryDataSource = deliveryApi,
  cache: RepositoryCache = repositoryCache,
): DeliveryRepository {
  return {
    getOptions: (options = {}) =>
      cache.read(DELIVERY_KEYS.options, () => dataSource.getDeliveryOptions(), {
        ...options,
        ttlMs: OPTIONS_TTL_MS,
      }),
    getAddresses: (options = {}) =>
      cache.read(DELIVERY_KEYS.addresses, () => dataSource.getMyAddresses(), {
        ...options,
        ttlMs: ADDRESSES_TTL_MS,
      }),
    async saveAddress(input, addressId) {
      const address = addressId
        ? await dataSource.updateAddress(addressId, input)
        : await dataSource.createAddress(input);
      cache.invalidate(DELIVERY_KEYS.addresses);
      return address;
    },
    async deleteAddress(addressId) {
      await dataSource.deleteAddress(addressId);
      cache.invalidate(DELIVERY_KEYS.addresses);
    },
  };
}

export const deliveryRepository = createDeliveryRepository();
