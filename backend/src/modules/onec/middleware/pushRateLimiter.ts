// src/modules/onec/middleware/pushRateLimiter.ts
// Redis-backed sliding-window rate limiter for the 1C Push API.
//
// Limits: 10 requests per 60 seconds per tenantId (or per IP if
// the tenant has not been resolved yet).
//
// Uses a simple Redis INCR + EXPIRE pattern. Falls back to allowing
// the request if Redis is unavailable (fail-open for availability).

import { Request, Response, NextFunction } from "express";
import { getRedisConnection } from "../../../lib/redis";
import { logger } from "../../../utils/logger";

const MAX_REQUESTS = 10;
const WINDOW_SECONDS = 60;

/**
 * Rate limiter middleware for the 1C Push API.
 * Must be mounted AFTER `requireIntegrationToken` so that
 * `req.tenantId` is available for per-tenant bucketing.
 */
export async function pushRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const bucketKey = req.tenantId
    ? `ratelimit:onec-push:tenant:${req.tenantId}`
    : `ratelimit:onec-push:ip:${req.ip ?? "unknown"}`;

  try {
    const redis = getRedisConnection();
    const current = await redis.incr(bucketKey);

    if (current === 1) {
      // First request in this window — set the TTL
      await redis.expire(bucketKey, WINDOW_SECONDS);
    }

    // Attach rate-limit headers for observability
    const ttl = await redis.ttl(bucketKey);
    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, MAX_REQUESTS - current));
    res.setHeader("X-RateLimit-Reset", Math.ceil(Date.now() / 1000) + Math.max(ttl, 0));

    if (current > MAX_REQUESTS) {
      res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many requests. Limit: ${MAX_REQUESTS} per ${WINDOW_SECONDS}s. Retry after ${Math.max(ttl, 1)}s.`,
          retryAfter: Math.max(ttl, 1),
        },
      });
      return;
    }

    next();
  } catch (error) {
    // Fail-open: if Redis is down, allow the request through
    logger.warn("[pushRateLimiter] Redis error, allowing request:", error);
    next();
  }
}
