// src/lib/redis.ts
// Shared Redis (IORedis) connection used by BullMQ queues and workers.

import IORedis from "ioredis";
import { logger } from "../utils/logger";

/**
 * Lazily-created singleton IORedis connection for BullMQ.
 * Falls back to localhost:6379 when REDIS_URL is not set.
 */
let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!_connection) {
    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    if (!process.env.REDIS_URL) {
      logger.warn("[Redis] REDIS_URL not set — falling back to localhost:6379");
    }
    _connection = new IORedis(url, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });
    _connection.on("error", (err) => {
      logger.error("[Redis] Connection error:", err);
    });
  }
  return _connection;
}

/**
 * Gracefully close the Redis connection (for shutdown).
 */
export async function closeRedisConnection(): Promise<void> {
  if (_connection) {
    await _connection.quit();
    _connection = null;
  }
}
