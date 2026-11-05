/** Payments of the signed-in user from /api/payments/me. */

import { formatMxnAmount } from '@/utils/money';

export type PaymentStatus = "paid" | "pending" | "cancelled" | "refunded" | "rejected" | "unknown";

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  /** When it was paid, or when it was created if it is not paid yet. */
  date: Date;
  orderId: string | null;
  orderNumber: string | null;
  /** How it was paid, as the backend sends it (online_checkout, cash, card_terminal…). */
  method: string;
}

const STATUS_ALIASES: Record<string, PaymentStatus> = {
  paid: "paid",
  approved: "paid",
  pending: "pending",
  in_process: "pending",
  cancelled: "cancelled",
  canceled: "cancelled",
  refunded: "refunded",
  rejected: "rejected",
  failed: "rejected",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  rejected: "Rechazado",
  unknown: "En revisión",
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parsePayment(raw: unknown): Payment | null {
  if (!isRecord(raw) || typeof raw.id !== "string" || !raw.id) return null;

  const amount = Number(raw.amount);
  const date = toDate(raw.paidAt) ?? toDate(raw.createdAt);
  if (!Number.isFinite(amount) || amount < 0 || !date) return null;

  const rawStatus = typeof raw.status === "string" ? raw.status.toLowerCase() : "";
  const order = isRecord(raw.order) ? raw.order : null;

  return {
    id: raw.id,
    amount,
    currency: typeof raw.currency === "string" ? raw.currency : "MXN",
    status: STATUS_ALIASES[rawStatus] ?? "unknown",
    date,
    orderId:
      typeof raw.orderId === "string" && raw.orderId
        ? raw.orderId
        : order && typeof order.id === "string"
          ? order.id
          : null,
    orderNumber: order && typeof order.orderNumber === "string" ? order.orderNumber : null,
    method: typeof raw.method === "string" ? raw.method.toLowerCase() : "",
  };
}

/** Valid payments, newest first. */
export function parsePayments(raw: unknown): Payment[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map(parsePayment)
    .filter((payment): payment is Payment => payment !== null)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getPaymentStatusLabel(status: PaymentStatus) {
  return STATUS_LABELS[status];
}

export function formatPaymentAmount(amount: number) {
  return formatMxnAmount(amount);
}

/** "12 oct 2026", independent of the device locale. */
export function formatPaymentDate(date: Date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
