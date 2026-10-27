import { sessionEvents } from '@/core/observer/session-events';
import { Subject, type Listener, type Unsubscribe } from '@/core/observer/subject';

export interface ReadOptions {
  /** Skips the cached copy and asks the data source again (pull to refresh, retry). */
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
 * In-memory cache shared by every repository.
 * - Fresh data is returned without a request; stale data is fetched again.
 * - Simultaneous reads of the same key share one request.
 * - Errors are never cached, so a retry always reaches the data source.
 * It is also a subject: screens observe it to reload when data is invalidated.
 */
export class RepositoryCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly events = new Subject<CacheEvent>();
  /** Increases on clear(); results of requests started before it are discarded. */
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
      // Keep the previous good copy (if any); the failure itself is not cached.
      if (current?.pending === pending) {
        if ('data' in current) this.entries.set(key, { data: current.data, updatedAt: current.updatedAt });
        else this.entries.delete(key);
      }
      throw error;
    }
  }

  /** Returns a cached value without fetching, if there is one (fresh or not). */
  peek<T>(key: string): T | undefined {
    return this.entries.get(key)?.data as T | undefined;
  }

  /** Drops every key that starts with `prefix` and tells the observers. */
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

// A different user must never see the previous user's payments or routines.
sessionEvents.subscribe(() => repositoryCache.clear());
