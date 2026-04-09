// src/middleware/tenantResolver.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";

// ── Hoisted mocks (must be created via vi.hoisted to survive vi.mock hoisting) ──
const { mockFindUnique, mockGetTenantPrisma } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockGetTenantPrisma: vi.fn().mockReturnValue({ _isMockPrisma: true }),
}));

// Config mock
vi.mock("../config", () => ({
  config: {
    baseDomain: "mezon.app",
  },
}));

// Master Prisma mock
vi.mock("../lib/masterPrisma", () => ({
  getMasterPrisma: () => ({
    tenant: {
      findUnique: mockFindUnique,
    },
  }),
}));

// Tenant Prisma mock
vi.mock("../lib/tenantPrisma", () => ({
  getTenantPrisma: (...args: unknown[]) => mockGetTenantPrisma(...args),
}));

// Import after mocks are in place
import { extractSubdomain, tenantResolver } from "./tenantResolver";

// ── Helpers ─────────────────────────────────────────────────────────────

function mockReq(host?: string, method = "GET"): Request {
  return {
    headers: { host },
    method,
  } as unknown as Request;
}

function mockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  return { json, status } as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("extractSubdomain", () => {
  it("returns null when host is undefined", () => {
    expect(extractSubdomain(undefined)).toBeNull();
  });

  it("returns null for the bare base domain", () => {
    expect(extractSubdomain("mezon.app")).toBeNull();
  });

  it("extracts a simple subdomain", () => {
    expect(extractSubdomain("hogwarts.mezon.app")).toBe("hogwarts");
  });

  it("strips port numbers", () => {
    expect(extractSubdomain("acme.mezon.app:4000")).toBe("acme");
  });

  it("returns null for hosts that don't end with base domain", () => {
    expect(extractSubdomain("evil.example.com")).toBeNull();
  });

  it("returns null for invalid subdomains (uppercase)", () => {
    expect(extractSubdomain("HOGWARTS.mezon.app")).toBeNull();
  });

  it("returns null for subdomains starting with a hyphen", () => {
    expect(extractSubdomain("-bad.mezon.app")).toBeNull();
  });

  it("allows hyphens in the middle", () => {
    expect(extractSubdomain("my-school.mezon.app")).toBe("my-school");
  });
});

describe("tenantResolver middleware", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    // Re-apply mockReturnValue since global setup calls vi.clearAllMocks()
    mockGetTenantPrisma.mockReturnValue({ _isMockPrisma: true });
  });

  it("passes OPTIONS requests through without resolution", async () => {
    const req = mockReq("hogwarts.mezon.app", "OPTIONS");
    const res = mockRes();

    await tenantResolver(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 when no subdomain can be extracted", async () => {
    const req = mockReq("mezon.app");
    const res = mockRes();

    await tenantResolver(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "TENANT_NOT_RESOLVED" }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 404 when tenant is not found in master DB", async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = mockReq("unknown.mezon.app");
    const res = mockRes();

    await tenantResolver(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "TENANT_NOT_FOUND" }),
      }),
    );
  });

  it("returns 402 for suspended tenants", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t-1",
      dbUrl: "postgres://...",
      status: "SUSPENDED",
    });
    const req = mockReq("hogwarts.mezon.app");
    const res = mockRes();

    await tenantResolver(req, res, next);

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "TENANT_SUSPENDED" }),
      }),
    );
  });

  it("returns 403 for deactivated tenants", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t-2",
      dbUrl: "postgres://...",
      status: "DEACTIVATED",
    });
    const req = mockReq("hogwarts.mezon.app");
    const res = mockRes();

    await tenantResolver(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "TENANT_DEACTIVATED" }),
      }),
    );
  });

  it("injects tenantId and prisma for ACTIVE tenants", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t-active",
      dbUrl: "postgres://active-db",
      status: "ACTIVE",
    });
    const req = mockReq("hogwarts.mezon.app");
    const res = mockRes();

    await tenantResolver(req, res, next);

    expect(req.tenantId).toBe("t-active");
    expect(req.prisma).toEqual({ _isMockPrisma: true });
    expect(mockGetTenantPrisma).toHaveBeenCalledWith("t-active", "postgres://active-db");
    expect(next).toHaveBeenCalled();
  });

  it("injects tenantId and prisma for TRIAL tenants", async () => {
    mockFindUnique.mockResolvedValue({
      id: "t-trial",
      dbUrl: "postgres://trial-db",
      status: "TRIAL",
    });
    const req = mockReq("school123.mezon.app");
    const res = mockRes();

    await tenantResolver(req, res, next);

    expect(req.tenantId).toBe("t-trial");
    expect(next).toHaveBeenCalled();
  });

  it("returns 500 when master DB lookup throws", async () => {
    mockFindUnique.mockRejectedValue(new Error("DB down"));
    const req = mockReq("hogwarts.mezon.app");
    const res = mockRes();

    await tenantResolver(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "TENANT_RESOLUTION_ERROR" }),
      }),
    );
  });
});
