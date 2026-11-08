import { apiRequest } from '@/services/apiClient';
import { ApiError } from '@/types/auth';

import { getAdminOrders, getAdminPayments, getAdminProducts, getAdminRoutines, getAdminShippingRates, getAdminUsers } from './admin-api';

jest.mock('@/services/apiClient', () => ({ apiRequest: jest.fn() }));

const endpoints = [
  [getAdminUsers, '/api/admin/users', 'users'],
  [getAdminOrders, '/api/admin/orders?limit=100', 'orders'],
  [getAdminPayments, '/api/admin/payments?limit=100', 'payments'],
  [getAdminShippingRates, '/api/admin/shipping-rates', 'rates'],
  [getAdminRoutines, '/api/admin/routines', 'routines'],
] as const;

describe('Admin API contracts', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(endpoints)('unwraps %p from %s', async (load, path, key) => {
    const rows = [{ id: 'synthetic' }];
    jest.mocked(apiRequest).mockResolvedValue({ [key]: rows });
    expect(await load()).toBe(rows);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith(path);
  });

  it('preserves the products array returned directly by the API', async () => {
    const products = [{ id: 'product' }];
    jest.mocked(apiRequest).mockResolvedValue(products);
    expect(await getAdminProducts()).toBe(products);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/api/admin/products');
  });

  it.each(endpoints)('does not invent data when %s has no collection', async (load) => {
    jest.mocked(apiRequest).mockResolvedValue({});
    expect(await load()).toBeUndefined();
  });

  it.each([new Error('Network unavailable'), new ApiError('Unauthorized', 401), new ApiError('Forbidden', 403)])(
    'propagates %p without replacing it with sample data', async (error) => {
      jest.mocked(apiRequest).mockRejectedValue(error);
      for (const load of [...endpoints.map(([fn]) => fn), getAdminProducts]) {
        await expect(load()).rejects.toBe(error);
      }
    },
  );
});
