// Synthetic API contracts: no production customer data or backend writes.
export function adminOrder(
  id = 'order-1',
  status = 'payment_confirmed',
  method = 'delivery',
  allowedTransitions = ['preparing', 'incident', 'cancelled'],
) {
  return {
    id,
    orderNumber: `TEST-${id}`,
    total: '629.00',
    paidAt: new Date().toISOString(),
    customer: { email: 'socio.prueba@example.test', role: 'cliente' },
    items: [{ quantity: 1 }, { quantity: 2 }],
    fulfillment: {
      method, status, allowedTransitions,
      recipientName: 'Socio de Prueba',
      addressSnapshot: { municipality: 'Huejutla', state: 'Hidalgo', postalCode: '43000' },
      trackingNumber: null,
    },
  };
}

export function adminMember(id = 'member-1', verified = true) {
  return {
    id, email: `${id}@example.test`, role: 'cliente', isVerified: verified,
    createdAt: '2026-11-01T12:00:00Z',
  };
}

export const shippingRates = [
  { id: 'inactive', name: 'Zona inactiva', postalCodeFrom: '00001', postalCodeTo: '00009', amount: '50.00', active: false },
  { id: 'active', name: 'Zona de prueba', postalCodeFrom: '43000', postalCodeTo: '43999', amount: '230.00', active: true },
];
