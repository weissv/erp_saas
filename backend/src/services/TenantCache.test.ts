// src/services/TenantCache.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import {
  TenantCache,
  InMemoryCacheBackend,
} from "./TenantCache";

describe("TenantCache", () => {
  let backend: InMemoryCacheBackend;

  beforeEach(() => {
    backend = new InMemoryCacheBackend();
  });

  it("should throw if tenantId is empty", () => {
    expect(() => new TenantCache("", backend)).toThrow(
      "TenantCache requires a non-empty tenantId",
    );
  });

  describe("key prefixing", () => {
    it("should prefix all keys with tenant:{tenantId}:", async () => {
      const cache = new TenantCache("hogwarts", backend);
      await cache.set("schedule:monday", { class: "Potions" });

      const raw = await backend.get("tenant:hogwarts:schedule:monday");
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!)).toEqual({ class: "Potions" });
    });

    it("should isolate keys between different tenants", async () => {
      const cache1 = new TenantCache("hogwarts", backend);
      const cache2 = new TenantCache("beauxbatons", backend);

      await cache1.set("score", 100);
      await cache2.set("score", 200);

      expect(await cache1.get<number>("score")).toBe(100);
      expect(await cache2.get<number>("score")).toBe(200);
    });
  });

  describe("get / set", () => {
    it("should return null for missing keys", async () => {
      const cache = new TenantCache("t1", backend);
      expect(await cache.get("missing")).toBeNull();
    });

    it("should round-trip objects via JSON", async () => {
      const cache = new TenantCache("t1", backend);
      const obj = { a: 1, b: [2, 3] };
      await cache.set("data", obj);
      expect(await cache.get("data")).toEqual(obj);
    });

    it("should round-trip plain strings", async () => {
      const cache = new TenantCache("t1", backend);
      await cache.set("name", "Albus");
      expect(await cache.get("name")).toBe("Albus");
    });
  });

  describe("del", () => {
    it("should delete a specific key", async () => {
      const cache = new TenantCache("t1", backend);
      await cache.set("x", "1");
      await cache.del("x");
      expect(await cache.get("x")).toBeNull();
    });
  });

  describe("flushTenant", () => {
    it("should delete all keys for the tenant", async () => {
      const cache = new TenantCache("flush-me", backend);
      await cache.set("a", "1");
      await cache.set("b", "2");
      await cache.set("c", "3");

      const count = await cache.flushTenant();
      expect(count).toBe(3);

      expect(await cache.get("a")).toBeNull();
      expect(await cache.get("b")).toBeNull();
      expect(await cache.get("c")).toBeNull();
    });

    it("should not delete keys from other tenants", async () => {
      const cache1 = new TenantCache("keep", backend);
      const cache2 = new TenantCache("remove", backend);

      await cache1.set("data", "safe");
      await cache2.set("data", "gone");

      await cache2.flushTenant();

      expect(await cache1.get("data")).toBe("safe");
      expect(await cache2.get("data")).toBeNull();
    });
  });

  describe("TTL", () => {
    it("should expire keys after the TTL elapses", async () => {
      const cache = new TenantCache("t1", backend);
      await cache.set("temp", "value", 1); // 1 second TTL

      expect(await cache.get("temp")).toBe("value");

      // Simulate time passing
      await new Promise((r) => setTimeout(r, 1100));
      expect(await cache.get("temp")).toBeNull();
    });
  });
});
