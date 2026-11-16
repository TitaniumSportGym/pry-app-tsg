import {
  parseProductQuote,
  type CheckoutItem,
  type FulfillmentRequest,
} from '@/features/checkout/models/product-checkout';
import { parseCheckoutResponse } from '@/features/memberships/models/checkout';
import { apiRequest } from '@/services/apiClient';
import { MOBILE_CLIENT } from '@/services/mercado-pago-browser';
import { ApiError } from '@/types/auth';

/** Calcula productos y envío sin crear orden ni cobrar. */
export async function requestProductQuote(items: CheckoutItem[], fulfillment: FulfillmentRequest) {
  const quote = parseProductQuote(
    await apiRequest<unknown>('/api/checkout/product-quote', {
      method: 'POST',
      body: { items, fulfillment },
    }),
  );
  if (!quote) throw new ApiError('El servidor respondió con una cotización no válida.', 502);
  return quote;
}

interface ProductCheckoutRequest {
  idempotencyKey: string;
  items: CheckoutItem[];
  fulfillment: FulfillmentRequest;
  quoteToken: string;
}

/**
 * Crea la orden y la preferencia de Mercado Pago. Solo se abre un enlace https de Mercado Pago;
 * el pago se confirma después consultando el estado al servidor.
 */
export async function createProductCheckout(request: ProductCheckoutRequest) {
  const checkout = parseCheckoutResponse(
    await apiRequest<unknown>('/api/checkout/products/mercadopago', {
      method: 'POST',
      body: { ...request, client: MOBILE_CLIENT },
    }),
  );
  if (!checkout) throw new ApiError('Mercado Pago no devolvió un enlace de pago válido.', 502);
  return checkout;
}
