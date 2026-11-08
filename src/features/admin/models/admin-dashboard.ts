import { isSameDay, parseAmount, parseDate } from '@/features/admin/models/admin-format';
import type { AdminOrder } from '@/features/admin/models/admin-order';

export interface AdminPaymentSummary {
  salesToday: number;
  paidTodayCount: number;
  pendingCount: number;
}

/** Ventas de hoy y pagos pendientes a partir de los pagos más recientes. */
export function summarizePayments(raw: unknown, now: Date): AdminPaymentSummary {
  const payments = Array.isArray(raw) ? raw : [];
  let salesToday = 0;
  let paidTodayCount = 0;
  let pendingCount = 0;

  for (const item of payments) {
    const payment = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
    if (!payment) continue;
    if (payment.status === 'pending') pendingCount += 1;
    const date = parseDate(payment.date);
    if (payment.status === 'paid' && date && isSameDay(date, now)) {
      salesToday += parseAmount(payment.netAmount ?? payment.amount);
      paidTodayCount += 1;
    }
  }

  return { salesToday, paidTodayCount, pendingCount };
}

export function summarizeOrders(orders: readonly AdminOrder[]) {
  const count = (status: string) => orders.filter((order) => order.status === status).length;
  return {
    toPrepare: count('payment_confirmed'),
    readyForPickup: count('ready_for_pickup'),
    // Empaquetados que aún no tienen guía de paquetería.
    packedWithoutTracking: orders.filter((order) => order.status === 'packed' && !order.trackingNumber)
      .length,
  };
}

/**
 * DATOS DE EJEMPLO: el backend todavía no registra accesos al gimnasio ni la membresía de cada
 * socio. Cuando existan esos endpoints, estos valores se reemplazan por los reales.
 */
export const SAMPLE_ACCESS = {
  today: 48,
  vsYesterday: '+12 vs ayer',
  expiringSoon: 7,
  peakHour: '7:00 p.m.',
  currentHour: 12,
  byHour: [
    { hour: 6, height: 60 },
    { hour: 8, height: 33 },
    { hour: 10, height: 20 },
    { hour: 12, height: 40 },
    { hour: 14, height: 27 },
    { hour: 16, height: 47 },
    { hour: 18, height: 73 },
    { hour: 19, height: 80 },
    { hour: 20, height: 53 },
    { hour: 22, height: 20 },
  ],
  latest: [
    { id: '1', name: 'Juan Manuel Castro', detail: '12:34 p.m. · Titanium', allowed: true },
    { id: '2', name: 'Ana Ramírez', detail: '12:28 p.m. · Básica', allowed: true },
    { id: '3', name: 'Luis Hernández', detail: '12:20 p.m. · Membresía vencida', allowed: false },
  ],
} as const;
