import { ApiError } from '@/types/auth';

import {
  CHECKOUT_GENERIC_ERROR,
  CHECKOUT_SESSION_ERROR,
  forgetIdempotencyKey,
  getCheckoutErrorMessage,
  getIdempotencyKey,
  isTrustedCheckoutUrl,
  parseCheckoutResponse,
} from './checkout';

describe('isTrustedCheckoutUrl', () => {
  it('acepta solo enlaces https de Mercado Pago', () => {
    expect(
      isTrustedCheckoutUrl('https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=1'),
    ).toBe(true);
    expect(isTrustedCheckoutUrl('https://sandbox.mercadopago.com.mx/checkout/v1/redirect')).toBe(
      true,
    );
    expect(isTrustedCheckoutUrl('http://www.mercadopago.com.mx/checkout')).toBe(false);
    expect(isTrustedCheckoutUrl('https://mercadopago.com.mx.sitio-falso.com/pagar')).toBe(false);
    expect(isTrustedCheckoutUrl('https://falso-mercadopago.com.mx/pagar')).toBe(false);
    expect(isTrustedCheckoutUrl('javascript:alert(1)')).toBe(false);
    expect(isTrustedCheckoutUrl(null)).toBe(false);
  });

  it('descarta respuestas sin un enlace confiable', () => {
    expect(parseCheckoutResponse({ checkoutUrl: 'https://www.mercadopago.com.mx/x' })).toEqual({
      checkoutUrl: 'https://www.mercadopago.com.mx/x',
    });
    expect(parseCheckoutResponse({ checkoutUrl: 'https://evil.com' })).toBeNull();
    expect(parseCheckoutResponse({})).toBeNull();
  });
});

describe('getIdempotencyKey', () => {
  it('reutiliza la llave para el mismo intento y la renueva al olvidarla', () => {
    const first = getIdempotencyKey('membership:plan-1');

    expect(getIdempotencyKey('membership:plan-1')).toBe(first);
    expect(getIdempotencyKey('membership:plan-2')).not.toBe(first);

    forgetIdempotencyKey('membership:plan-1');
    expect(getIdempotencyKey('membership:plan-1')).not.toBe(first);
  });
});

describe('getCheckoutErrorMessage', () => {
  it('muestra los mensajes de negocio del backend', () => {
    expect(getCheckoutErrorMessage(new ApiError('Ya tienes una membresía activa', 409))).toBe(
      'Ya tienes una membresía activa',
    );
  });

  it('oculta errores internos y de conexión', () => {
    expect(getCheckoutErrorMessage(new ApiError('relation "orders" does not exist', 500))).toBe(
      CHECKOUT_GENERIC_ERROR,
    );
    expect(getCheckoutErrorMessage(new TypeError('Network request failed'))).toBe(
      CHECKOUT_GENERIC_ERROR,
    );
    expect(getCheckoutErrorMessage(new ApiError('jwt expired', 401))).toBe(CHECKOUT_SESSION_ERROR);
  });
});
