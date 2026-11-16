import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

export interface MyProductOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  shippingTotal: string;
  createdAt: string;
  paidAt: string | null;
  items: { id: string; itemNameSnapshot: string; quantity: number; subtotal: string; itemType: string }[];
  fulfillment: null | {
    method: 'pickup' | 'delivery';
    status: string;
    pickupLocationSnapshot?: { name: string; address: string } | null;
    carrier?: string | null;
    trackingNumber?: string | null;
  };
}

/** Only own orders; the backend uses JWT ownership and productOnly=true. */
export async function getMyProductOrders(): Promise<MyProductOrder[]> {
  const raw = await apiRequest<unknown>('/api/orders/me?productOnly=true&page=1&limit=50');
  if (!raw || typeof raw !== 'object' || !('orders' in raw)) {
    throw new ApiError('No se pudieron cargar los pedidos.', 502);
  }
  const rows = (raw as { orders: unknown }).orders;
  if (!Array.isArray(rows)) throw new ApiError('La lista de pedidos es inválida.', 502);
  return rows.filter((item): item is MyProductOrder => {
    if (!item || typeof item !== 'object') return false;
    const value = item as Record<string, unknown>;
    return typeof value.id === 'string' && typeof value.orderNumber === 'string' &&
      typeof value.status === 'string' && Array.isArray(value.items);
  });
}
