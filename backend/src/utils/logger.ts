// src/utils/logger.ts
// Structured logger that outputs JSON in production for log aggregation tools
// and human-readable output in development.

import { config } from "../config";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatArgs(args: unknown[]): Record<string, unknown> {
  if (args.length === 0) return {};
  if (args.length === 1 && typeof args[0] === "object" && args[0] !== null && !(args[0] instanceof Error)) {
    return args[0] as Record<string, unknown>;
  }
  // For Error objects extract useful fields
  const result: Record<string, unknown> = {};
  for (const arg of args) {
    if (arg instanceof Error) {
      result.error = { message: arg.message, stack: arg.stack, name: arg.name };
    } else if (typeof arg === "string") {
      result.detail = result.detail ? `${result.detail} ${arg}` : arg;
    } else {
      result.extra = arg;
    }
  }
  return result;
}

function write(level: LogLevel, message: string, args: unknown[]): void {
  const isProduction = config.nodeEnv === "production";

  if (isProduction) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...formatArgs(args),
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  } else {
    // Development: human-readable console output
    const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    fn(`[${level.toUpperCase()}]`, message, ...args);
  }
}

export const logger = {
  info: (message: string, ...args: unknown[]) => write("info", message, args),
  warn: (message: string, ...args: unknown[]) => write("warn", message, args),
  error: (message: string, ...args: unknown[]) => write("error", message, args),
  debug: (message: string, ...args: unknown[]) => write("debug", message, args),
};
