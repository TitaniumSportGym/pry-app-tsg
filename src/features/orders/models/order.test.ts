import { getFulfillmentLabel, getFulfillmentTone } from './fulfillment-status';
import {
  buildTimeline,
  canCancelOrder,
  getDeliverySummary,
  getItemCountLabel,
  getLegacyOrderLabel,
  isAwaitingPayment,
  matchesOrderFilter,
  parseClientOrder,
  parseClientOrders,
  type OrderFulfillment,
} from './order';
import { getTotalsRows } from './order-presentation';

// Datos sintéticos de prueba; no son de clientes reales.
const ORDER_ID = '3f2b1a0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c';

function rawOrder(fulfillment: unknown = null, overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    orderNumber: '8F2K71',
    status: 'paid',
    createdAt: '2026-11-03T18:10:00.000Z',
    subtotal: '839.00',
    taxTotal: '115.72',
    shippingTotal: '149.00',
    total: '988.00',
    items: [
      { id: 'i1', itemType: 'product', productId: 101, quantity: 1, unitPrice: '650.00', snapshot: { name: 'Proteína Whey' } },
      { id: 'i2', itemType: 'product', productId: 102, quantity: 2, unitPrice: '94.50', productName: 'Shaker' },
      { id: 'm1', itemType: 'membership', quantity: 1 },
    ],
    payments: [{ id: 'p1', amount: '988.00', status: 'approved', paidAt: '2026-11-03T18:12:00.000Z' }],
    fulfillment,
    ...overrides,
  };
}

const delivery = (status: string, events: { status: string; createdAt: string }[] = []) => ({
  method: 'delivery',
  status,
  recipientName: 'Cliente Ejemplo',
  phone: '7711234567',
  addressSnapshot: {
    street: 'Calle Ejemplo', exteriorNumber: '12', neighborhood: 'Centro',
    municipality: 'Huejutla de Reyes', state: 'Hidalgo', postalCode: '43000',
  },
  carrier: 'Estafeta',
  trackingNumber: '701234567890',
  events,
});

describe('Pedidos del cliente', () => {
  it('lee el pedido, ignora renglones de membresía y toma el pago más reciente', () => {
    const order = parseClientOrder({ ok: true, order: rawOrder(delivery('shipped')) })!;
    expect(order.items.map((item) => [item.name, item.quantity, item.lineTotal])).toEqual([
      ['Proteína Whey', 1, 650],
      ['Shaker', 2, 189],
    ]);
    expect(order.payment?.status).toBe('paid');
    expect(order.fulfillment?.addressLine).toBe('Calle Ejemplo 12, Col. Centro, Huejutla de Reyes, Hidalgo · CP 43000');
    expect(getItemCountLabel(order)).toBe('3 productos');
    expect(getDeliverySummary(order)).toBe('Envío a domicilio');
  });

  it('acepta pedidos antiguos sin seguimiento y descarta ids inválidos', () => {
    const orders = parseClientOrders({ orders: [rawOrder(null), { id: 'x' }, null] });
    expect(orders).toHaveLength(1);
    expect(orders[0].fulfillment).toBeNull();
    expect(getDeliverySummary(orders[0])).toBe('Pedido anterior · sin seguimiento');
    expect(getTotalsRows(orders[0]).map((row) => row.label)).toEqual(['Subtotal', 'IVA incluido']);
  });

  it('lee el formato real de /api/orders/me: itemNameSnapshot y pending_payment sin seguimiento', () => {
    const order = parseClientOrder(
      rawOrder(null, {
        status: 'pending_payment',
        items: [{ id: 'i1', itemType: 'product', productId: 153, quantity: 3, unitPrice: '499.00', subtotal: '1497.00', itemNameSnapshot: 'Creatina de prueba 400 g', product: { id: 238, name: 'Otro nombre' } }],
      }),
    )!;
    expect(order.items[0]).toMatchObject({ name: 'Creatina de prueba 400 g', quantity: 3, lineTotal: 1497 });
    expect(isAwaitingPayment(order)).toBe(true);
    expect(canCancelOrder(order)).toBe(true);
    expect(getLegacyOrderLabel(order.orderStatus)).toBe('Pendiente de pago');
    expect(matchesOrderFilter(order, 'active')).toBe(true);
    expect(getLegacyOrderLabel('paid')).toBe('Pagado');
  });

  it('usa las etiquetas exactas del backend', () => {
    expect(getFulfillmentLabel('delivery_failed')).toBe('Entrega no realizada');
    expect(getFulfillmentLabel('cancelled')).toBe('Entrega cancelada');
    expect(getFulfillmentTone('delivery_failed')).toBe('error');
  });

  it('marca la línea de tiempo del envío: completos, actual y pendientes con fecha y guía', () => {
    const fulfillment = parseClientOrder(
      rawOrder(delivery('shipped', [
        { status: 'payment_confirmed', createdAt: '2026-11-03T18:12:00.000Z' },
        { status: 'shipped', createdAt: '2026-11-04T19:20:00.000Z' },
      ])),
    )!.fulfillment as OrderFulfillment;
    const timeline = buildTimeline(fulfillment);
    expect(timeline.map((step) => `${step.status}:${step.state}`)).toEqual([
      'awaiting_payment:done', 'payment_confirmed:done', 'preparing:done',
      'packed:done', 'shipped:current', 'delivered:pending',
    ]);
    expect(timeline[4].detail).toBe('Estafeta · Guía 701234567890');
    expect(timeline[1].date?.toISOString()).toBe('2026-11-03T18:12:00.000Z');
    expect(timeline[5].date).toBeNull();
  });

  it('da por terminado el último paso entregado o recogido', () => {
    const pickup = { ...delivery('picked_up'), method: 'pickup' };
    const steps = buildTimeline(parseClientOrder(rawOrder(pickup))!.fulfillment!);
    expect(steps.map((step) => step.status)).toEqual([
      'awaiting_payment', 'payment_confirmed', 'preparing', 'ready_for_pickup', 'picked_up',
    ]);
    expect(steps.every((step) => step.state === 'done')).toBe(true);
  });

  it('cierra con el problema en rojo después del último paso alcanzado', () => {
    const failed = parseClientOrder(
      rawOrder(delivery('delivery_failed', [
        { status: 'shipped', createdAt: '2026-11-04T19:20:00.000Z' },
        { status: 'delivery_failed', createdAt: '2026-11-05T21:40:00.000Z' },
      ])),
    )!.fulfillment!;
    const steps = buildTimeline(failed);
    expect(steps.at(-1)).toMatchObject({ status: 'delivery_failed', label: 'Entrega no realizada', state: 'error' });
    expect(steps.map((step) => step.status)).not.toContain('delivered');
  });

  it('ofrece cancelar solo mientras falta el pago y filtra por estado', () => {
    const pending = parseClientOrder(rawOrder(delivery('awaiting_payment'), { status: 'pending' }))!;
    const delivered = parseClientOrder(rawOrder(delivery('delivered')))!;
    const cancelled = parseClientOrder(rawOrder(delivery('cancelled'), { status: 'cancelled' }))!;
    expect(canCancelOrder(pending)).toBe(true);
    expect(canCancelOrder(delivered)).toBe(false);
    expect(matchesOrderFilter(pending, 'active')).toBe(true);
    expect(matchesOrderFilter(delivered, 'completed')).toBe(true);
    expect(matchesOrderFilter(cancelled, 'cancelled')).toBe(true);
    expect(matchesOrderFilter(cancelled, 'active')).toBe(false);
  });
});
