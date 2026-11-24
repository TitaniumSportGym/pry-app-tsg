import { parseClientOrder, parseClientOrders } from '@/features/orders/models/order';
import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';
import { isUuid } from '@/utils/uuid';

/** Primera página amplia: un cliente rara vez tiene más de 50 compras de productos. */
const ORDERS_PAGE_SIZE = 50;

export async function getMyProductOrders() {
  return parseClientOrders(
    await apiRequest<unknown>(`/api/orders/me?productOnly=true&page=1&limit=${ORDERS_PAGE_SIZE}`),
  );
}

function orderPath(orderId: string) {
  if (!isUuid(orderId)) throw new ApiError('Pedido no encontrado.', 404);
  return `/api/orders/${encodeURIComponent(orderId)}`;
}

export async function getOrder(orderId: string) {
  const order = parseClientOrder(await apiRequest<unknown>(orderPath(orderId)));
  if (!order) throw new ApiError('Pedido no encontrado.', 404);
  return order;
}

/** Cancela una orden pendiente de pago; el backend aplica sus reglas y puede rechazarla. */
export async function cancelOrder(orderId: string) {
  await apiRequest(`${orderPath(orderId)}/cancel`, { method: 'POST' });
}
