// src/middleware/tenantResolver.ts
// Express middleware that resolves the current tenant from the request
// subdomain, looks it up in the Control Plane, and injects a correctly
// scoped PrismaClient into the request object.

import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { getMasterPrisma } from "../lib/masterPrisma";
import { getTenantPrisma } from "../lib/tenantPrisma";
import { config } from "../config";
import { HTTP_STATUS, TENANT_STATUS } from "../constants";

// ─── Extend Express Request ────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      /** Unique tenant identifier (Control Plane UUID). */
      tenantId?: string;
      /** PrismaClient connected to the resolved tenant's database. */
      prisma?: PrismaClient;
    }
  }
}

// ─── Subdomain extraction ──────────────────────────────────────────────────

/**
 * Extracts the tenant subdomain from the `Host` header.
 *
 * Given `hogwarts.mezon.app` and a base domain of `mezon.app`, returns
 * `"hogwarts"`.  Returns `null` when the host IS the base domain, when no
 * host header is present, or when the subdomain portion is empty/invalid.
 */
export function extractSubdomain(host: string | undefined): string | null {
  if (!host) return null;

  // Strip port number if present (e.g. localhost:4000).
  const hostname = host.split(":")[0];

  const baseDomain = config.baseDomain;

  // Exact match with the base domain – no subdomain.
  if (hostname === baseDomain) return null;

  // hostname must end with `.${baseDomain}`.
  const suffix = `.${baseDomain}`;
  if (!hostname.endsWith(suffix)) return null;

  const subdomain = hostname.slice(0, -suffix.length);

  // Subdomains must be non-empty, lowercase, alphanumeric (plus hyphens).
  if (!subdomain || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
    return null;
  }

  return subdomain;
}

// ─── Middleware ─────────────────────────────────────────────────────────────

/**
 * Tenant resolution middleware.
 *
 * 1. Parses subdomain from the incoming request.
 * 2. Queries the Control Plane (master DB) for a matching tenant.
 * 3. Rejects inactive / unpaid tenants with 402 or 403.
 * 4. Injects `req.tenantId` and `req.prisma` for downstream handlers.
 */
export const tenantResolver = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Preflight requests pass through immediately.
  if (req.method === "OPTIONS") {
    next();
    return;
  }

  const subdomain = extractSubdomain(req.headers.host);

  if (!subdomain) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {
        code: "TENANT_NOT_RESOLVED",
        message: "Unable to determine tenant from request.",
      },
    });
    return;
  }

  try {
    const master = getMasterPrisma();

    const tenant = await master.tenant.findUnique({
      where: { subdomain },
      select: { id: true, dbUrl: true, status: true },
    });

    if (!tenant) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {
          code: "TENANT_NOT_FOUND",
          message: "Tenant not found.",
        },
      });
      return;
    }

    // ── Access control based on tenant status ──────────────────────────
    if (tenant.status === TENANT_STATUS.SUSPENDED) {
      res.status(HTTP_STATUS.PAYMENT_REQUIRED).json({
        error: {
          code: "TENANT_SUSPENDED",
          message: "Tenant account is suspended. Please update payment.",
        },
      });
      return;
    }

    if (tenant.status === TENANT_STATUS.DEACTIVATED) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {
          code: "TENANT_DEACTIVATED",
          message: "Tenant account has been deactivated.",
        },
      });
      return;
    }

    // Only ACTIVE and TRIAL tenants proceed.
    req.tenantId = tenant.id;
    req.prisma = getTenantPrisma(tenant.id, tenant.dbUrl);

    next();
  } catch (error) {
    console.error("[tenantResolver] Error resolving tenant:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {
        code: "TENANT_RESOLUTION_ERROR",
        message: "An error occurred while resolving the tenant.",
      },
    });
  }
};
