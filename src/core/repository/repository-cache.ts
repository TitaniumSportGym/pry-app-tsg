import { sessionEvents } from '@/core/observer/session-events';
import { Subject, type Listener, type Unsubscribe } from '@/core/observer/subject';

export interface ReadOptions {
  /** Ignora la copia guardada y vuelve a pedir los datos a la fuente (jalar para actualizar, reintentar). */
  force?: boolean;
}

export type CacheEvent = { type: 'invalidated'; prefix: string } | { type: 'cleared' };

interface CacheEntry {
  data?: unknown;
  updatedAt: number;
  pending?: Promise<unknown>;
}

type Clock = () => number;

/**
 * Caché en memoria compartida por todos los repositorios.
 * - Los datos vigentes se devuelven sin petición; los vencidos se vuelven a pedir.
 * - Las lecturas simultáneas de la misma clave comparten una sola petición.
 * - Los errores nunca se guardan, así que un reintento siempre llega a la fuente de datos.
 * También es un sujeto: las pantallas la observan para recargarse cuando se invalidan sus datos.
 */
export class RepositoryCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly events = new Subject<CacheEvent>();
  /** Aumenta con clear(); se descartan los resultados de peticiones iniciadas antes. */
  private generation = 0;

  constructor(private readonly now: Clock = Date.now) {}

  async read<T>(
    key: string,
    fetcher: () => Promise<T>,
    { ttlMs, force = false }: ReadOptions & { ttlMs: number },
  ): Promise<T> {
    const entry = this.entries.get(key);

    if (!force && entry?.pending) return entry.pending as Promise<T>;
    if (!force && entry && 'data' in entry && this.now() - entry.updatedAt < ttlMs) {
      return entry.data as T;
    }

    const generation = this.generation;
    const pending = fetcher();
    this.entries.set(key, { ...entry, updatedAt: entry?.updatedAt ?? 0, pending });

    try {
      const data = await pending;
      if (generation === this.generation && this.entries.get(key)?.pending === pending) {
        this.entries.set(key, { data, updatedAt: this.now() });
      }
      return data;
    } catch (error) {
      const current = this.entries.get(key);
      // Se conserva la última copia buena (si la hay); el error en sí no se guarda.
      if (current?.pending === pending) {
        if ('data' in current) this.entries.set(key, { data: current.data, updatedAt: current.updatedAt });
        else this.entries.delete(key);
      }
      throw error;
    }
  }

  /** Devuelve el valor guardado sin hacer petición, si existe (vigente o no). */
  peek<T>(key: string): T | undefined {
    return this.entries.get(key)?.data as T | undefined;
  }

  /** Borra todas las claves que empiezan con `prefix` y avisa a los observadores. */
  invalidate(prefix: string) {
    for (const key of [...this.entries.keys()]) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
    this.events.notify({ type: 'invalidated', prefix });
  }

  clear() {
    this.entries.clear();
    this.generation += 1;
    this.events.notify({ type: 'cleared' });
  }

  subscribe(listener: Listener<CacheEvent>): Unsubscribe {
    return this.events.subscribe(listener);
  }
}

export const repositoryCache = new RepositoryCache();

// Otro usuario nunca debe ver los pagos o rutinas del usuario anterior.
sessionEvents.subscribe(() => repositoryCache.clear());
