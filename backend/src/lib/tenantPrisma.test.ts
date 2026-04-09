// src/lib/tenantPrisma.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

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
});
