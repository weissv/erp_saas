// src/services/CronJitterService.ts
// Distributed cron execution with jitter to prevent thundering-herd when
// hundreds of tenants share the same process.

import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../utils/logger";

export interface JitterOptions {
  /** Maximum random delay in milliseconds added before each execution. */
  maxJitterMs: number;
  /** Human-readable label used in log messages. */
  label: string;
}

const DEFAULT_MAX_JITTER_MS = 60_000; // 1 minute

/**
 * Returns a cryptographically-unnecessary but uniform random integer in [0, max).
 */
function randomDelay(maxMs: number): number {
  return Math.floor(Math.random() * Math.max(0, maxMs));
}

/**
 * Wraps a cron-scheduled callback so that each invocation is preceded by a
 * random delay of up to `maxJitterMs` milliseconds. This prevents a
 * "thundering herd" effect when many tenants (or replicas) share the same
 * cron schedule.
 *
 * @param schedule  - A valid node-cron expression (e.g. "0 0 * * *").
 * @param task      - The async function to execute.
 * @param options   - Optional configuration.
 * @returns The underlying node-cron `ScheduledTask`, so callers can `.stop()` it.
 */
export function scheduleWithJitter(
  schedule: string,
  task: () => Promise<void>,
  options?: Partial<JitterOptions>,
): ScheduledTask {
  const maxJitterMs = options?.maxJitterMs ?? DEFAULT_MAX_JITTER_MS;
  const label = options?.label ?? "CronJob";

  return cron.schedule(schedule, async () => {
    const delay = randomDelay(maxJitterMs);
    logger.info(
      `[${label}] Cron fired – applying ${delay}ms jitter before execution`,
    );

    await new Promise<void>((resolve) => setTimeout(resolve, delay));

    logger.info(`[${label}] Jitter elapsed – starting task`);
    try {
      await task();
      logger.info(`[${label}] Task completed successfully`);
    } catch (error) {
      logger.error(
        `[${label}] Task failed:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  });
}

/**
 * Convenience: wraps a `setInterval`-style repeating task with per-tick jitter.
 *
 * @param intervalMs - Base interval in milliseconds between executions.
 * @param task       - The async function to execute.
 * @param options    - Optional configuration.
 * @returns A handle that can be used with `clearInterval`.
 */
export function setIntervalWithJitter(
  intervalMs: number,
  task: () => Promise<void>,
  options?: Partial<JitterOptions>,
): ReturnType<typeof setInterval> {
  const maxJitterMs = options?.maxJitterMs ?? DEFAULT_MAX_JITTER_MS;
  const label = options?.label ?? "IntervalJob";

  return setInterval(async () => {
    const delay = randomDelay(maxJitterMs);
    logger.info(
      `[${label}] Interval tick – applying ${delay}ms jitter`,
    );

    await new Promise<void>((resolve) => setTimeout(resolve, delay));

    logger.info(`[${label}] Jitter elapsed – starting task`);
    try {
      await task();
      logger.info(`[${label}] Task completed successfully`);
    } catch (error) {
      logger.error(
        `[${label}] Task failed:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }, intervalMs);
}
