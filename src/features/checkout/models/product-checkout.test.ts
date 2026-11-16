import {
  buildFulfillmentRequest,
  formatCountdown,
  getPurchaseSignature,
  getQuoteKey,
  getQuoteSecondsLeft,
  parseProductQuote,
  toCheckoutItems,
  validateRecipient,
} from './product-checkout';

const ADDRESS_ID = '0b6f1c8e-6c1a-4d3e-9a51-1f2b3c4d5e6f';

describe('Cotización y checkout de productos', () => {
  it('solo manda id y cantidad de cada producto, nunca precios', () => {
    expect(
      toCheckoutItems([
        { productId: 101, quantity: 2, name: 'Creatina', price: 549, imageUrl: null, detail: '', stock: 5 },
      ]),
    ).toEqual([{ productId: 101, quantity: 2 }]);
  });

  it('lee la cotización en la raíz o dentro de quote y exige token y total', () => {
    const quote = parseProductQuote({
      subtotal: '839.00',
      discountTotal: 0,
      taxTotal: '115.72',
      shippingTotal: '149.00',
      total: '988.00',
      quoteToken: 'token-de-prueba',
      expiresAt: '2026-11-15T12:15:00.000Z',
      fulfillment: { method: 'delivery', shippingRate: { name: 'Envío nacional' } },
    });
    expect(quote).toMatchObject({ total: 988, shippingTotal: 149, taxTotal: 115.72, shippingRateName: 'Envío nacional' });
    expect(parseProductQuote({ ok: true, quote: { total: 10, quoteToken: 't' } })?.total).toBe(10);
    // Formato real del backend: la tarifa aplicada viene en fulfillment.rateSnapshot.
    expect(
      parseProductQuote({
        total: '729.00', shippingTotal: '230.00', quoteToken: 't',
        fulfillment: { method: 'delivery', rateSnapshot: { name: 'Tarifa fija nacional', amount: '230.00' } },
      })?.shippingRateName,
    ).toBe('Tarifa fija nacional');
    expect(parseProductQuote({ total: 10 })).toBeNull();
    expect(parseProductQuote({ total: 'x', quoteToken: 't' })).toBeNull();
  });

  it('calcula la vigencia restante y la muestra como mm:ss', () => {
    const quote = { expiresAt: new Date('2026-11-15T12:15:00.000Z') };
    const now = new Date('2026-11-15T12:00:28.000Z').getTime();
    expect(getQuoteSecondsLeft(quote, now)).toBe(872);
    expect(formatCountdown(872)).toBe('14:32');
    expect(getQuoteSecondsLeft(quote, now + 3_600_000)).toBe(0);
    expect(getQuoteSecondsLeft({ expiresAt: null }, now)).toBe(Number.POSITIVE_INFINITY);
  });

  it('no cotiza la recogida hasta tener nombre y teléfono válidos', () => {
    expect(validateRecipient({ name: '', phone: '77' })).toEqual({
      name: 'Escribe el nombre de quien recoge.',
      phone: 'Escribe un teléfono de 10 dígitos.',
    });
    expect(buildFulfillmentRequest('pickup', { name: 'Cliente', phone: '77' }, null)).toBeNull();
    expect(buildFulfillmentRequest('pickup', { name: ' Cliente ', phone: '771 123 4567' }, null)).toEqual({
      method: 'pickup',
      recipientName: 'Cliente',
      phone: '7711234567',
    });
  });

  it('envía a domicilio solo con una dirección elegida', () => {
    expect(buildFulfillmentRequest('delivery', { name: '', phone: '' }, null)).toBeNull();
    expect(buildFulfillmentRequest('delivery', { name: '', phone: '' }, ADDRESS_ID)).toEqual({
      method: 'delivery',
      addressId: ADDRESS_ID,
    });
  });

  it('identifica la misma compra para reutilizar la clave de idempotencia', () => {
    const items = [{ productId: 101, quantity: 1 }];
    const fulfillment = { method: 'delivery' as const, addressId: ADDRESS_ID };
    expect(getPurchaseSignature(items, fulfillment, 't1')).toBe(getPurchaseSignature(items, fulfillment, 't1'));
    expect(getPurchaseSignature(items, fulfillment, 't1')).not.toBe(getPurchaseSignature(items, fulfillment, 't2'));
    expect(getQuoteKey(items, null)).toBeNull();
    expect(getQuoteKey(items, fulfillment)).not.toBe(getQuoteKey([{ productId: 101, quantity: 2 }], fulfillment));
  });
});
