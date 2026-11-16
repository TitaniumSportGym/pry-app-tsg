/**
 * Pedido de productos del cliente (/api/orders/me?productOnly=true y /api/orders/:id).
 * `fulfillment` es el seguimiento logístico; los pedidos anteriores al sistema de entregas
 * lo traen en null y se muestran sin línea de tiempo.
 */
import { formatAddressLine, formatPhone } from '@/features/delivery/models/address';
import {
  FULFILLMENT_FLOWS,
  getFulfillmentLabel,
  isProblemStatus,
  parseDeliveryMethod,
  type DeliveryMethod,
  type FulfillmentStatus,
} from '@/features/orders/models/fulfillment-status';
import { parsePayments, type Payment } from '@/features/payments/models/payment';
import { isUuid } from '@/utils/uuid';

export interface OrderItem {
  key: string;
  productId: number | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string | null;
}

export interface FulfillmentEvent {
  status: FulfillmentStatus;
  date: Date | null;
  note: string | null;
}

export interface OrderFulfillment {
  method: DeliveryMethod;
  status: FulfillmentStatus;
  recipientName: string;
  phone: string;
  /** Dirección de envío en una línea (copia guardada al comprar). */
  addressLine: string | null;
  pickup: { name: string; address: string } | null;
  carrier: string | null;
  trackingNumber: string | null;
  events: FulfillmentEvent[];
}

export interface ClientOrder {
  id: string;
  orderNumber: string;
  createdAt: Date | null;
  /** Estado financiero (Order.status): pending, paid, cancelled… */
  orderStatus: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  total: number;
  items: OrderItem[];
  payment: Payment | null;
  fulfillment: OrderFulfillment | null;
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function amount(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function date(value: unknown) {
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseItem(raw: unknown, index: number): OrderItem | null {
  if (!isRecord(raw) || raw.itemType === 'membership') return null;
  const snapshot = isRecord(raw.snapshot) ? raw.snapshot : isRecord(raw.productSnapshot) ? raw.productSnapshot : {};
  const product = isRecord(raw.product) ? raw.product : {};
  const quantity = Math.max(1, Math.floor(amount(raw.quantity)) || 1);
  const unitPrice = amount(raw.unitPrice ?? raw.price ?? snapshot.price ?? product.price);
  const productId = Number(raw.productId ?? product.id ?? snapshot.id);

  return {
    key: text(raw.id) || `item-${index}`,
    productId: Number.isFinite(productId) ? productId : null,
    name:
      text(raw.itemNameSnapshot) ||
      text(raw.name) ||
      text(raw.productName) ||
      text(snapshot.name) ||
      text(product.name) ||
      'Producto',
    quantity,
    unitPrice,
    lineTotal: amount(raw.total ?? raw.lineTotal ?? raw.subtotal) || unitPrice * quantity,
    imageUrl: text(raw.imageUrl) || text(snapshot.imageUrl) || text(product.imageUrl) || null,
  };
}

function parseEvent(raw: unknown): FulfillmentEvent | null {
  if (!isRecord(raw)) return null;
  const status = text(raw.status) || text(raw.toStatus);
  if (!status) return null;
  return {
    status,
    date: date(raw.createdAt) ?? date(raw.occurredAt) ?? date(raw.date),
    note: text(raw.notes) || text(raw.note) || text(raw.message) || null,
  };
}

function parseFulfillment(raw: unknown): OrderFulfillment | null {
  if (!isRecord(raw)) return null;
  const method = parseDeliveryMethod(raw.method);
  const address = isRecord(raw.addressSnapshot) ? raw.addressSnapshot : isRecord(raw.address) ? raw.address : null;
  const pickup = isRecord(raw.pickupLocationSnapshot)
    ? raw.pickupLocationSnapshot
    : isRecord(raw.pickupLocation)
      ? raw.pickupLocation
      : null;
  const events = (Array.isArray(raw.events) ? raw.events : [])
    .map(parseEvent)
    .filter((event): event is FulfillmentEvent => event !== null)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));

  return {
    method,
    status: text(raw.status) || 'awaiting_payment',
    recipientName: text(raw.recipientName) || text(address?.recipientName),
    phone: text(raw.phone) || text(address?.phone),
    addressLine:
      method === 'delivery' && address
        ? formatAddressLine({
            street: text(address.street),
            exteriorNumber: text(address.exteriorNumber),
            interiorNumber: text(address.interiorNumber) || null,
            neighborhood: text(address.neighborhood),
            municipality: text(address.municipality),
            state: text(address.state),
            postalCode: text(address.postalCode),
          })
        : null,
    pickup: pickup ? { name: text(pickup.name) || 'Titanium Sport Gym', address: text(pickup.address) } : null,
    carrier: text(raw.carrier) || text(raw.shippingCarrier) || null,
    trackingNumber: text(raw.trackingNumber) || null,
    events,
  };
}

export function parseClientOrder(raw: unknown): ClientOrder | null {
  const order = isRecord(raw) && isRecord(raw.order) ? raw.order : raw;
  if (!isRecord(order) || !isUuid(order.id)) return null;

  const items = (Array.isArray(order.items) ? order.items : [])
    // Callback explícito: parseItem recibe el índice, pero no el arreglo que .map() también pasa.
    .map((item, index) => parseItem(item, index))
    .filter((item): item is OrderItem => item !== null);
  const payments = parsePayments(order.payments);
  const subtotal = amount(order.subtotal) || items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    id: order.id,
    orderNumber: text(order.orderNumber) || order.id.slice(0, 8).toUpperCase(),
    createdAt: date(order.createdAt),
    orderStatus: text(order.status).toLowerCase(),
    subtotal,
    discountTotal: amount(order.discountTotal),
    taxTotal: amount(order.taxTotal),
    shippingTotal: amount(order.shippingTotal),
    total: amount(order.total),
    items,
    payment: payments[0] ?? null,
    fulfillment: parseFulfillment(order.fulfillment),
  };
}

