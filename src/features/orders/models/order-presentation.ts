/** Textos y formatos de pedidos que comparten la lista, el detalle y el resultado del pago. */
import { formatMoney, formatShortDate, formatTime } from '@/features/admin/models/admin-format';
import type { FulfillmentStatus } from '@/features/orders/models/fulfillment-status';
import type { ClientOrder } from '@/features/orders/models/order';

export function formatOrderDateTime(date: Date) {
  return `${formatShortDate(date)} · ${formatTime(date)}`;
}

export function formatOrderMoney(amount: number) {
  return formatMoney(amount);
}

const STATUS_DESCRIPTIONS: Record<string, string> = {
  awaiting_payment: 'Aún no recibimos tu pago. Si ya pagaste, puede tardar unos minutos en confirmarse.',
  payment_confirmed: 'Recibimos tu pago. Pronto empezaremos a preparar tu pedido.',
  preparing: 'Estamos preparando tus productos.',
  ready_for_pickup: 'Tu pedido está listo. Recógelo en recepción con tu número de pedido.',
  packed: 'Tu paquete está listo para entregarse a la paquetería.',
  shipped: 'Tu paquete va en camino. Usa el número de guía para rastrearlo con la paquetería.',
  delivered: 'Tu paquete se entregó. ¡Gracias por tu compra!',
  picked_up: 'Recogiste tu pedido. ¡Gracias por tu compra!',
  incident: 'Hubo un problema con tu paquete. Te contactaremos para resolverlo.',
  delivery_failed: 'La paquetería no pudo entregar tu paquete. Te contactaremos para reprogramar la entrega.',
  cancelled: 'La entrega de este pedido se canceló. Si tienes dudas, contacta al gimnasio.',
};

export const LEGACY_ORDER_DESCRIPTION =
  'Este pedido es anterior al seguimiento de entregas, por eso no muestra su historial. Si tienes dudas, contacta al gimnasio.';

export function getStatusDescription(status: FulfillmentStatus) {
  return STATUS_DESCRIPTIONS[status] ?? 'Consulta el avance de tu pedido.';
}

/** Filas del resumen de pago; el envío y los descuentos solo aparecen si aplican. */
export function getTotalsRows(order: Pick<ClientOrder, 'subtotal' | 'discountTotal' | 'shippingTotal' | 'taxTotal' | 'fulfillment'>) {
  const rows: { label: string; value: string }[] = [{ label: 'Subtotal', value: formatMoney(order.subtotal) }];
  if (order.discountTotal > 0) rows.push({ label: 'Descuentos', value: `−${formatMoney(order.discountTotal)}` });
  if (order.fulfillment?.method === 'pickup') rows.push({ label: 'Recogida en gimnasio', value: 'Gratis' });
  else if (order.fulfillment) rows.push({ label: 'Envío', value: formatMoney(order.shippingTotal) });
  if (order.taxTotal > 0) rows.push({ label: 'IVA incluido', value: formatMoney(order.taxTotal) });
  return rows;
}
