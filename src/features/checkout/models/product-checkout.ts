/**
 * Compra de productos: cotización (/api/checkout/product-quote) y checkout de Mercado Pago
 * (/api/checkout/products/mercadopago). El backend calcula todos los importes; la app solo
 * envía productos, cantidades y el método de entrega, nunca precios.
 */
import type { CartState } from '@/features/cart/models/cart';
import { onlyDigits, PHONE_DIGITS } from '@/features/delivery/models/address';

export interface CheckoutItem {
  productId: number;
  quantity: number;
}

export type FulfillmentRequest =
  | { method: 'pickup'; recipientName: string; phone: string }
  | { method: 'delivery'; addressId: string };

export interface ProductQuote {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  quoteToken: string;
  expiresAt: Date | null;
  /** Nombre de la tarifa aplicada ("Envío nacional"), si el backend lo envía. */
  shippingRateName: string | null;
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function amount(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toCheckoutItems(cart: CartState): CheckoutItem[] {
  return cart.map((item) => ({ productId: item.productId, quantity: item.quantity }));
}

/** Acepta la cotización en la raíz o dentro de `quote`; sin token o total no sirve para pagar. */
export function parseProductQuote(raw: unknown): ProductQuote | null {
  const quote = isRecord(raw) && isRecord(raw.quote) ? raw.quote : raw;
  if (!isRecord(quote) || typeof quote.quoteToken !== 'string' || !quote.quoteToken) return null;

  const total = amount(quote.total);
  if (total === null || total < 0) return null;

  const expires = typeof quote.expiresAt === 'string' ? new Date(quote.expiresAt) : null;
  const fulfillment = isRecord(quote.fulfillment) ? quote.fulfillment : {};
  // El backend envía la tarifa aplicada en fulfillment.rateSnapshot ({ name, amount, … }).
  const rate = isRecord(fulfillment.rateSnapshot)
    ? fulfillment.rateSnapshot
    : isRecord(fulfillment.shippingRate)
      ? fulfillment.shippingRate
      : {};
  const rateName =
    (typeof rate.name === 'string' && rate.name) ||
    (typeof fulfillment.shippingRateName === 'string' && fulfillment.shippingRateName) ||
    null;

  return {
    subtotal: amount(quote.subtotal) ?? 0,
    discountTotal: amount(quote.discountTotal) ?? 0,
    taxTotal: amount(quote.taxTotal) ?? 0,
    shippingTotal: amount(quote.shippingTotal) ?? 0,
    total,
    quoteToken: quote.quoteToken,
    expiresAt: expires && !Number.isNaN(expires.getTime()) ? expires : null,
    shippingRateName: rateName,
  };
}

/** Segundos que le quedan a la cotización; sin fecha de vencimiento se considera vigente. */
export function getQuoteSecondsLeft(quote: Pick<ProductQuote, 'expiresAt'>, now: number) {
  if (!quote.expiresAt) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((quote.expiresAt.getTime() - now) / 1000));
}

/** 872 → "14:32" */
export function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export interface RecipientInput {
  name: string;
  phone: string;
}

export function validateRecipient(input: RecipientInput) {
  const errors: { name?: string; phone?: string } = {};
  if (!input.name.trim()) errors.name = 'Escribe el nombre de quien recoge.';
  if (onlyDigits(input.phone, 99).length !== PHONE_DIGITS) errors.phone = 'Escribe un teléfono de 10 dígitos.';
  return errors;
}

/**
 * Lo que se cotiza: null mientras falten datos de entrega (nombre y teléfono para recoger,
 * dirección para envío). Siempre se manda lo mismo a la cotización y al checkout.
 */
export function buildFulfillmentRequest(
  method: 'pickup' | 'delivery',
  recipient: RecipientInput,
  addressId: string | null,
): FulfillmentRequest | null {
  if (method === 'delivery') return addressId ? { method, addressId } : null;
  if (Object.keys(validateRecipient(recipient)).length > 0) return null;
  return { method, recipientName: recipient.name.trim(), phone: onlyDigits(recipient.phone, PHONE_DIGITS) };
}

/** Identifica "exactamente la misma compra" para reutilizar la clave de idempotencia al reintentar. */
export function getPurchaseSignature(items: CheckoutItem[], fulfillment: FulfillmentRequest, quoteToken: string) {
  return `products:${JSON.stringify({ items, fulfillment, quoteToken })}`;
}

/** Cambia cuando cambian el carrito o la entrega: es momento de pedir otra cotización. */
export function getQuoteKey(items: CheckoutItem[], fulfillment: FulfillmentRequest | null) {
  return fulfillment ? JSON.stringify({ items, fulfillment }) : null;
}
