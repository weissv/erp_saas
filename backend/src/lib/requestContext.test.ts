import { describe, expect, it } from "vitest";
import {
  getRequestContext,
  getRequestPrisma,
  getRequestTenantId,
  runWithRequestContext,
} from "./requestContext";

describe("requestContext", () => {
  it("returns undefined outside a request scope", () => {
    expect(getRequestContext()).toBeUndefined();
    expect(getRequestPrisma()).toBeUndefined();
    expect(getRequestTenantId()).toBeUndefined();
  });

  it("preserves prisma and tenantId within async work", async () => {
    const prisma = { name: "tenant-prisma" } as any;

    const result = await runWithRequestContext(
      { prisma, tenantId: "demo" },
      async () => {
        await Promise.resolve();

        return {
          context: getRequestContext(),
          currentPrisma: getRequestPrisma(),
          currentTenantId: getRequestTenantId(),
        };
      },
    );

    expect(result.context).toEqual({ prisma, tenantId: "demo" });
    expect(result.currentPrisma).toBe(prisma);
    expect(result.currentTenantId).toBe("demo");
  });
});