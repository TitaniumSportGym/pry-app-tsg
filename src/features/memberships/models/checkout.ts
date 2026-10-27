import { ApiError } from '@/types/auth';

/**
 * Membership checkout with Mercado Pago Checkout Pro, the same flow the website uses:
 * the backend creates the payment and returns a Mercado Pago URL; card data is
 * entered on Mercado Pago, never in the app.
 */

const TRUSTED_CHECKOUT_DOMAINS = [
  'mercadopago.com',
  'mercadopago.com.mx',
  'mercadolibre.com',
  'mercadolibre.com.mx',
];
const MAX_SHOWN_ERROR_LENGTH = 160;

export const CHECKOUT_GENERIC_ERROR =
  'No pudimos iniciar el pago. Inténtalo de nuevo en unos minutos.';
export const CHECKOUT_SESSION_ERROR = 'Tu sesión expiró. Inicia sesión de nuevo para comprar.';

/** Only https links to Mercado Pago (or its sandbox subdomains) are opened. */
export function isTrustedCheckoutUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;

  try {
    const { protocol, hostname } = new URL(url);
    const host = hostname.toLowerCase();
    return (
      protocol === 'https:' &&
      TRUSTED_CHECKOUT_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
    );
  } catch {
    return false;
  }
}

/** The checkout response must carry a trusted Mercado Pago URL. */
export function parseCheckoutResponse(raw: unknown) {
  const checkoutUrl =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>).checkoutUrl : null;

  return isTrustedCheckoutUrl(checkoutUrl) ? { checkoutUrl } : null;
}

function createKey() {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const idempotencyKeys = new Map<string, string>();

/**
 * Same key for repeated attempts at the same purchase, so a double tap or a
 * retry after a network error does not create two charges.
 */
export function getIdempotencyKey(signature: string) {
  const existing = idempotencyKeys.get(signature);
  if (existing) return existing;

  const key = createKey();
  idempotencyKeys.set(signature, key);
  return key;
}

export function forgetIdempotencyKey(signature: string) {
  idempotencyKeys.delete(signature);
}

/**
 * Business messages from the backend (4xx, e.g. "ya tienes una membresía activa")
 * are shown; server errors and network failures get a generic message.
 */
export function getCheckoutErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return CHECKOUT_GENERIC_ERROR;
  if (error.status === 401) return CHECKOUT_SESSION_ERROR;

  const isClientError = error.status >= 400 && error.status < 500;
  const message = error.message.trim();

  return isClientError && message && message.length <= MAX_SHOWN_ERROR_LENGTH
    ? message
    : CHECKOUT_GENERIC_ERROR;
}
