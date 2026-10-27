import { sessionEvents } from '@/core/observer/session-events';
import { getMembershipPlan, getMembershipPlans } from '@/features/memberships/api/memberships-api';
import { createMembershipsRepository } from '@/features/memberships/repositories/memberships-repository';
import { getMyPaymentHistory, getMyPayments } from '@/features/payments/api/payments-api';
import { createPaymentsRepository } from '@/features/payments/repositories/payments-repository';
import { getProduct, getProducts } from '@/features/store/api/products-api';
import { createProductsRepository } from '@/features/store/repositories/products-repository';
import { getTrainerClients, getTrainerProfile, getTrainerRoutine, getTrainerRoutines } from '@/features/trainer/api/trainer-api';
import { createTrainerRepository } from '@/features/trainer/repositories/trainer-repository';
import { getClientRoutine, getClientRoutines } from '@/features/training/api/training-api';
import { createRoutinesRepository } from '@/features/training/repositories/routines-repository';

import { RepositoryCache } from './repository-cache';

jest.mock('@/features/memberships/api/memberships-api');
jest.mock('@/features/payments/api/payments-api');
jest.mock('@/features/store/api/products-api');
jest.mock('@/features/trainer/api/trainer-api');
jest.mock('@/features/training/api/training-api');

const repositories = [
  {
    name: 'membresías', ttl: 600_000, source: jest.mocked(getMembershipPlans),
    create: (fetcher: jest.Mock, cache?: RepositoryCache) => createMembershipsRepository({ getMembershipPlans: fetcher, getMembershipPlan }, cache).getPlans,
    readDefault: () => createMembershipsRepository().getPlans(),
  },
  {
    name: 'pagos', ttl: 60_000, source: jest.mocked(getMyPayments),
    create: (fetcher: jest.Mock, cache?: RepositoryCache) => createPaymentsRepository({ getMyPayments: fetcher, getMyPaymentHistory }, cache).getRecentPayments,
    readDefault: () => createPaymentsRepository().getRecentPayments(),
  },
  {
    name: 'productos', ttl: 300_000, source: jest.mocked(getProducts),
    create: (fetcher: jest.Mock, cache?: RepositoryCache) => createProductsRepository({ getProducts: fetcher, getProduct }, cache).getProducts,
    readDefault: () => createProductsRepository().getProducts(),
  },
  {
    name: 'entrenadores', ttl: 120_000, source: jest.mocked(getTrainerClients),
    create: (fetcher: jest.Mock, cache?: RepositoryCache) => createTrainerRepository({ getTrainerClients: fetcher, getTrainerRoutines, getTrainerRoutine, getTrainerProfile }, cache).getClients,
    readDefault: () => createTrainerRepository().getClients(),
  },
  {
    name: 'rutinas', ttl: 300_000, source: jest.mocked(getClientRoutines),
    create: (fetcher: jest.Mock, cache?: RepositoryCache) => createRoutinesRepository({ getClientRoutines: fetcher, getClientRoutine }, cache).getRoutines,
    readDefault: () => createRoutinesRepository().getRoutines(),
  },
];

describe.each(repositories)('Factory de $name', ({ ttl, source, create, readDefault }) => {
  beforeEach(() => jest.clearAllMocks());

  it('usa la API predeterminada y comparte la caché entre instancias', async () => {
    source.mockResolvedValue([]);
    await expect(readDefault()).resolves.toEqual([]);
    await expect(readDefault()).resolves.toEqual([]);
    expect(source).toHaveBeenCalledTimes(1);
  });

  it('conserva la inyección, TTL y actualización forzada', async () => {
    let now = 0;
    const fetcher = jest.fn().mockResolvedValueOnce(['inicial']).mockResolvedValueOnce(['actualizado']).mockResolvedValueOnce(['forzado']);
    const read = create(fetcher, new RepositoryCache(() => now));

    await expect(read()).resolves.toEqual(['inicial']);
    now = ttl - 1;
    await expect(read()).resolves.toEqual(['inicial']);
    expect(fetcher).toHaveBeenCalledTimes(1);
    now = ttl;
    await expect(read()).resolves.toEqual(['actualizado']);
    await expect(read({ force: true })).resolves.toEqual(['forzado']);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(source).not.toHaveBeenCalled();
  });

  it('reintenta después de un fallo sin guardar el error', async () => {
    const fetcher = jest.fn().mockRejectedValueOnce(new Error('sin conexión')).mockResolvedValueOnce([]);
    const read = create(fetcher, new RepositoryCache());
    await expect(read()).rejects.toThrow('sin conexión');
    await expect(read()).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('descarta peticiones pendientes de la sesión anterior y lee los datos del nuevo usuario', async () => {
    let resolvePrevious!: (value: string[]) => void;
    const previous = new Promise<string[]>((resolve) => { resolvePrevious = resolve; });
    const fetcher = jest.fn().mockReturnValueOnce(previous).mockResolvedValueOnce(['datos de B']);
    const read = create(fetcher);
    const pendingRead = read();

    sessionEvents.notify({ type: 'signed-out' });
    sessionEvents.notify({ type: 'signed-in', userId: 'B' });
    await expect(read()).resolves.toEqual(['datos de B']);
    resolvePrevious(['datos de A']);
    await pendingRead;
    await expect(read()).resolves.toEqual(['datos de B']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

it('invalidar pagos conserva los productos y notifica a los observadores', async () => {
  const cache = new RepositoryCache();
  const observer = jest.fn();
  cache.subscribe(observer);
  const payments = createPaymentsRepository({ getMyPayments: jest.fn().mockResolvedValue([]), getMyPaymentHistory: jest.fn().mockResolvedValue([]) }, cache);
  const fetchProducts = jest.fn().mockResolvedValue([]);
  const products = createProductsRepository({ getProducts: fetchProducts, getProduct }, cache);

  await payments.getHistory();
  await payments.getRecentPayments();
  await products.getProducts();
  payments.invalidate();

  expect(cache.peek('payments:history')).toBeUndefined();
  expect(cache.peek('payments:recent')).toBeUndefined();
  expect(observer).toHaveBeenCalledWith({ type: 'invalidated', prefix: 'payments' });
  await products.getProducts();
  expect(fetchProducts).toHaveBeenCalledTimes(1);
});
