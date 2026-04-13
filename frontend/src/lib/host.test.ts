// src/lib/host.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to mock import.meta.env before importing the module
// The module reads VITE_MARKETING_HOSTNAME at call-time, so we can control it
vi.stubGlobal("import", { meta: { env: {} } });

describe("resolveHost", () => {
  let resolveHost: typeof import("./host").resolveHost;

  beforeEach(async () => {
    vi.resetModules();
    // Clear env override
    vi.stubEnv("VITE_MARKETING_HOSTNAME", "");
    // Re-import to get a fresh module
    const mod = await import("./host");
    resolveHost = mod.resolveHost;
  });

  it("identifies marketing apex hostname", () => {
    const info = resolveHost("mirai-edu.space");
    expect(info.kind).toBe("marketing");
    expect(info.subdomain).toBeNull();
  });

  it("identifies www marketing hostname", () => {
    const info = resolveHost("www.mirai-edu.space");
    expect(info.kind).toBe("marketing");
    expect(info.subdomain).toBeNull();
  });

  it("identifies demo subdomain", () => {
    const info = resolveHost("demo.mirai-edu.space");
    expect(info.kind).toBe("demo");
    expect(info.subdomain).toBe("demo");
  });

  it("identifies tenant subdomain", () => {
    const info = resolveHost("schoolA.mirai-edu.space");
    expect(info.kind).toBe("tenant");
    expect(info.subdomain).toBe("schoola");
  });

  it("treats localhost as tenant (dev mode)", () => {
    const info = resolveHost("localhost");
    expect(info.kind).toBe("tenant");
    expect(info.subdomain).toBeNull();
  });

  it("is case-insensitive", () => {
    const info = resolveHost("MIRAI-EDU.SPACE");
    expect(info.kind).toBe("marketing");
  });
});
