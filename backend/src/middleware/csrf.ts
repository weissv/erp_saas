import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { JWT } from "../constants";
import { isAllowedOrigin } from "../utils/origin";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SKIPPED_PREFIXES = ["/api/webhooks/stripe", "/api/v1/integration"];

function getRequestOrigin(req: Request): string | null {
  const origin = req.get("origin");
  if (origin) {
    return origin;
  }

  const referer = req.get("referer");
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function isSkippedPath(req: Request): boolean {
  const url = req.originalUrl || req.url || "";
  return SKIPPED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method.toUpperCase()) || isSkippedPath(req)) {
    next();
    return;
  }

  const requestOrigin = getRequestOrigin(req);
  if (
    requestOrigin &&
    !isAllowedOrigin(requestOrigin, {
      allowedOrigins: config.corsOrigins,
      baseDomain: config.baseDomain,
    })
  ) {
    res.status(403).json({ message: "Invalid request origin" });
    return;
  }

  const authCookie = req.cookies?.[JWT.COOKIE_NAME];
  if (!authCookie) {
    next();
    return;
  }

  if (!requestOrigin) {
    res.status(403).json({ message: "Missing request origin" });
    return;
  }

  const csrfCookie = req.cookies?.[JWT.CSRF_COOKIE_NAME];
  const csrfHeader = req.get(JWT.CSRF_HEADER_NAME);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    res.status(403).json({ message: "CSRF validation failed" });
    return;
  }

  next();
}
