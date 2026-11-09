import { isValidOrderId, parseCheckoutResponse } from '@/features/memberships/models/checkout';
import { parseOrderPaymentStatus } from '@/features/memberships/models/payment-status';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

/**
 * Creates the Mercado Pago payment for a membership plan. Requires the session token:
 * the backend links the order to the signed-in user and sets the price itself.
 */
export async function createMembershipCheckout(membershipPlanId: string, idempotencyKey: string) {
  const response = await apiRequest<unknown>('/api/checkout/mercadopago', {
    method: 'POST',
    body: { idempotencyKey, membershipPlanId },
  });
  const checkout = parseCheckoutResponse(response);

  if (!checkout) {
    throw new ApiError('Mercado Pago no devolvió un enlace de pago válido.', 502);
  }

  return checkout;
}

/** Estado del pago de una orden propia, según el servidor. */
export async function getOrderPaymentStatus(orderId: string) {
  if (!isValidOrderId(orderId)) throw new ApiError('Orden no encontrada.', 404);

  const status = parseOrderPaymentStatus(
    await apiRequest<unknown>(`/api/orders/${encodeURIComponent(orderId)}/payment-status`),
  );
  if (!status) throw new ApiError('El servidor respondió con un estado de pago no válido.', 502);
  return status;
}
