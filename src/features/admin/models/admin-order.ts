import { getAvatarInitials, parseAmount, parseDate } from '@/features/admin/models/admin-format';

/** Estado logístico (fulfillment.status). No confundir con el estado del pedido ni del pago. */
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
  | 'cancelled'
  | (string & {});

export type DeliveryMethod = 'delivery' | 'pickup';

export interface AdminOrder {
  id: string;
  orderNumber: string;
  paidAt: Date | null;
  customerEmail: string;
  customerName: string;
  initials: string;
  itemCount: number;
  total: number;
  method: DeliveryMethod;
  status: FulfillmentStatus;
  /** "Huejutla de Reyes, Hgo. · CP 43000" o "a nombre de Ana Ramírez". */
  destination: string;
  trackingNumber: string | null;
  allowedTransitions: FulfillmentStatus[];
}

type Raw = Record<string, unknown>;
const asRecord = (value: unknown): Raw | null =>
  value && typeof value === 'object' ? (value as Raw) : null;
const asString = (value: unknown) => (typeof value === 'string' ? value : '');

function getDestination(method: DeliveryMethod, fulfillment: Raw, customerName: string) {
  if (method === 'pickup') return `a nombre de ${customerName}`;
  const address = asRecord(fulfillment.addressSnapshot);
  if (!address) return 'Dirección no registrada';
  const place = [asString(address.municipality), asString(address.state)].filter(Boolean).join(', ');
  const postalCode = asString(address.postalCode);
  return [place, postalCode ? `CP ${postalCode}` : ''].filter(Boolean).join(' · ');
}

/** Solo los pedidos con entrega (productos); los de membresía no tienen fulfillment. */
export function parseAdminOrder(raw: unknown): AdminOrder | null {
  const order = asRecord(raw);
  const fulfillment = asRecord(order?.fulfillment);
  if (!order || !fulfillment || typeof order.id !== 'string') return null;

  const method: DeliveryMethod = fulfillment.method === 'pickup' ? 'pickup' : 'delivery';
  const customer = asRecord(order.customer);
  const customerEmail = asString(customer?.email);
  const customerName = asString(fulfillment.recipientName) || customerEmail || 'Cliente';
  const items = Array.isArray(order.items) ? order.items : [];

  return {
    id: order.id,
    orderNumber: asString(order.orderNumber) || order.id.slice(0, 8).toUpperCase(),
    paidAt: parseDate(order.paidAt),
    customerEmail,
    customerName,
    initials: getAvatarInitials(customerName),
    itemCount: items.reduce((sum, item) => sum + (parseAmount(asRecord(item)?.quantity) || 1), 0),
    total: parseAmount(order.total),
    method,
    status: asString(fulfillment.status) as FulfillmentStatus,
    destination: getDestination(method, fulfillment, customerName),
    trackingNumber: asString(fulfillment.trackingNumber) || null,
    allowedTransitions: Array.isArray(fulfillment.allowedTransitions)
      ? fulfillment.allowedTransitions.filter((value): value is string => typeof value === 'string')
      : [],
  };
}

export function parseAdminOrders(raw: unknown): AdminOrder[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseAdminOrder).filter((order): order is AdminOrder => order !== null);
}

const STATUS_LABELS: Record<string, string> = {
  awaiting_payment: 'Esperando pago',
  payment_confirmed: 'Pago confirmado',
  preparing: 'En preparación',
  ready_for_pickup: 'Listo para recoger',
  packed: 'Empaquetado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  picked_up: 'Recogido',
  incident: 'Incidencia',
  cancelled: 'Cancelado',
};

export function getFulfillmentLabel(status: FulfillmentStatus) {
  return STATUS_LABELS[status] ?? status;
}

/** Gris: pendiente · Negro: en proceso · Verde: listo/entregado · Rojo: incidencia o cancelado. */
export function getFulfillmentTone(status: FulfillmentStatus): 'pending' | 'progress' | 'done' | 'error' {
  if (status === 'awaiting_payment') return 'pending';
  if (['ready_for_pickup', 'delivered', 'picked_up'].includes(status)) return 'done';
  if (['incident', 'cancelled'].includes(status)) return 'error';
  return 'progress';
}

/** Siguiente paso que el administrador da con el botón principal de la tarjeta. */
export function getNextStep(order: AdminOrder) {
  const next = order.allowedTransitions.find((status) => status !== 'incident' && status !== 'cancelled');
  if (!next) return null;
  const labels: Record<string, string> = {
    preparing: 'Marcar en preparación',
    ready_for_pickup: 'Listo para recoger',
    packed: 'Marcar empaquetado',
    shipped: 'Registrar envío',
    delivered: 'Marcar entregado',
    picked_up: 'Marcar recogido',
  };
  return { status: next, label: labels[next] ?? getFulfillmentLabel(next) };
}

const TRANSITION_DESCRIPTIONS: Record<string, string> = {
  preparing: 'Empieza a juntar los productos del pedido.',
  ready_for_pickup: 'Avisa al cliente que ya puede recogerlo.',
  packed: 'El paquete está listo para entregarse a la paquetería.',
  shipped: 'Se pedirá paquetería y número de guía.',
  delivered: 'La paquetería confirmó la entrega.',
  picked_up: 'El cliente recogió su pedido en recepción.',
  incident: 'Registra un problema con el paquete.',
  cancelled: 'El pedido no se entregará.',
};

/** Opciones de "Nuevo estado" (pantalla 48): solo las transiciones que el backend permite. */
export function getTransitionOptions(order: AdminOrder) {
  return order.allowedTransitions.map((status) => ({
    status,
    label: getFulfillmentLabel(status),
    description: TRANSITION_DESCRIPTIONS[status] ?? '',
    isProblem: status === 'incident' || status === 'cancelled',
  }));
}

export type OrderGroup = 'to_prepare' | 'preparing' | 'ready' | 'to_ship' | 'shipped' | 'incident';

export const ORDER_GROUPS: { value: OrderGroup; label: string; statuses: FulfillmentStatus[] }[] = [
  { value: 'to_prepare', label: 'Por preparar', statuses: ['payment_confirmed'] },
  { value: 'preparing', label: 'En preparación', statuses: ['preparing'] },
  { value: 'ready', label: 'Por recoger', statuses: ['ready_for_pickup'] },
  { value: 'to_ship', label: 'Por enviar', statuses: ['packed'] },
  { value: 'shipped', label: 'Enviados', statuses: ['shipped'] },
  { value: 'incident', label: 'Incidencias', statuses: ['incident'] },
];

export function isInGroup(order: AdminOrder, group: OrderGroup) {
  return ORDER_GROUPS.find((item) => item.value === group)?.statuses.includes(order.status) ?? false;
}

export function searchOrders(orders: readonly AdminOrder[], query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return [...orders];
  return orders.filter((order) =>
    [order.orderNumber, order.customerName, order.customerEmail].some((value) =>
      value.toLowerCase().includes(text),
    ),
  );
}