/** Acepta `[...]`, `{ orders: [...] }` o `{ data: [...] }`; del más reciente al más antiguo. */
export function parseClientOrders(raw: unknown): ClientOrder[] {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.orders)
      ? raw.orders
      : isRecord(raw) && Array.isArray(raw.data)
        ? raw.data
        : [];

  return list
    .map(parseClientOrder)
    .filter((order): order is ClientOrder => order !== null)
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export type TimelineState = 'done' | 'current' | 'pending' | 'error';

export interface TimelineStep {
  status: FulfillmentStatus;
  label: string;
  state: TimelineState;
  date: Date | null;
  /** Línea extra bajo el paso, p. ej. "Estafeta · Guía 7012 3456 7890". */
  detail: string | null;
}

const TERMINAL_STATUSES: readonly string[] = ['delivered', 'picked_up'];

function lastEventDate(events: FulfillmentEvent[], status: FulfillmentStatus) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index].status === status) return events[index].date;
  }
  return null;
}

/**
 * Línea de tiempo del seguimiento (pantallas 36, 37 y 63–66). Sigue el flujo del método de
 * entrega; si el pedido terminó en incidencia, entrega no realizada o cancelación, los pasos
 * alcanzados quedan completos y el problema se agrega al final en rojo.
 */
export function buildTimeline(fulfillment: OrderFulfillment): TimelineStep[] {
  const flow = FULFILLMENT_FLOWS[fulfillment.method];
  const { status, events } = fulfillment;
  const shippingDetail =
    fulfillment.carrier || fulfillment.trackingNumber
      ? [fulfillment.carrier, fulfillment.trackingNumber ? `Guía ${fulfillment.trackingNumber}` : null]
          .filter(Boolean)
          .join(' · ')
      : null;

  const step = (stepStatus: FulfillmentStatus, state: TimelineState): TimelineStep => ({
    status: stepStatus,
    label: getFulfillmentLabel(stepStatus),
    state,
    date: state === 'pending' ? null : lastEventDate(events, stepStatus),
    detail: stepStatus === 'shipped' && state !== 'pending' ? shippingDetail : null,
  });

  if (isProblemStatus(status)) {
    const reached = events
      .map((event) => flow.indexOf(event.status))
      .reduce((max, index) => Math.max(max, index), 0);
    return [...flow.slice(0, reached + 1).map((item) => step(item, 'done')), step(status, 'error')];
  }

  const current = Math.max(0, flow.indexOf(status));
  return flow.map((item, index) =>
    step(
      item,
      index < current || (index === current && TERMINAL_STATUSES.includes(status))
        ? 'done'
        : index === current
          ? 'current'
          : 'pending',
    ),
  );
}

