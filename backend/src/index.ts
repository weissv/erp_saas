// src/index.ts
import app from "./app";
import { config } from "./config";
import { AiService } from "./services/AiService";
import { initTelegramBot } from "./services/TelegramService";

// Интервал синхронизации Google Drive (30 минут)
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Запускает автоматическую синхронизацию с Google Drive
 */
async function startGoogleDriveSync() {
  console.log("🔄 Starting initial Google Drive sync...");
  try {
    const result = await AiService.syncGoogleDriveDocuments();
    console.log(`✅ Initial sync completed: ${result.synced} synced, ${result.updated} updated, ${result.skipped} skipped, ${result.errors} errors`);
  } catch (error) {
    console.error("❌ Initial Google Drive sync failed:", error);
  }

  // Запускаем периодическую синхронизацию
  setInterval(async () => {
    console.log("🔄 Running periodic Google Drive sync...");
    try {
      const result = await AiService.syncGoogleDriveDocuments();
      if (result.synced > 0 || result.updated > 0 || result.errors > 0) {
        console.log(`✅ Periodic sync: ${result.synced} new, ${result.updated} updated, ${result.errors} errors`);
      }
    } catch (error) {
      console.error("❌ Periodic Google Drive sync failed:", error);
    }
  }, SYNC_INTERVAL_MS);
}

app.listen(config.port, () => {
  console.log(`API running on http://0.0.0.0:${config.port}`);
  
  // Инициализируем Telegram бота
  void initTelegramBot();
  
  // Запускаем синхронизацию Google Drive через 5 секунд после старта
  // чтобы дать время для инициализации базы данных
  setTimeout(startGoogleDriveSync, 5000);
});
