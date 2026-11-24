import { parsePayments } from "@/features/payments/models/payment";
import { buildPaymentHistory, parseOrderConcepts } from "@/features/payments/models/payment-history";
import { apiRequest } from "@/services/apiClient";

/** Upper bound of pages read for the history, so a broken pagination cannot loop forever. */
const MAX_HISTORY_PAGES = 10;

interface PagedResponse {
  pagination?: { pages?: unknown };
  [key: string]: unknown;
}

/** Payments of the signed-in user; requires the session token. */
export async function getMyPayments() {
  const response = await apiRequest<{ payments?: unknown }>("/api/payments/me");
  return parsePayments(response?.payments);
}

/** Reads every page of a paginated "me" endpoint and joins the items under `key`. */
async function getAllPages(path: string, key: string) {
  const items: unknown[] = [];

  for (let page = 1; page <= MAX_HISTORY_PAGES; page += 1) {
    const response = await apiRequest<PagedResponse>(`${path}?page=${page}`);
    const pageItems = response?.[key];
    if (Array.isArray(pageItems)) items.push(...pageItems);

    const pages = Number(response?.pagination?.pages);
    if (!Number.isFinite(pages) || page >= pages) break;
  }

  return items;
}

/**
 * Full payment history with the name of what was paid. The orders only add the
 * concept, so if they fail the payments are still shown with a generic name.
 */
export async function getMyPaymentHistory() {
  const [payments, orders] = await Promise.all([
    getAllPages("/api/payments/me", "payments"),
    getAllPages("/api/orders/me", "orders").catch(() => []),
  ]);

  return buildPaymentHistory(parsePayments(payments), parseOrderConcepts(orders));
}
