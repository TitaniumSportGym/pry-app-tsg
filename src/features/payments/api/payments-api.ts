import { parsePayments } from "@/features/payments/models/payment";
import { apiRequest } from "@/services/apiClient";

/** Payments of the signed-in user; requires the session token. */
export async function getMyPayments() {
  const response = await apiRequest<{ payments?: unknown }>("/api/payments/me");
  return parsePayments(response?.payments);
}
