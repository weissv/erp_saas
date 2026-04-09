// src/queues/redis.ts
// Shared Redis (IORedis) connection used by BullMQ queues and workers.

import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

/**
 * Lazy-created connection.  BullMQ requires a dedicated connection per
 * Queue / Worker, but the configuration can be shared.
 */
export function createRedisConnection(): IORedis {
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,     // required by BullMQ
    enableReadyCheck: false,
  });
}
