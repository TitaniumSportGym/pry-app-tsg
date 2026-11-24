import {
  parseAddresses,
  parseSavedAddress,
  toAddressPayload,
  type AddressInput,
} from '@/features/delivery/models/address';
import { parseDeliveryOptions } from '@/features/delivery/models/pickup-location';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';
import { isUuid } from '@/utils/uuid';

export async function getDeliveryOptions() {
  return parseDeliveryOptions(await apiRequest<unknown>('/api/delivery/options'));
}

export async function getMyAddresses() {
  return parseAddresses(await apiRequest<unknown>('/api/addresses/me'));
}

function addressPath(addressId: string) {
  if (!isUuid(addressId)) throw new ApiError('Dirección no encontrada.', 404);
  return `/api/addresses/me/${encodeURIComponent(addressId)}`;
}

async function saved(request: Promise<unknown>) {
  const address = parseSavedAddress(await request);
  if (!address) throw new ApiError('El servidor respondió con una dirección no válida.', 502);
  return address;
}

export function createAddress(input: AddressInput) {
  return saved(apiRequest('/api/addresses/me', { method: 'POST', body: toAddressPayload(input) }));
}

export function updateAddress(addressId: string, input: AddressInput) {
  return saved(apiRequest(addressPath(addressId), { method: 'PUT', body: toAddressPayload(input) }));
}

export async function deleteAddress(addressId: string) {
  await apiRequest(addressPath(addressId), { method: 'DELETE' });
}
