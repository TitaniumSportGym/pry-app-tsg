import { sessionEvents } from '@/core/observer/session-events';

import { RepositoryCache, repositoryCache } from './repository-cache';

const TTL = 1000;

function createCache() {
  let now = 0;
  const cache = new RepositoryCache(() => now);
  return {
    cache,
    advance(ms: number) {
      now += ms;
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('RepositoryCache', () => {
  it('devuelve la copia guardada mientras está vigente y vuelve a pedirla al vencer', async () => {
    const { cache, advance } = createCache();
    const fetcher = jest.fn().mockResolvedValueOnce(['v1']).mockResolvedValueOnce(['v2']);

    expect(await cache.read('rutinas', fetcher, { ttlMs: TTL })).toEqual(['v1']);
    advance(TTL - 1);
    expect(await cache.read('rutinas', fetcher, { ttlMs: TTL })).toEqual(['v1']);
    expect(fetcher).toHaveBeenCalledTimes(1);

    advance(1);
    expect(await cache.read('rutinas', fetcher, { ttlMs: TTL })).toEqual(['v2']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('force ignora la copia guardada (jalar para actualizar)', async () => {
    const { cache } = createCache();
    const fetcher = jest.fn().mockResolvedValueOnce('viejo').mockResolvedValueOnce('nuevo');

    await cache.read('pagos', fetcher, { ttlMs: TTL });
    expect(await cache.read('pagos', fetcher, { ttlMs: TTL, force: true })).toBe('nuevo');
    expect(cache.peek('pagos')).toBe('nuevo');
  });

  it('comparte una sola petición entre lecturas simultáneas', async () => {
    const { cache } = createCache();
    const pending = deferred<string>();
    const fetcher = jest.fn(() => pending.promise);

    const first = cache.read('productos', fetcher, { ttlMs: TTL });
    const second = cache.read('productos', fetcher, { ttlMs: TTL });
    pending.resolve('catálogo');

    await expect(Promise.all([first, second])).resolves.toEqual(['catálogo', 'catálogo']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('no guarda errores y conserva la última copia buena', async () => {
    const { cache, advance } = createCache();
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce('bueno')
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValueOnce('recuperado');

    await cache.read('pagos', fetcher, { ttlMs: TTL });
    advance(TTL);
    await expect(cache.read('pagos', fetcher, { ttlMs: TTL })).rejects.toThrow('sin red');
    expect(cache.peek('pagos')).toBe('bueno');
    expect(await cache.read('pagos', fetcher, { ttlMs: TTL })).toBe('recuperado');
  });

  it('invalidar borra por prefijo y avisa a los observadores', async () => {
    const { cache } = createCache();
    const observer = jest.fn();
    cache.subscribe(observer);

    await cache.read('payments:history', async () => 'historial', { ttlMs: TTL });
    await cache.read('payments:recent', async () => 'recientes', { ttlMs: TTL });
    await cache.read('products:list', async () => 'catálogo', { ttlMs: TTL });
    cache.invalidate('payments');

    expect(cache.peek('payments:history')).toBeUndefined();
    expect(cache.peek('payments:recent')).toBeUndefined();
    expect(cache.peek('products:list')).toBe('catálogo');
    expect(observer).toHaveBeenCalledWith({ type: 'invalidated', prefix: 'payments' });
  });

  it('descarta respuestas de peticiones iniciadas antes de limpiar la caché', async () => {
    const { cache } = createCache();
    const pending = deferred<string>();

    const read = cache.read('pagos', () => pending.promise, { ttlMs: TTL });
    cache.clear();
    pending.resolve('datos del usuario anterior');

    await read;
    expect(cache.peek('pagos')).toBeUndefined();
  });

  it('se vacía cuando cambia la sesión, para no mostrar datos de otro usuario', async () => {
    await repositoryCache.read('payments:history', async () => ['pago de Ana'], { ttlMs: TTL });

    sessionEvents.notify({ type: 'signed-out' });

    expect(repositoryCache.peek('payments:history')).toBeUndefined();
  });
});
