import { apiRequest } from '@/services/apiClient';

/**
 * El backend pagina pedidos y pagos de 20 en 20 (máximo 100 por página).
 * El panel trabaja con la página más reciente: es la que el administrador atiende en el día.
 */
const RECENT_LIMIT = 100;

export async function getAdminUsers() {
  const response = await apiRequest<{ users?: unknown }>('/api/admin/users');
  return response.users;
}

export async function getAdminOrders() {
  const response = await apiRequest<{ orders?: unknown }>(`/api/admin/orders?limit=${RECENT_LIMIT}`);
  return response.orders;
}

export async function getAdminPayments() {
  const response = await apiRequest<{ payments?: unknown }>(
    `/api/admin/payments?limit=${RECENT_LIMIT}`,
  );
  return response.payments;
}

export async function getAdminShippingRates() {
  const response = await apiRequest<{ rates?: unknown }>('/api/admin/shipping-rates');
  return response.rates;
}

export async function getAdminProducts() {
  return apiRequest<unknown>('/api/admin/products');
}

export async function getAdminRoutines() {
  const response = await apiRequest<{ routines?: unknown }>('/api/admin/routines');
  return response.routines;
}
