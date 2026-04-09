// src/lib/redis.ts
// Shared Redis (IORedis) connection used by BullMQ queues and workers.

import IORedis from "ioredis";

/**
 * Lazily-created singleton IORedis connection for BullMQ.
 * Falls back to localhost:6379 when REDIS_URL is not set.
 */
let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!_connection) {
    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    _connection = new IORedis(url, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });
    _connection.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
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
