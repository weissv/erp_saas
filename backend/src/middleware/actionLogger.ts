// src/middleware/actionLogger.ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";

/**
 * Tenant-aware action logger middleware.
 *
 * Every log entry MUST include a `tenantId`.  The value is resolved in order:
 *   1. `req.tenantId`   – set by tenantResolver middleware (preferred)
 *   2. `req.headers["x-tenant-id"]`  – explicit header override
 *
 * If neither source provides a tenant identifier the log is still persisted
 * with `tenantId: "unknown"` so that no action goes untracked, but a console
 * warning is emitted so operators can investigate the gap.
 */
export const logAction =
  (action: string, details?: (req: Request) => unknown) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        const tenantId = resolveTenantId(req);

        if (!tenantId || tenantId === "unknown") {
          console.warn(
            `[ActionLog] Missing tenantId for action="${action}" userId=${req.user.id}`,
          );
        }

        await prisma.actionLog.create({
          data: {
            userId: req.user.id,
            action,
            details: {
              ...(typeof details === "function" ? details(req) : undefined) as Record<string, unknown> | undefined,
              tenantId: tenantId || "unknown",
            },
          },
        });
      }
    } catch (e) {
      // Не валим основной флоу, если логирование упало
      console.warn("ActionLog error:", e);
    }
    next();
  };

/**
 * Extracts the tenant identifier from the request.
 */
function resolveTenantId(req: Request): string {
  // 1. Middleware-injected value (e.g. from tenantResolver)
  const reqAny = req as unknown as Record<string, unknown>;
  if (reqAny.tenantId) {
    return String(reqAny.tenantId);
  }

  // 2. Explicit header
  const header = req.headers["x-tenant-id"];
  if (header) {
    return Array.isArray(header) ? header[0] : header;
  }

  return "unknown";
}

