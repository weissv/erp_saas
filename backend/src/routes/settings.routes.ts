// src/routes/settings.routes.ts
import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { checkRole } from "../middleware/checkRole";
import { SystemSettingsService, SettingCategory, SettingKey } from "../services/SystemSettingsService";

const router = Router();

// Все эндпоинты требуют авторизации
router.use(authMiddleware);

/**
 * GET /api/settings
 * Получить все настройки (опционально по категории)
 * Доступно: DIRECTOR, ADMIN
 */
router.get("/", checkRole(["DIRECTOR", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const category = req.query.category as SettingCategory | undefined;
    const settings = await SystemSettingsService.getAll(category);
    res.json(settings);
  } catch (error) {
    console.error("Error getting settings:", error);
    res.status(500).json({ message: "Ошибка при получении настроек" });
  }
});

/**
 * GET /api/settings/:key
 * Получить конкретную настройку по ключу
 * Доступно: DIRECTOR, ADMIN
 */
router.get("/:key", checkRole(["DIRECTOR", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const value = await SystemSettingsService.get(key);
    res.json({ key, value });
  } catch (error) {
    console.error("Error getting setting:", error);
    res.status(404).json({ message: "Настройка не найдена" });
  }
});

/**
 * PUT /api/settings/:key
 * Обновить настройку
 * Доступно: DIRECTOR, ADMIN
 */
router.put("/:key", checkRole(["DIRECTOR", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description, category, isSecret } = req.body;

    if (value === undefined) {
      return res.status(400).json({ message: "Значение обязательно" });
    }

    const setting = await SystemSettingsService.set(
      key,
      value,
      category || SettingCategory.GENERAL,
      description,
      isSecret || false,
      req.user?.id
    );

    res.json({
      ...setting,
      value: setting.isSecret ? "********" : setting.value,
    });
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({ message: "Ошибка при обновлении настройки" });
  }
});

/**
 * DELETE /api/settings/:key
 * Удалить настройку
 * Доступно: DIRECTOR
 */
router.delete("/:key", checkRole(["DIRECTOR"]), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    // Не позволяем удалять критически важные настройки
    const protectedKeys = [SettingKey.AI_SYSTEM_PROMPT, SettingKey.MAINTENANCE_MODE];
    if (protectedKeys.includes(key as SettingKey)) {
      return res.status(403).json({ 
        message: "Нельзя удалить эту настройку. Используйте сброс к значению по умолчанию." 
      });
    }

    const success = await SystemSettingsService.remove(key);
    if (success) {
      res.json({ message: "Настройка удалена" });
    } else {
      res.status(404).json({ message: "Настройка не найдена" });
    }
  } catch (error) {
    console.error("Error deleting setting:", error);
    res.status(500).json({ message: "Ошибка при удалении настройки" });
  }
});

/**
 * POST /api/settings/:key/reset
 * Сбросить настройку к значению по умолчанию
 * Доступно: DIRECTOR, ADMIN
 */
router.post("/:key/reset", checkRole(["DIRECTOR", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const defaultValue = await SystemSettingsService.reset(key, req.user?.id);
    
    if (defaultValue === null) {
      return res.status(404).json({ message: "Нет значения по умолчанию для этой настройки" });
    }

    res.json({ key, value: defaultValue, message: "Настройка сброшена к значению по умолчанию" });
  } catch (error) {
    console.error("Error resetting setting:", error);
    res.status(500).json({ message: "Ошибка при сбросе настройки" });
  }
});

/**
 * POST /api/settings/category/:category/reset
 * Сбросить все настройки категории к значениям по умолчанию
 * Доступно: DIRECTOR
 */
router.post("/category/:category/reset", checkRole(["DIRECTOR"]), async (req: Request, res: Response) => {
  try {
    const category = req.params.category as SettingCategory;
    
    if (!Object.values(SettingCategory).includes(category)) {
      return res.status(400).json({ message: "Неверная категория" });
    }

    const count = await SystemSettingsService.resetCategory(category, req.user?.id);
    res.json({ message: `Сброшено ${count} настроек категории ${category}` });
  } catch (error) {
    console.error("Error resetting category:", error);
    res.status(500).json({ message: "Ошибка при сбросе категории настроек" });
  }
});

