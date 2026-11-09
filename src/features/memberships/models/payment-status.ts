/**
 * Estado de un pago según GET /api/orders/:orderId/payment-status.
 * Solo el servidor (alimentado por el webhook de Mercado Pago) decide si un pago
 * se aprobó: que Mercado Pago regrese con "success" no cuenta.
 */
export type PaymentOutcome = 'approved' | 'pending' | 'rejected';

export interface OrderPaymentStatus {
  outcome: PaymentOutcome;
  orderNumber: string | null;
  total: number | null;
}

/** Estados del backend (Payment.status) que significan que el cobro no se hará. */
const REJECTED_STATUSES = new Set([
  'failed',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
  'expired',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function lower(value: unknown) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

export function parseOrderPaymentStatus(raw: unknown): OrderPaymentStatus | null {
  if (!isRecord(raw) || !isRecord(raw.order)) return null;

  const { order } = raw;
  const payment = isRecord(raw.payment) ? raw.payment : null;
  const paymentStatus = lower(payment?.status);
  const orderStatus = lower(order.status);
  const total = Number(order.total);

  const outcome: PaymentOutcome =
    paymentStatus === 'paid' || orderStatus === 'paid'
      ? 'approved'
      : REJECTED_STATUSES.has(paymentStatus) || orderStatus === 'cancelled'
        ? 'rejected'
        : 'pending';

  return {
    outcome,
    orderNumber: typeof order.orderNumber === 'string' ? order.orderNumber : null,
    total: order.total !== null && order.total !== undefined && Number.isFinite(total) ? total : null,
  };
}
