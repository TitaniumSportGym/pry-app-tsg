/**
 * Estado logístico de un pedido de productos (fulfillment.status), compartido por el cliente y
 * el administrador. No confundir con el estado financiero del pedido (Order.status) ni del pago.
 */
export type FulfillmentStatus =
  | 'awaiting_payment'
  | 'payment_confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'picked_up'
  | 'incident'
  | 'delivery_failed'
  | 'cancelled'
  | (string & {});

export type DeliveryMethod = 'delivery' | 'pickup';

export type FulfillmentTone = 'pending' | 'progress' | 'done' | 'error';

/** Estados que no avanzan el pedido: nunca son la acción principal y se muestran en rojo. */
const PROBLEM_STATUSES: readonly string[] = ['incident', 'delivery_failed', 'cancelled'];

export function isProblemStatus(status: FulfillmentStatus) {
  return PROBLEM_STATUSES.includes(status);
}

/** Etiquetas exactas del contrato del backend. */
const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Pendiente de pago',
  payment_confirmed: 'Pago confirmado',
  preparing: 'En preparación',
  ready_for_pickup: 'Listo para recoger',
  packed: 'Empaquetado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  picked_up: 'Recogido',
  incident: 'Incidencia',
  delivery_failed: 'Entrega no realizada',
  cancelled: 'Entrega cancelada',
};

/** Un estado futuro que la app aún no conoce se muestra tal cual, sin inventar una etiqueta. */
export function getFulfillmentLabel(status: FulfillmentStatus) {
  return STATUS_LABELS[status] ?? status;
}

/** Gris: pendiente · Negro: en proceso · Verde: listo/entregado · Rojo: incidencia o cancelado. */
export function getFulfillmentTone(status: FulfillmentStatus): FulfillmentTone {
  if (status === 'awaiting_payment') return 'pending';
  if (['ready_for_pickup', 'delivered', 'picked_up'].includes(status)) return 'done';
  if (isProblemStatus(status)) return 'error';
  return 'progress';
}

/** Pasos del seguimiento según el método de entrega (flujos del contrato del backend). */
export const FULFILLMENT_FLOWS: Record<DeliveryMethod, readonly FulfillmentStatus[]> = {
  pickup: ['awaiting_payment', 'payment_confirmed', 'preparing', 'ready_for_pickup', 'picked_up'],
  delivery: ['awaiting_payment', 'payment_confirmed', 'preparing', 'packed', 'shipped', 'delivered'],
};

export function parseDeliveryMethod(value: unknown): DeliveryMethod {
  return value === 'pickup' ? 'pickup' : 'delivery';
}
