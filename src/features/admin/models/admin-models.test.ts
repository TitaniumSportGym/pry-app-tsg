import { summarizeOrders, summarizePayments } from './admin-dashboard';
import { formatRelativeDateTime, getAvatarInitials } from './admin-format';
import { parseAdminMembers, searchMembers, summarizeMembers } from './admin-member';
import { getAdminMenu } from './admin-more-menu';
import {
  getNextStep,
  getTransitionOptions,
  isInGroup,
  parseAdminOrders,
  searchOrders,
} from './admin-order';
import { parseShippingRates, sortShippingRates } from './shipping-rate';

// Formas tomadas de /api/admin/orders, /api/admin/users y /api/admin/shipping-rates (nov 2026).
const deliveryOrder = {
  id: 'o-1',
  orderNumber: 'ORD-2026-000268',
  total: '629.00',
  paidAt: '2026-11-03T20:38:16.607Z',
  customer: { id: 'c-1', email: 'rogelio@gmail.com', role: 'cliente' },
  items: [{ quantity: 1 }, { quantity: 2 }],
  fulfillment: {
    method: 'delivery',
    status: 'payment_confirmed',
    recipientName: 'ROGELIO HERNANDEZ VERA',
    addressSnapshot: { municipality: 'Platon Sanchez', state: 'Veracruz', postalCode: '92146' },
    trackingNumber: null,
    allowedTransitions: ['preparing', 'incident', 'cancelled'],
  },
};
const pickupOrder = {
  ...deliveryOrder,
  id: 'o-2',
  orderNumber: 'ORD-2026-000270',
  fulfillment: {
    ...deliveryOrder.fulfillment,
    method: 'pickup',
    status: 'ready_for_pickup',
    addressSnapshot: null,
    allowedTransitions: ['picked_up', 'cancelled'],
  },
};
const membershipOrder = { id: 'o-3', orderNumber: 'ORD-2026-000271', fulfillment: null };

describe('pedidos del administrador', () => {
  const orders = parseAdminOrders([deliveryOrder, pickupOrder, membershipOrder, null]);

  it('solo conserva los pedidos con entrega y arma su destino', () => {
    expect(orders.map((order) => order.id)).toEqual(['o-1', 'o-2']);
    expect(orders[0]).toMatchObject({
      total: 629,
      itemCount: 3,
      initials: 'RH',
      destination: 'Platon Sanchez, Veracruz · CP 92146',
    });
    expect(orders[1].destination).toBe('a nombre de ROGELIO HERNANDEZ VERA');
  });

  it('propone el siguiente paso sin ofrecer incidencia ni cancelación como acción principal', () => {
    expect(getNextStep(orders[0])).toEqual({ status: 'preparing', label: 'Marcar en preparación' });
    expect(getNextStep(orders[1])).toEqual({ status: 'picked_up', label: 'Marcar recogido' });
    expect(getTransitionOptions(orders[0]).map((option) => option.isProblem)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it('agrupa por estado logístico y busca por número o cliente', () => {
    expect(isInGroup(orders[0], 'to_prepare')).toBe(true);
    expect(isInGroup(orders[1], 'ready')).toBe(true);
    expect(searchOrders(orders, '000270').map((order) => order.id)).toEqual(['o-2']);
    expect(searchOrders(orders, 'rogelio')).toHaveLength(2);
  });

  it('cuenta los pendientes del inicio', () => {
    expect(summarizeOrders(orders)).toEqual({ toPrepare: 1, readyForPickup: 1, packedWithoutTracking: 0 });
  });
});

describe('pagos del tablero', () => {
  it('suma solo los pagos aprobados de hoy y cuenta los pendientes', () => {
    const now = new Date('2026-11-03T22:00:00');
    const summary = summarizePayments(
      [
        { status: 'paid', date: new Date('2026-11-03T10:00:00').toISOString(), netAmount: 629 },
        { status: 'paid', date: new Date('2026-11-02T10:00:00').toISOString(), netAmount: 500 },
        { status: 'pending', date: new Date('2026-11-03T11:00:00').toISOString(), amount: 99 },
      ],
      now,
    );
    expect(summary).toEqual({ salesToday: 629, paidTodayCount: 1, pendingCount: 1 });
  });
});

describe('socios', () => {
  const members = parseAdminMembers([
    { id: 'u-1', email: '20230008@uthh.edu.mx', role: 'cliente', isVerified: true, createdAt: '2026-11-01T00:00:00Z' },
    { id: 'u-2', email: 'ana.ramirez@gmail.com', role: 'cliente', isVerified: false },
    { id: 'u-3', email: 'coach@titanium.com', role: 'entrenador', isVerified: true },
  ]);

  it('solo incluye clientes y resume la verificación', () => {
    expect(members.map((member) => member.memberId)).toEqual(['20230008', 'ana.ramirez']);
    expect(summarizeMembers(members)).toEqual({ total: 2, verified: 1, unverified: 1 });
    expect(searchMembers(members, '2023')).toHaveLength(1);
  });
});

describe('tarifas de envío', () => {
  it('lee los importes y muestra primero las activas', () => {
    const rates = parseShippingRates([
      { id: 'r-2', name: 'Sintética', postalCodeFrom: '00001', postalCodeTo: '00001', amount: '75.00', active: false },
      { id: 'r-1', name: 'Tarifa fija nacional', postalCodeFrom: '00000', postalCodeTo: '99999', amount: '230.00', active: true },
    ]);
    expect(sortShippingRates(rates).map((rate) => [rate.id, rate.amount])).toEqual([
      ['r-1', 230],
      ['r-2', 75],
    ]);
  });
});

describe('formato y menú', () => {
  it('formatea fechas relativas y obtiene iniciales', () => {
    const now = new Date('2026-11-03T18:00:00');
    expect(formatRelativeDateTime(new Date('2026-11-03T12:12:00'), now)).toBe('hoy · 12:12 p.m.');
    expect(formatRelativeDateTime(new Date('2026-11-02T18:15:00'), now)).toBe('ayer · 6:15 p.m.');
    expect(getAvatarInitials('Juan Manuel Castro')).toBe('JM');
    expect(getAvatarInitials('admin@titanium.com')).toBe('AD');
  });

  it('muestra contadores solo cuando ya cargaron', () => {
    const shipping = (counts: Parameters<typeof getAdminMenu>[0]) =>
      getAdminMenu(counts)[0].items.find((item) => item.id === 'shipping-rates');
    expect(shipping(null)?.meta).toBeUndefined();
    expect(shipping({ products: 163, activeShippingRates: 1, routines: 0, plans: 10 })?.meta).toBe('1 activa');
  });
});
