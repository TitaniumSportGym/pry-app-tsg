import {
  toFulfillmentUpdatePayload,
  type FulfillmentUpdateInput,
} from '@/features/admin/models/fulfillment-update';
import {
  parsePickupSettings,
  toPickupSettingsPayload,
  type PickupSettings,
} from '@/features/admin/models/pickup-point';
import { toShippingRatePayload, type ShippingRateInput } from '@/features/admin/models/shipping-rate';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';
import { isUuid } from '@/utils/uuid';

/** Escrituras del administrador sobre entregas: punto de recogida, tarifas y estado logístico. */

export async function getPickupSettings() {
  return parsePickupSettings(await apiRequest<unknown>('/api/admin/pickup-settings'));
}

export async function updatePickupSettings(settings: PickupSettings) {
  return parsePickupSettings(
    await apiRequest<unknown>('/api/admin/pickup-settings', {
      method: 'PUT',
      body: toPickupSettingsPayload(settings),
    }),
  );
}

function checkedId(id: string, message: string) {
  if (!isUuid(id)) throw new ApiError(message, 404);
  return encodeURIComponent(id);
}

export async function createShippingRate(input: ShippingRateInput) {
  await apiRequest('/api/admin/shipping-rates', { method: 'POST', body: toShippingRatePayload(input) });
}

export async function updateShippingRate(rateId: string, input: Partial<ShippingRateInput>) {
  const full = 'name' in input && 'amount' in input;
  await apiRequest(`/api/admin/shipping-rates/${checkedId(rateId, 'Tarifa no encontrada.')}`, {
    method: 'PATCH',
    // PATCH acepta cambios parciales (p. ej. solo { active } desde el interruptor de la lista).
    body: full ? toShippingRatePayload(input as ShippingRateInput) : input,
  });
}

export async function updateOrderFulfillment(orderId: string, input: FulfillmentUpdateInput) {
  await apiRequest(`/api/admin/orders/${checkedId(orderId, 'Pedido no encontrado.')}/fulfillment`, {
    method: 'PATCH',
    body: toFulfillmentUpdatePayload(input),
  });
}
