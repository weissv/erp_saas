// src/modules/onec/middleware/pushRateLimiter.ts
// Redis-backed sliding-window rate limiter for the 1C Push API.
//
// Limits: 10 requests per 60 seconds per tenantId (or per IP if
// the tenant has not been resolved yet).
//
// Uses a simple Redis INCR + EXPIRE pattern. Falls back to an
// in-memory Map if Redis is unavailable.

import { Request, Response, NextFunction } from "express";
import { getRedisConnection } from "../../../lib/redis";
import { logger } from "../../../utils/logger";

const MAX_REQUESTS = 10;
const WINDOW_SECONDS = 60;

// ── In-memory fallback ──────────────────────────────────────────────────
const memoryBuckets = new Map<string, { count: number; expiresAt: number }>();

/** Evict expired entries every 5 minutes to prevent unbounded growth. */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryBuckets) {
    if (entry.expiresAt <= now) {
      memoryBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function memoryIncrement(key: string): { count: number; ttl: number } {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (existing && existing.expiresAt > now) {
    existing.count++;
    return { count: existing.count, ttl: Math.ceil((existing.expiresAt - now) / 1000) };
  }

  const entry = { count: 1, expiresAt: now + WINDOW_SECONDS * 1000 };
  memoryBuckets.set(key, entry);
  return { count: 1, ttl: WINDOW_SECONDS };
}

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

  let current: number;
  let ttl: number;

  try {
    const redis = getRedisConnection();
    current = await redis.incr(bucketKey);

    if (current === 1) {
      await redis.expire(bucketKey, WINDOW_SECONDS);
    }

    ttl = await redis.ttl(bucketKey);
  } catch (error) {
    // Redis unavailable — fall back to in-memory rate limiting
    logger.warn("[pushRateLimiter] Redis unavailable, using in-memory fallback:", error);
    const result = memoryIncrement(bucketKey);
    current = result.count;
    ttl = result.ttl;
  }

  // Attach rate-limit headers for observability
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
}
