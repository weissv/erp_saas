import type { NextFunction, Request, Response } from "express";
import csrf from "csurf";
import { config } from "../config";
import { JWT } from "../constants";
import { isAllowedOrigin } from "../utils/origin";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SKIPPED_PREFIXES = ["/api/webhooks/stripe", "/api/v1/integration"];
const csrfCookieProtection = csrf({
  cookie: {
    key: JWT.CSRF_SECRET_COOKIE_NAME,
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
  },
});

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
  if (isSkippedPath(req)) {
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

  if (!SAFE_METHODS.has(req.method.toUpperCase()) && !requestOrigin) {
    res.status(403).json({ message: "Missing request origin" });
    return;
  }

  csrfCookieProtection(req, res, (error?: unknown) => {
    if (!error) {
      next();
      return;
    }

    const code = (error as { code?: string }).code;
    if (code === "EBADCSRFTOKEN") {
      res.status(403).json({ message: "CSRF validation failed" });
      return;
    }

    next(error as Error);
  });
}
