// src/index.ts
import { createServer } from "http";
import app from "./app";
import { config, validateConfig } from "./config";
import { logger } from "./utils/logger";
import { AiService } from "./services/AiService";
import { initTelegramBot } from "./services/TelegramService";
import { setIntervalWithJitter } from "./services/CronJitterService";
import { initSocketIO } from "./lib/socketio";
import { startOneCWorker } from "./modules/onec/queue/onec-sync.worker";
import { startOneCPushWorker } from "./modules/onec/queue/onec-push.worker";

// Validate critical configuration before starting the server
validateConfig();

// Интервал синхронизации Google Drive (30 минут)
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

// Delay before starting Google Drive sync to allow DB initialisation
const BOOT_DELAY_MS = 5_000;

/**
 * Запускает автоматическую синхронизацию с Google Drive
 */
async function startGoogleDriveSync() {
  logger.info("Starting initial Google Drive sync...");
  try {
    const result = await AiService.syncGoogleDriveDocuments();
    logger.info(`Initial sync completed: ${result.synced} synced, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`);
  } catch (error) {
    logger.error("Initial Google Drive sync failed:", error);
  }

  // Запускаем периодическую синхронизацию с jitter
  setIntervalWithJitter(
    SYNC_INTERVAL_MS,
    async () => {
      logger.info("Running periodic Google Drive sync...");
      const result = await AiService.syncGoogleDriveDocuments();
      if (result.synced > 0 || result.updated > 0 || result.errors > 0) {
        logger.info(`Periodic sync: ${result.synced} new, ${result.updated} updated, ${result.errors} errors`);
      }
    },
    { label: "GoogleDriveSync", maxJitterMs: 60_000 },
  );
}

// Create an HTTP server so Socket.IO can share the same port
const httpServer = createServer(app);

// Initialise Socket.IO for real-time events (e.g. 1C sync progress)
initSocketIO(httpServer);

// Start BullMQ worker for background 1C sync (best-effort: if Redis is unavailable the worker silently fails)
try {
  startOneCWorker();
} catch (err) {
  logger.warn("Could not start 1C BullMQ worker (Redis may be unavailable):", (err as Error).message);
}

// Start BullMQ worker for inbound 1C push data
try {
  startOneCPushWorker();
} catch (err) {
  logger.warn("Could not start 1C Push BullMQ worker (Redis may be unavailable):", (err as Error).message);
}

httpServer.listen(config.port, () => {
  logger.info(`API running on http://0.0.0.0:${config.port}`);

  // Инициализируем Telegram бота
  void initTelegramBot();

  // Запускаем синхронизацию Google Drive после задержки,
  // чтобы дать время для инициализации базы данных
  setTimeout(startGoogleDriveSync, BOOT_DELAY_MS);
});
