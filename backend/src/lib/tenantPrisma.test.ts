// src/lib/tenantPrisma.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub TENANT_PRISMA_CACHE_SIZE before import (doesn't affect module-level
// const since it's already loaded, so we use _setMaxCacheSize in tests).

// ── Mock @prisma/client using vi.hoisted ───────────────────────────────

const { mockDisconnect, MockPrismaClient } = vi.hoisted(() => {
  const mockDisconnect = vi.fn().mockResolvedValue(undefined);
  const MockPrismaClient = vi.fn().mockImplementation(() => ({
    $disconnect: mockDisconnect,
  }));
  return { mockDisconnect, MockPrismaClient };
});

vi.mock("@prisma/client", () => ({
  PrismaClient: MockPrismaClient,
}));

import {
  getTenantPrisma,
  removeTenantPrisma,
  disconnectAllTenants,
  _getCacheSize,
  _clearCache,
  _setMaxCacheSize,
} from "./tenantPrisma";

describe("tenantPrisma", () => {
  beforeEach(() => {
    _clearCache();
    // Re-apply mockImplementation since global setup calls vi.clearAllMocks()
    mockDisconnect.mockResolvedValue(undefined);
    MockPrismaClient.mockImplementation(() => ({
      $disconnect: mockDisconnect,
    }));
  });

  it("creates a new PrismaClient on first call for a tenantId", () => {
    const client = getTenantPrisma("t-1", "postgres://db-1");
    expect(client).toBeDefined();
    expect(MockPrismaClient).toHaveBeenCalledTimes(1);
    expect(_getCacheSize()).toBe(1);
  });

  it("returns the cached client on subsequent calls with the same URL", () => {
    const first = getTenantPrisma("t-1", "postgres://db-1");
    const second = getTenantPrisma("t-1", "postgres://db-1");
    expect(first).toBe(second);
    expect(MockPrismaClient).toHaveBeenCalledTimes(1);
  });

  it("creates a new client if the dbUrl changes for the same tenantId", () => {
    const first = getTenantPrisma("t-1", "postgres://db-old");
    const second = getTenantPrisma("t-1", "postgres://db-new");
    expect(first).not.toBe(second);
    expect(MockPrismaClient).toHaveBeenCalledTimes(2);
    // Old client should be disconnected.
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it("removeTenantPrisma disconnects and removes the entry", async () => {
    getTenantPrisma("t-1", "postgres://db-1");
    expect(_getCacheSize()).toBe(1);

    await removeTenantPrisma("t-1");
    expect(mockDisconnect).toHaveBeenCalled();
    expect(_getCacheSize()).toBe(0);
  });

  it("removeTenantPrisma is a no-op for unknown tenantId", async () => {
    await removeTenantPrisma("unknown");
    expect(mockDisconnect).not.toHaveBeenCalled();
  });

  it("disconnectAllTenants disconnects every cached client", async () => {
    getTenantPrisma("t-1", "postgres://db-1");
    getTenantPrisma("t-2", "postgres://db-2");
    expect(_getCacheSize()).toBe(2);

    await disconnectAllTenants();
    expect(mockDisconnect).toHaveBeenCalledTimes(2);
    expect(_getCacheSize()).toBe(0);
  });

  it("evicts the least-recently-used client when cache exceeds limit", () => {
    // Set a small cache limit for this test.
    _setMaxCacheSize(3);

    // Fill the cache to capacity.
    getTenantPrisma("t-1", "postgres://db-1");
    getTenantPrisma("t-2", "postgres://db-2");
    getTenantPrisma("t-3", "postgres://db-3");
    expect(_getCacheSize()).toBe(3);

    // Access t-1 to make it "recently used", leaving t-2 as LRU.
    getTenantPrisma("t-1", "postgres://db-1");

    // Adding a 4th tenant should evict t-2 (least recently used).
    getTenantPrisma("t-4", "postgres://db-4");
    expect(_getCacheSize()).toBe(3);

    // t-2 was evicted, so $disconnect should have been called once for eviction.
    expect(mockDisconnect).toHaveBeenCalledTimes(1);

    // t-1, t-3, and t-4 should still be cached.
    expect(getTenantPrisma("t-1", "postgres://db-1")).toBeDefined();
    expect(getTenantPrisma("t-3", "postgres://db-3")).toBeDefined();
    expect(getTenantPrisma("t-4", "postgres://db-4")).toBeDefined();
  });
});
