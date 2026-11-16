import { parseCheckoutResponse } from '@/features/memberships/models/checkout';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

export interface ProductCheckoutItem {
  productId: number;
  quantity: number;
}

export interface DeliveryAddress {
  recipientName: string;
  phone: string;
  postalCode: string;
  state: string;
  municipality: string;
  neighborhood: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;
  references: string;
}

export interface SavedDeliveryAddress extends DeliveryAddress {
  id: string;
  isDefault: boolean;
}

export type FulfillmentSelection =
  | { method: 'pickup'; recipientName: string; phone: string }
  | { method: 'delivery'; addressId: string }
  | { method: 'delivery'; address: DeliveryAddress };

export interface PickupLocation {
  name: string;
  address: string;
  phone: string;
  hours?: string;
  instructions?: string;
}

export interface ProductQuote {
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  shippingTotal: string;
  total: string;
  quoteToken: string;
  expiresAt: string;
}

export const EMPTY_DELIVERY_ADDRESS: DeliveryAddress = {
  recipientName: '',
  phone: '',
  postalCode: '',
  state: '',
  municipality: '',
  neighborhood: '',
  street: '',
  exteriorNumber: '',
  interiorNumber: null,
  references: '',
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/** Reject incomplete server quotes; the app must never invent a payable total. */
export function parseProductQuote(value: unknown): ProductQuote | null {
  const raw = record(value);
  if (!raw || raw.ok === false) return null;
  const fields = ['subtotal', 'discountTotal', 'taxTotal', 'shippingTotal', 'total'] as const;
  const amounts = {} as Pick<ProductQuote, typeof fields[number]>;
  for (const field of fields) {
    const amount = raw[field];
    if ((typeof amount !== 'string' && typeof amount !== 'number') ||
        !Number.isFinite(Number(amount)) || Number(amount) < 0) return null;
    amounts[field] = String(amount);
  }
  if (typeof raw.quoteToken !== 'string' || !raw.quoteToken ||
      typeof raw.expiresAt !== 'string' || !Number.isFinite(Date.parse(raw.expiresAt))) return null;
  return { ...amounts, quoteToken: raw.quoteToken, expiresAt: raw.expiresAt };
}

export function validateProductItems(items: readonly ProductCheckoutItem[]) {
  if (items.length === 0 || items.some(({ productId, quantity }) =>
    !Number.isSafeInteger(productId) || productId <= 0 ||
    !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 10)) {
    throw new ApiError('Revisa las cantidades de tu carrito antes de pagar.', 400);
  }
  return items.map(({ productId, quantity }) => ({ productId, quantity }));
}

export async function getDeliveryOptions(): Promise<PickupLocation | null> {
  const raw = record(await apiRequest<unknown>('/api/delivery/options'));
  const pickup = record(raw?.pickupLocation);
  if (!pickup) return null;
  if (typeof pickup.name !== 'string' || typeof pickup.address !== 'string' ||
      typeof pickup.phone !== 'string') return null;
  return {
    name: pickup.name,
    address: pickup.address,
    phone: pickup.phone,
    hours: typeof pickup.hours === 'string' ? pickup.hours : undefined,
    instructions: typeof pickup.instructions === 'string' ? pickup.instructions : undefined,
  };
}

export async function getSavedAddresses(): Promise<SavedDeliveryAddress[]> {
  const raw = record(await apiRequest<unknown>('/api/addresses/me'));
  if (!Array.isArray(raw?.addresses)) throw new ApiError('No se pudieron consultar las direcciones.', 502);
  return raw.addresses.filter((entry): entry is SavedDeliveryAddress => {
    const address = record(entry);
    return Boolean(address && typeof address.id === 'string' &&
      typeof address.recipientName === 'string' &&
      typeof address.postalCode === 'string');
  });
}

export async function quoteProductCheckout(items: readonly ProductCheckoutItem[], fulfillment: FulfillmentSelection) {
  const raw = await apiRequest<unknown>('/api/checkout/product-quote', {
    method: 'POST',
    body: { items: validateProductItems(items), fulfillment },
  });
  const quote = parseProductQuote(raw);
  if (!quote) throw new ApiError('El servidor no devolvió una cotización válida.', 502);
  return quote;
}

/** Price, discounts, shipping and inventory are authoritative on the server. */
export async function createProductCheckout(
  items: readonly ProductCheckoutItem[],
  fulfillment: FulfillmentSelection,
  quoteToken: string,
  idempotencyKey: string,
) {
  const raw = await apiRequest<unknown>('/api/checkout/products/mercadopago', {
    method: 'POST',
    body: { items: validateProductItems(items), fulfillment, quoteToken, idempotencyKey },
  });
  const result = parseCheckoutResponse(raw);
  if (!result?.orderId) throw new ApiError('No se obtuvo una orden válida de Mercado Pago.', 502);
  return { checkoutUrl: result.checkoutUrl, orderId: result.orderId };
}
