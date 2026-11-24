import { RepositoryCache } from '@/core/repository/repository-cache';
import { adminMember, adminOrder, shippingRates } from '../../../../tests/support/admin-fixtures';

import { ADMIN_KEYS, createAdminRepository, type AdminDataSource } from './admin-repository';

function setup() {
  let now = 0;
  const cache = new RepositoryCache(() => now);
  const source = {
    getAdminUsers: jest.fn(async () => [adminMember(), { id: 'coach', email: 'coach@example.test', role: 'entrenador' }]),
    getAdminOrders: jest.fn(async () => [adminOrder(), { id: 'membership', fulfillment: null }]),
    getAdminPayments: jest.fn(async () => [{ status: 'pending' }]),
    getAdminProducts: jest.fn(async () => [{ id: 'p' }]),
    getAdminShippingRates: jest.fn(async () => shippingRates),
    getAdminRoutines: jest.fn(async () => [{ id: 'r' }]),
  };
  return { source, cache, repository: createAdminRepository(source, cache), advance: (ms: number) => { now += ms; } };
}

describe('Admin repository with real cache and parsers', () => {
  it('parses members, product orders and rates, and preserves raw payments', async () => {
    const { repository } = setup();
    expect(await repository.getMembers()).toEqual([expect.objectContaining({ id: 'member-1', memberId: 'member-1', verified: true })]);
    expect(await repository.getOrders()).toEqual([expect.objectContaining({ id: 'order-1', total: 629, itemCount: 3 })]);
    expect(await repository.getShippingRates()).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'active', amount: 230 })]));
    expect(await repository.getPayments()).toEqual([{ status: 'pending' }]);
    expect(await repository.getCatalogCounts()).toEqual({ products: 1, activeShippingRates: 1, routines: 1 });
  });

  it.each(['getMembers', 'getOrders', 'getPayments', 'getShippingRates', 'getCatalogCounts'] as const)(
    '%s deduplicates reads, caches for one minute, refreshes and expires', async (method) => {
      const { repository, source, advance } = setup();
      const fetcher = source[({ getMembers: 'getAdminUsers', getOrders: 'getAdminOrders', getPayments: 'getAdminPayments', getShippingRates: 'getAdminShippingRates', getCatalogCounts: 'getAdminProducts' } as const)[method]];
      const [first, second] = await Promise.all([repository[method](), repository[method]()]);
      expect(second).toBe(first);
      advance(59_999);
      expect(await repository[method]()).toBe(first);
      expect(fetcher).toHaveBeenCalledTimes(1);
      await repository[method]({ force: true });
      expect(fetcher).toHaveBeenCalledTimes(2);
      advance(60_000);
      await repository[method]();
      expect(fetcher).toHaveBeenCalledTimes(3);
    },
  );

  it('invalidates admin data and notifies observers without invalidating other repositories', async () => {
    const { repository, source, cache } = setup();
    const listener = jest.fn();
    const unsubscribe = cache.subscribe(listener);
    await repository.getOrders();
    await cache.read('other', async () => 42, { ttlMs: 60_000 });
    cache.invalidate(ADMIN_KEYS.all);
    expect(listener).toHaveBeenCalledWith({ type: 'invalidated', prefix: 'admin' });
    await repository.getOrders();
    expect(source.getAdminOrders).toHaveBeenCalledTimes(2);
    expect(cache.peek('other')).toBe(42);
    unsubscribe();
  });

  it('does not cache a failure, allowing a real retry', async () => {
    const { repository, source } = setup();
    source.getAdminOrders.mockRejectedValueOnce(new Error('offline'));
    await expect(repository.getOrders()).rejects.toThrow('offline');
    expect(await repository.getOrders()).toHaveLength(1);
    expect(source.getAdminOrders).toHaveBeenCalledTimes(2);
  });

  it('treats missing or malformed collections as empty and counts only active=true', async () => {
    const empty = jest.fn(async () => null);
    const source: AdminDataSource = {
      getAdminUsers: empty, getAdminOrders: empty, getAdminPayments: empty,
      getAdminProducts: empty, getAdminShippingRates: empty, getAdminRoutines: empty,
    };
    const repository = createAdminRepository(source, new RepositoryCache());
    expect(await repository.getMembers()).toEqual([]);
    expect(await repository.getOrders()).toEqual([]);
    expect(await repository.getShippingRates()).toEqual([]);
    expect(await repository.getCatalogCounts()).toEqual({ products: 0, activeShippingRates: 0, routines: 0 });
    source.getAdminShippingRates = async () => [null, {}, { active: 'true' }, { active: true }];
    expect((await repository.getCatalogCounts({ force: true })).activeShippingRates).toBe(1);
  });
});