export function getItemCountLabel(order: Pick<ClientOrder, 'items'>) {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${count} ${count === 1 ? 'producto' : 'productos'}`;
}

/** "Envío a domicilio · Huejutla de Reyes" / "Recoger en gimnasio" / "Pedido anterior · sin seguimiento". */
export function getDeliverySummary(order: Pick<ClientOrder, 'fulfillment'>) {
  const fulfillment = order.fulfillment;
  if (!fulfillment) return 'Pedido anterior · sin seguimiento';
  if (fulfillment.method === 'pickup') return 'Recoger en gimnasio';
  return 'Envío a domicilio';
}

/** Order.status del backend mientras falta el pago (también en pedidos sin seguimiento). */
export const PENDING_PAYMENT_STATUSES: readonly string[] = ['pending_payment', 'pending'];

export function isAwaitingPayment(order: Pick<ClientOrder, 'orderStatus' | 'fulfillment'>) {
  if (order.orderStatus === 'cancelled') return false;
  return order.fulfillment
    ? order.fulfillment.status === 'awaiting_payment'
    : PENDING_PAYMENT_STATUSES.includes(order.orderStatus);
}

/** El backend decide si se puede cancelar; la app solo lo ofrece mientras falta el pago. */
export function canCancelOrder(order: Pick<ClientOrder, 'orderStatus' | 'fulfillment'>) {
  return isAwaitingPayment(order);
}

/** Estado de un pedido anterior al seguimiento, a partir de su estado financiero. */
export function getLegacyOrderLabel(orderStatus: string) {
  if (PENDING_PAYMENT_STATUSES.includes(orderStatus)) return 'Pendiente de pago';
  if (orderStatus === 'cancelled') return 'Cancelado';
  if (orderStatus === 'refunded') return 'Reembolsado';
  return 'Pagado';
}

export type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled';

const COMPLETED: readonly string[] = ['delivered', 'picked_up'];
const CANCELLED: readonly string[] = ['cancelled', 'delivery_failed'];

export function matchesOrderFilter(order: Pick<ClientOrder, 'fulfillment' | 'orderStatus'>, filter: OrderFilter) {
  if (filter === 'all') return true;
  // Sin seguimiento, un pedido pagado cuenta como terminado y uno sin pagar como en curso.
  const status =
    order.fulfillment?.status ??
    (order.orderStatus === 'paid' ? 'delivered' : order.orderStatus === 'refunded' ? 'cancelled' : order.orderStatus);
  if (filter === 'completed') return COMPLETED.includes(status);
  if (filter === 'cancelled') return CANCELLED.includes(status) || order.orderStatus === 'cancelled';
  return !COMPLETED.includes(status) && !CANCELLED.includes(status) && order.orderStatus !== 'cancelled';
}

export function formatRecipient(fulfillment: Pick<OrderFulfillment, 'recipientName' | 'phone'>) {
  return [fulfillment.recipientName, fulfillment.phone ? formatPhone(fulfillment.phone) : '']
    .filter(Boolean)
    .join(' · ');
}
