// src/services/TenantCache.ts
// Tenant-scoped Redis cache wrapper.
//
// Every key is automatically prefixed with `tenant:{tenantId}:` so that
// cache entries are strictly isolated between tenants.
//
// The wrapper exposes the most common operations (get / set / del / flush)
// and delegates to an underlying `CacheBackend` interface so that the real
// Redis client can be swapped for an in-memory stub during tests.

import { logger } from "../utils/logger";

// ────────────────────────────────────────────────────────────────────────────
// Cache backend abstraction
// ────────────────────────────────────────────────────────────────────────────

export interface CacheBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Return all keys matching a glob pattern (e.g. `tenant:hogwarts:*`). */
  keys(pattern: string): Promise<string[]>;
}

// ────────────────────────────────────────────────────────────────────────────
// In-memory backend (tests & environments without Redis)
// ────────────────────────────────────────────────────────────────────────────

interface MemoryEntry {
  value: string;
  expiresAt: number | null; // epoch ms, null = never
}

export class InMemoryCacheBackend implements CacheBackend {
  private store = new Map<string, MemoryEntry>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
    );
    return [...this.store.keys()].filter((k) => regex.test(k));
  }

  /** Utility for tests – wipe everything. */
  clear(): void {
    this.store.clear();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Tenant-scoped cache facade
// ────────────────────────────────────────────────────────────────────────────

export class TenantCache {
  private readonly prefix: string;

  constructor(
    private readonly tenantId: string,
    private readonly backend: CacheBackend,
  ) {
    if (!tenantId) {
      throw new Error("TenantCache requires a non-empty tenantId");
    }
    this.prefix = `tenant:${tenantId}:`;
  }

  /** Build the full key including the tenant prefix. */
  private key(suffix: string): string {
    return `${this.prefix}${suffix}`;
  }

  /** Retrieve a cached value. */
  async get<T = string>(suffix: string): Promise<T | null> {
    const raw = await this.backend.get(this.key(suffix));
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Value was stored as a plain string – return as-is.
      return raw as unknown as T;
    }
  }

  /** Store a value under the tenant-scoped key. */
  async set(suffix: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    await this.backend.set(this.key(suffix), serialized, ttlSeconds);
    logger.info(`[TenantCache] SET ${this.key(suffix)}`);
  }

  /** Delete a single key. */
  async del(suffix: string): Promise<void> {
    await this.backend.del(this.key(suffix));
    logger.info(`[TenantCache] DEL ${this.key(suffix)}`);
  }

  /**
   * Delete **all** keys belonging to this tenant.
   * Useful during tenant teardown or cache invalidation.
   */
  async flushTenant(): Promise<number> {
    const keys = await this.backend.keys(`${this.prefix}*`);
    for (const k of keys) {
      await this.backend.del(k);
    }
    logger.info(`[TenantCache] Flushed ${keys.length} keys for tenant=${this.tenantId}`);
    return keys.length;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Factory – build a TenantCache for the given tenant & backend
// ────────────────────────────────────────────────────────────────────────────

let _defaultBackend: CacheBackend = new InMemoryCacheBackend();

/** Override the default backend (call once at startup with a real Redis adapter). */
export function setDefaultCacheBackend(backend: CacheBackend): void {
  _defaultBackend = backend;
}

/** Convenience factory that uses the default backend. */
export function createTenantCache(tenantId: string): TenantCache {
  return new TenantCache(tenantId, _defaultBackend);
}
