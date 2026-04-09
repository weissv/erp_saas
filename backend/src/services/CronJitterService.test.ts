// src/services/CronJitterService.test.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to mock node-cron before importing the module under test
vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn((_expr: string, cb: () => void) => {
      // Immediately invoke the callback so we can test the jitter logic
      cb();
      return { stop: vi.fn() };
    }),
  },
}));

import {
  scheduleWithJitter,
  setIntervalWithJitter,
} from "./CronJitterService";

// Silence logger output during tests
vi.mock("../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CronJitterService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe("scheduleWithJitter", () => {
    it("should call node-cron.schedule with the given expression", async () => {
      const cron = await import("node-cron");
      const task = vi.fn().mockResolvedValue(undefined);

      scheduleWithJitter("0 0 * * *", task, {
        label: "TestJob",
        maxJitterMs: 100,
      });

      expect(cron.default.schedule).toHaveBeenCalledWith(
        "0 0 * * *",
        expect.any(Function),
      );
    });

    it("should execute the task after a jitter delay", async () => {
      const task = vi.fn().mockResolvedValue(undefined);

      scheduleWithJitter("* * * * *", task, {
        label: "TestJob",
        maxJitterMs: 500,
      });

      // The cron callback fired, but the task is behind a setTimeout jitter
      expect(task).not.toHaveBeenCalled();

      // Fast-forward past the max jitter
      await vi.advanceTimersByTimeAsync(600);

      expect(task).toHaveBeenCalledTimes(1);
    });

    it("should log errors without re-throwing when task fails", async () => {
      const task = vi.fn().mockRejectedValue(new Error("boom"));
      const { logger } = await import("../utils/logger");

      scheduleWithJitter("* * * * *", task, {
        label: "FailJob",
        maxJitterMs: 0,
      });

      await vi.advanceTimersByTimeAsync(10);

      expect(logger.error).toHaveBeenCalled();
    });

    it("should apply zero jitter when maxJitterMs is 0", async () => {
      const task = vi.fn().mockResolvedValue(undefined);

      scheduleWithJitter("* * * * *", task, {
        label: "ZeroJitter",
        maxJitterMs: 0,
      });

      // Even 0ms jitter goes through setTimeout(0)
      await vi.advanceTimersByTimeAsync(1);

      expect(task).toHaveBeenCalledTimes(1);
    });
  });

  describe("setIntervalWithJitter", () => {
    it("should return an interval handle", () => {
      const task = vi.fn().mockResolvedValue(undefined);
      const handle = setIntervalWithJitter(1000, task, {
        label: "Interval",
        maxJitterMs: 100,
      });

      expect(handle).toBeDefined();
      clearInterval(handle);
    });

    it("should execute the task on each tick with jitter", async () => {
      const task = vi.fn().mockResolvedValue(undefined);

      const handle = setIntervalWithJitter(1000, task, {
        label: "Interval",
        maxJitterMs: 50,
      });

      // First tick after 1000ms + up to 50ms jitter
      await vi.advanceTimersByTimeAsync(1100);
      expect(task).toHaveBeenCalledTimes(1);

      // Second tick
      await vi.advanceTimersByTimeAsync(1100);
      expect(task).toHaveBeenCalledTimes(2);

      clearInterval(handle);
    });
  });
});
