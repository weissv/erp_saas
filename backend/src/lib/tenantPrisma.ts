// src/lib/tenantPrisma.ts
// Dynamic Prisma-client factory for tenant databases.
//
// Each tenant has its own isolated PostgreSQL database.  This module keeps an
// in-memory cache of PrismaClient instances keyed by `tenantId` so we don't
// create a new connection pool on every request.
//
// An LRU-style eviction strategy prevents unbounded memory growth: when the
// cache exceeds MAX_CACHED_CLIENTS the least-recently-used client is
// disconnected and removed.

import { PrismaClient } from "@prisma/client";

/** Maximum number of tenant Prisma clients kept in memory. */
let maxCachedClients = parseInt(
  process.env.TENANT_PRISMA_CACHE_SIZE || "50",
  10,
);

interface CachedClient {
  client: PrismaClient;
  dbUrl: string;
  lastUsed: number; // epoch ms
}

const cache = new Map<string, CachedClient>();

/**
 * Returns a PrismaClient connected to the given tenant's database.
 *
 * @param tenantId - Unique tenant identifier (used as cache key).
 * @param dbUrl    - Full PostgreSQL connection string for the tenant DB.
 */
export function getTenantPrisma(tenantId: string, dbUrl: string): PrismaClient {
  const existing = cache.get(tenantId);

  if (existing) {
    // If the URL has changed (e.g. DB migration) create a fresh client.
    if (existing.dbUrl === dbUrl) {
      existing.lastUsed = Date.now();
      return existing.client;
    }
    // URL changed – disconnect stale client asynchronously.
    void existing.client.$disconnect();
    cache.delete(tenantId);
  }

  // Evict least-recently-used entry when cache is full.
  if (cache.size >= maxCachedClients) {
    evictLru();
  }

  const client = new PrismaClient({
    log: ["error", "warn"],
    datasourceUrl: dbUrl,
  });

  cache.set(tenantId, {
    client,
    dbUrl,
    lastUsed: Date.now(),
  });

  return client;
}

/**
 * Evicts the least-recently-used client from the cache.
 */
function evictLru(): void {
  let oldestKey: string | undefined;
  let oldestTime = Infinity;

  for (const [key, entry] of cache) {
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    const evicted = cache.get(oldestKey);
    if (evicted) {
      void evicted.client.$disconnect();
    }
    cache.delete(oldestKey);
  }
}

/**
 * Disconnects and removes a specific tenant's Prisma client from the cache.
 */
export async function removeTenantPrisma(tenantId: string): Promise<void> {
  const entry = cache.get(tenantId);
  if (entry) {
    await entry.client.$disconnect();
    cache.delete(tenantId);
  }
}

/**
 * Disconnects all cached tenant Prisma clients.
 * Call this during application shutdown.
 */
export async function disconnectAllTenants(): Promise<void> {
  const promises: Promise<void>[] = [];
  for (const [, entry] of cache) {
    promises.push(entry.client.$disconnect());
  }
  await Promise.all(promises);
  cache.clear();
}

/* ── Visible for testing ── */
export function _getCacheSize(): number {
  return cache.size;
}
export function _clearCache(): void {
  cache.clear();
}
export function _setMaxCacheSize(size: number): void {
  maxCachedClients = size;
}
