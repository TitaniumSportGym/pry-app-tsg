import { formatPaymentDate, type Payment } from "@/features/payments/models/payment";

/**
 * Screen 26 · Mis pagos. /api/payments/me has no concept for each payment, so the
 * name of what was bought comes from the orders in /api/orders/me (matched by order id).
 * The backend has no receipt documents; the order number is the payment's reference.
 */

export type PaymentConceptKind = "membership" | "group" | "product" | "other";
export type PaymentFilter = "all" | "paid" | "pending";

export interface PaymentConcept {
  title: string;
  kind: PaymentConceptKind;
}

export interface PaymentHistoryEntry extends Payment {
  title: string;
  kind: PaymentConceptKind;
}

export interface PaymentMonth {
  key: string;
  label: string;
  payments: PaymentHistoryEntry[];
}

const ITEM_KINDS: Record<string, PaymentConceptKind> = {
  membership: "membership",
  group_membership: "group",
  product: "product",
};

const METHOD_LABELS: Record<string, string> = {
  online_checkout: "Pago en línea",
  mercadopago: "Mercado Pago",
  cash: "Efectivo",
  card_terminal: "Tarjeta presencial",
  card: "Tarjeta",
  transfer: "Transferencia",
};

const IN_PERSON_METHODS = new Set(["cash", "card_terminal"]);

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getItemName(item: Record<string, unknown>) {
  const plan = isRecord(item.membershipPlan) ? item.membershipPlan : null;
  const product = isRecord(item.product) ? item.product : null;
  return text(item.itemNameSnapshot) || text(plan?.name) || text(product?.name);
}

/** What each order paid for, keyed by order id. */
export function parseOrderConcepts(raw: unknown): Map<string, PaymentConcept> {
  const concepts = new Map<string, PaymentConcept>();
  if (!Array.isArray(raw)) return concepts;

  for (const order of raw) {
    if (!isRecord(order) || typeof order.id !== "string" || !Array.isArray(order.items)) continue;

    const items = order.items.filter(isRecord);
    const names = items.map(getItemName).filter(Boolean);
    if (names.length === 0) continue;

    concepts.set(order.id, {
      title: names.length === 1 ? names[0] : `${names[0]} y ${names.length - 1} más`,
      kind: ITEM_KINDS[text(items[0].itemType)] ?? "other",
    });
  }

  return concepts;
}

export function buildPaymentHistory(
  payments: readonly Payment[],
  concepts: ReadonlyMap<string, PaymentConcept>,
): PaymentHistoryEntry[] {
  return payments.map((payment) => {
    const concept = payment.orderId ? concepts.get(payment.orderId) : undefined;
    const fallbackTitle = IN_PERSON_METHODS.has(payment.method) ? "Pago en recepción" : "Pago";

    return {
      ...payment,
      title: concept?.title ?? fallbackTitle,
      kind: concept?.kind ?? "other",
    };
  });
}

export function filterPayments(entries: readonly PaymentHistoryEntry[], filter: PaymentFilter) {
  return filter === "all" ? [...entries] : entries.filter((entry) => entry.status === filter);
}

/** Totals only count confirmed payments; a receipt is a paid payment with an order number. */
export function summarizePayments(entries: readonly PaymentHistoryEntry[]) {
  const paid = entries.filter((entry) => entry.status === "paid");

  return {
    totalPaid: paid.reduce((total, entry) => total + entry.amount, 0),
    currency: paid[0]?.currency ?? "MXN",
    paidCount: paid.length,
    pendingCount: entries.filter((entry) => entry.status === "pending").length,
    receiptCount: paid.filter((entry) => entry.orderNumber).length,
  };
}

/** Groups by calendar month keeping the incoming order (newest first). */
export function groupPaymentsByMonth(entries: readonly PaymentHistoryEntry[]): PaymentMonth[] {
  const months = new Map<string, PaymentMonth>();

  for (const entry of entries) {
    const year = entry.date.getFullYear();
    const month = entry.date.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    const group = months.get(key) ?? { key, label: `${MONTH_NAMES[month]} ${year}`, payments: [] };
    group.payments.push(entry);
    months.set(key, group);
  }

  return [...months.values()];
}

export function getPaymentMethodLabel(method: string) {
  return METHOD_LABELS[method] ?? "No especificado";
}

/** "26 oct 2026 · 10:27 p.m.", independent of the device locale. */
export function formatPaymentDateTime(date: Date) {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = hours < 12 ? "a.m." : "p.m.";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${formatPaymentDate(date)} · ${hour12}:${minutes} ${period}`;
}
