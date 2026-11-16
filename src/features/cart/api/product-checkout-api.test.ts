import { apiRequest } from '@/services/apiClient';

import {
  createProductCheckout,
  getDeliveryOptions,
  parseProductQuote,
  quoteProductCheckout,
  validateProductItems,
} from './product-checkout-api';

jest.mock('@/services/apiClient', () => ({ apiRequest: jest.fn() }));

const items = [{ productId: 12, quantity: 2 }];
const pickup = { method: 'pickup' as const, recipientName: 'Cliente de prueba', phone: '7711234567' };
const quote = {
  ok: true, subtotal: '450.00', discountTotal: '20.00',
  taxTotal: '0.00', shippingTotal: '0.00', total: '430.00',
  quoteToken: 'signed-quote-value', expiresAt: '2030-01-01T00:00:00.000Z',
};

describe('cotización y pago de productos', () => {
  beforeEach(() => jest.clearAllMocks());

  it('no acepta una cotización sin precio o sin firma', () => {
    expect(parseProductQuote({ ...quote, quoteToken: null })).toBeNull();
    expect(parseProductQuote({ ...quote, total: 'incorrecto' })).toBeNull();
    expect(parseProductQuote({ ...quote, total: '-20.00' })).toBeNull();
    expect(parseProductQuote(quote)).toEqual({
      subtotal: '450.00', discountTotal: '20.00', taxTotal: '0.00',
      shippingTotal: '0.00', total: '430.00',
      quoteToken: 'signed-quote-value', expiresAt: '2030-01-01T00:00:00.000Z',
    });
  });

  it('rechaza cantidades inválidas antes de contactar el servidor', () => {
    expect(() => validateProductItems([])).toThrow();
    expect(() => validateProductItems([{ productId: 1, quantity: 0 }])).toThrow();
    expect(() => validateProductItems([{ productId: 1, quantity: 11 }])).toThrow();
    expect(() => validateProductItems(items)).not.toThrow();
  });

  it('envía productos y método de entrega para cotización autoritativa', async () => {
    jest.mocked(apiRequest).mockResolvedValueOnce(quote);
    const result = await quoteProductCheckout(items, pickup);
    expect(result.total).toBe('430.00');
    expect(apiRequest).toHaveBeenCalledWith('/api/checkout/product-quote', {
      method: 'POST', body: { items, fulfillment: pickup },
    });
  });

  it('crea orden con cotización e idempotencia, sin precio suministrado por el móvil', async () => {
    const orderId = 'f09a7a9b-8cb4-4119-ab5e-8c93afddf35a';
    jest.mocked(apiRequest).mockResolvedValueOnce({
      ok: true, orderId, checkoutUrl: 'https://www.mercadopago.com.mx/checkout/v1/redirect',
    });
    await expect(createProductCheckout(items, pickup, quote.quoteToken, 'uuid-idempotente')).resolves.toEqual({
      orderId, checkoutUrl: 'https://www.mercadopago.com.mx/checkout/v1/redirect',
    });
    expect(apiRequest).toHaveBeenCalledWith('/api/checkout/products/mercadopago', {
      method: 'POST',
      body: { items, fulfillment: pickup, quoteToken: quote.quoteToken, idempotencyKey: 'uuid-idempotente' },
    });
  });

  it('rechaza enlaces de cobro de dominios no confiables', async () => {
    jest.mocked(apiRequest).mockResolvedValueOnce({
      orderId: 'f09a7a9b-8cb4-4119-ab5e-8c93afddf35a',
      checkoutUrl: 'https://mercadopago.com.mx.ejemplo-falso.com/',
    });
    await expect(createProductCheckout(items, pickup, quote.quoteToken, 'key')).rejects.toThrow();
  });

  it('consulta ubicación real de recogida sin inventar sucursal', async () => {
    jest.mocked(apiRequest).mockResolvedValueOnce({
      ok: true, pickupLocation: { name: 'Titanium Sport Gym', address: 'Ubicación desde backend', phone: '7711234567' },
    });
    await expect(getDeliveryOptions()).resolves.toEqual({
      name: 'Titanium Sport Gym', address: 'Ubicación desde backend', phone: '7711234567',
      hours: undefined, instructions: undefined,
    });
  });
});