// === AI-специфичные эндпоинты ===

/**
 * GET /api/settings/ai/prompt
 * Получить текущий системный промт AI
 * Доступно: DIRECTOR, ADMIN, DEPUTY
 */
router.get("/ai/prompt", checkRole(["DIRECTOR", "ADMIN", "DEPUTY"]), async (_req: Request, res: Response) => {
  try {
    const prompt = await SystemSettingsService.getAiSystemPrompt();
    res.json({ prompt });
  } catch (error) {
    console.error("Error getting AI prompt:", error);
    res.status(500).json({ message: "Ошибка при получении промта" });
  }
});

/**
 * PUT /api/settings/ai/prompt
 * Обновить системный промт AI
 * Доступно: DIRECTOR, ADMIN
 */
router.put("/ai/prompt", checkRole(["DIRECTOR", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ message: "Промт обязателен" });
    }

    if (prompt.length < 50) {
      return res.status(400).json({ message: "Промт слишком короткий (минимум 50 символов)" });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({ message: "Промт слишком длинный (максимум 10000 символов)" });
    }

    await SystemSettingsService.setAiSystemPrompt(prompt, req.user?.id);
    res.json({ message: "Системный промт обновлён", prompt });
  } catch (error) {
    console.error("Error updating AI prompt:", error);
    res.status(500).json({ message: "Ошибка при обновлении промта" });
  }
});

/**
 * POST /api/settings/ai/prompt/reset
 * Сбросить системный промт AI к значению по умолчанию
 * Доступно: DIRECTOR, ADMIN
 */
router.post("/ai/prompt/reset", checkRole(["DIRECTOR", "ADMIN"]), async (req: Request, res: Response) => {
  try {
    const defaultPrompt = await SystemSettingsService.resetAiSystemPrompt(req.user?.id);
    res.json({ message: "Системный промт сброшен к значению по умолчанию", prompt: defaultPrompt });
  } catch (error) {
    console.error("Error resetting AI prompt:", error);
    res.status(500).json({ message: "Ошибка при сбросе промта" });
  }
});

// === Maintenance mode ===

/**
 * GET /api/settings/maintenance/status
 * Получить статус режима обслуживания (публичный эндпоинт)
 */
router.get("/maintenance/status", async (_req: Request, res: Response) => {
  try {
    const isEnabled = await SystemSettingsService.isMaintenanceMode();
    const message = isEnabled ? await SystemSettingsService.getMaintenanceMessage() : null;
    res.json({ enabled: isEnabled, message });
  } catch (error) {
    console.error("Error getting maintenance status:", error);
    res.status(500).json({ message: "Ошибка при получении статуса обслуживания" });
  }
});

/**
 * PUT /api/settings/maintenance
 * Включить/выключить режим обслуживания
 * Доступно: DIRECTOR
 */
router.put("/maintenance", checkRole(["DIRECTOR"]), async (req: Request, res: Response) => {
  try {
    const { enabled, message } = req.body;
    
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "Поле 'enabled' обязательно (true/false)" });
    }

    await SystemSettingsService.setMaintenanceMode(enabled, message, req.user?.id);
    res.json({ 
      message: enabled ? "Режим обслуживания включён" : "Режим обслуживания выключен",
      enabled 
    });
  } catch (error) {
    console.error("Error setting maintenance mode:", error);
    res.status(500).json({ message: "Ошибка при изменении режима обслуживания" });
  }
});

/**
 * POST /api/settings/cache/clear
 * Очистить кэш настроек (принудительная перезагрузка из БД)
 * Доступно: DIRECTOR
 */
router.post("/cache/clear", checkRole(["DIRECTOR"]), async (_req: Request, res: Response) => {
  try {
    SystemSettingsService.clearCache();
    res.json({ message: "Кэш настроек очищен" });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({ message: "Ошибка при очистке кэша" });
  }
});

export default router;
