// src/middleware/actionLogger.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { logAction } from "./actionLogger";

// ── Mock prisma ──────────────────────────────────────────────────────────────
vi.mock("../prisma", () => ({
  prisma: {
    actionLog: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
    },
  },
}));

// ── Mock logger ──────────────────────────────────────────────────────────────
vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { prisma } from "../prisma";

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: 1, role: "ADMIN", employeeId: 10 },
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  return {} as Response;
}

describe("actionLogger", () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  it("should always call next() even if logging succeeds", async () => {
    const middleware = logAction("TEST_ACTION");
    await middleware(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should always call next() even if logging fails", async () => {
    (prisma.actionLog.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("db down"),
    );

    const middleware = logAction("FAIL_ACTION");
    await middleware(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should include tenantId from x-tenant-id header", async () => {
    const req = mockReq({
      headers: { "x-tenant-id": "hogwarts" } as Record<string, string>,
    });

    const middleware = logAction("CREATE_CHILD");
    await middleware(req, mockRes(), next);

    expect(prisma.actionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 1,
        action: "CREATE_CHILD",
        details: expect.objectContaining({ tenantId: "hogwarts" }),
      }),
    });
  });

  it("should include tenantId from req.tenantId property", async () => {
    const req = mockReq();
    (req as unknown as Record<string, unknown>).tenantId = "beauxbatons";

    const middleware = logAction("UPDATE_SETTINGS");
    await middleware(req, mockRes(), next);

    expect(prisma.actionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: expect.objectContaining({ tenantId: "beauxbatons" }),
      }),
    });
  });

  it("should default tenantId to 'unknown' when no source is available", async () => {
    const middleware = logAction("SOME_ACTION");
    await middleware(mockReq(), mockRes(), next);

    expect(prisma.actionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: expect.objectContaining({ tenantId: "unknown" }),
      }),
    });
  });

  it("should merge user-provided details with tenantId", async () => {
    const req = mockReq({
      headers: { "x-tenant-id": "hogwarts" } as Record<string, string>,
      params: { childId: "42" },
    } as unknown as Partial<Request>);

    const detailsFn = (r: Request) => ({
      childId: r.params?.childId,
    });

    const middleware = logAction("DELETE_CHILD", detailsFn);
    await middleware(req, mockRes(), next);

    expect(prisma.actionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: expect.objectContaining({
          childId: "42",
          tenantId: "hogwarts",
        }),
      }),
    });
  });

  it("should not log when req.user is absent", async () => {
    const req = mockReq({ user: undefined });

    const middleware = logAction("ANON_ACTION");
    await middleware(req, mockRes(), next);

    expect(prisma.actionLog.create).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should prefer req.tenantId over x-tenant-id header", async () => {
    const req = mockReq({
      headers: { "x-tenant-id": "from-header" } as Record<string, string>,
    });
    (req as unknown as Record<string, unknown>).tenantId = "from-middleware";

    const middleware = logAction("PRIORITY_TEST");
    await middleware(req, mockRes(), next);

    expect(prisma.actionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        details: expect.objectContaining({ tenantId: "from-middleware" }),
      }),
    });
  });
});
