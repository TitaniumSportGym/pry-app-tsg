import { parseCheckoutResponse } from '@/features/memberships/models/checkout';
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
