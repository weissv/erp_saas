// src/lib/host.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("resolveHost", () => {
  let resolveHost: typeof import("./host").resolveHost;

  beforeEach(async () => {
    vi.resetModules();
    // Re-import to get a fresh module each time
    const mod = await import("./host");
    resolveHost = mod.resolveHost;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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

  it("identifies tenant subdomain (lowercased)", () => {
    const info = resolveHost("schoolA.mirai-edu.space");
    expect(info.kind).toBe("tenant");
    // Subdomain is extracted from the lowercased hostname
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
