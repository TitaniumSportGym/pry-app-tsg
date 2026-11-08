import { adminMember, adminOrder } from '../../../../tests/support/admin-fixtures';

import { summarizePayments } from './admin-dashboard';
import { formatRelativeDateTime, formatTime, getAvatarInitials, parseAmount, parseDate } from './admin-format';
import { parseAdminMembers, sortMembersByNewest } from './admin-member';
import { getAdminMenu } from './admin-more-menu';
import { getFulfillmentLabel, getFulfillmentTone, getNextStep, getTransitionOptions, parseAdminOrder, parseAdminOrders } from './admin-order';
import { parseShippingRates, sortShippingRates } from './shipping-rate';

describe('Admin contracts with incomplete or future API data', () => {
  it('rejects invalid members, non-client roles and missing identifiers', () => {
    expect(parseAdminMembers(undefined)).toEqual([]);
    expect(parseAdminMembers([null, 42, {}, { id: 1, email: 'a' }, { id: '1' }, { ...adminMember(), role: 'administrador' }])).toEqual([]);
    const members = parseAdminMembers([
      { ...adminMember('old'), createdAt: '2026-01-01' },
      { ...adminMember('missing'), createdAt: null },
      { ...adminMember('new'), createdAt: '2026-11-01' },
    ]);
    expect(sortMembersByNewest(members).map(member => member.id)).toEqual(['new', 'old', 'missing']);
    expect(members.map(member => member.id)).toEqual(['old', 'missing', 'new']);
  });

  it('rejects invalid orders and handles missing optional fields without inventing a recipient', () => {
    expect(parseAdminOrders({ orders: [] })).toEqual([]);
    expect(parseAdminOrders([null, {}, { id: 12, fulfillment: {} }, { id: 'membership', fulfillment: null }])).toEqual([]);
    expect(parseAdminOrder({ id: 'abcdefghi', total: 'bad', fulfillment: {} })).toMatchObject({
      orderNumber: 'ABCDEFGH', customerName: 'Cliente', total: 0, itemCount: 0,
      destination: 'Dirección no registrada', allowedTransitions: [], trackingNumber: null,
    });
    expect(parseAdminOrder({
      id: '1', customer: { email: 'synthetic@example.test' }, items: [null, { quantity: '2' }],
      fulfillment: { method: 'delivery', addressSnapshot: {}, allowedTransitions: [null, 'future_status'] },
    })).toMatchObject({ customerName: 'synthetic@example.test', itemCount: 3, destination: '', allowedTransitions: ['future_status'] });
  });

  it('never proposes incident/cancellation as the principal action and preserves future authorized states', () => {
    const problem = parseAdminOrder(adminOrder('problem', 'incident', 'delivery', ['incident', 'cancelled']))!;
    expect(getNextStep(problem)).toBeNull();
    const future = parseAdminOrder(adminOrder('future', 'future_status', 'delivery', ['future_status']))!;
    expect(getNextStep(future)).toEqual({ status: 'future_status', label: 'future_status' });
    expect(getTransitionOptions(future)).toEqual([{ status: 'future_status', label: 'future_status', description: '', isProblem: false }]);
    expect(getFulfillmentLabel('future_status')).toBe('future_status');
  });

  it.each([
    ['awaiting_payment', 'pending'], ['ready_for_pickup', 'done'], ['delivered', 'done'],
    ['picked_up', 'done'], ['incident', 'error'], ['cancelled', 'error'], ['preparing', 'progress'],
  ])('uses the correct tone for %s', (status, tone) => {
    expect(getFulfillmentTone(status)).toBe(tone);
  });

  it('ignores malformed payments and uses gross amount only when net is absent', () => {
    const now = new Date('2026-11-07T12:00:00');
    expect(summarizePayments(null, now)).toEqual({ salesToday: 0, paidTodayCount: 0, pendingCount: 0 });
    expect(summarizePayments([null, false, { status: 'paid', date: 'invalid' },
      { status: 'paid', date: now.toISOString(), amount: '80.50' },
      { status: 'paid', date: now.toISOString(), netAmount: 0, amount: 900 },
      { status: 'rejected', date: now.toISOString(), amount: 100 },
    ], now)).toEqual({ salesToday: 80.5, paidTodayCount: 2, pendingCount: 0 });
  });

  it('parses missing rate fields and sorts equal-status rates by price without mutation', () => {
    expect(parseShippingRates(null)).toEqual([]);
    const rates = parseShippingRates([null, false, {}, { id: 'default' },
      { id: 'high', amount: 200, active: true }, { id: 'low', amount: 50, active: true },
    ]);
    expect(rates[0]).toEqual({ id: 'default', name: 'Tarifa sin nombre', postalCodeFrom: '', postalCodeTo: '', amount: 0, active: false });
    expect(sortShippingRates(rates).map(rate => rate.id)).toEqual(['low', 'high', 'default']);
    expect(rates.map(rate => rate.id)).toEqual(['default', 'high', 'low']);
  });

  it('formats old dates, midnight, invalid input and a missing avatar safely', () => {
    expect(formatTime(new Date('2026-11-01T00:05:00'))).toBe('12:05 a.m.');
    expect(formatRelativeDateTime(new Date('2026-10-01T09:00:00'), new Date('2026-11-07T12:00:00'))).toBe('1 oct 2026 · 9:00 a.m.');
    expect(parseDate('bad')).toBeNull();
    expect(parseDate(0)).toBeNull();
    expect(parseAmount(Infinity)).toBe(0);
    expect(getAvatarInitials('123')).toBe('?');
  });

  it('uses plural rate counts, while unfinished menu items have no navigation route', () => {
    const menu = getAdminMenu({ products: 0, activeShippingRates: 2, routines: 0, plans: 0 });
    expect(menu[0].items.find(item => item.id === 'shipping-rates')?.meta).toBe('2 activas');
    expect(menu[0].items.find(item => item.id === 'products')?.route).toBeUndefined();
  });
});
