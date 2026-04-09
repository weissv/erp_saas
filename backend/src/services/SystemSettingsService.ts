// src/services/SystemSettingsService.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Категории настроек
export enum SettingCategory {
  AI = "ai",
  SECURITY = "security",
  MAINTENANCE = "maintenance",
  GENERAL = "general",
}

// Известные ключи настроек
export enum SettingKey {
  AI_SYSTEM_PROMPT = "ai_system_prompt",
  MAINTENANCE_MODE = "maintenance_mode",
  MAINTENANCE_MESSAGE = "maintenance_message",
  AI_MODEL = "ai_model",
  AI_TEMPERATURE = "ai_temperature",
  SESSION_TIMEOUT = "session_timeout",
}

// Дефолтные значения
const DEFAULT_VALUES: Record<string, string> = {
  [SettingKey.AI_SYSTEM_PROMPT]: `# Роль
Ты - ассистент школьного учителя, задача которого улучшить свою учебную программу по принципу метапредметности. Ты работаешь на инновационную школу, которая разрабатывает различные подходы, в том числе системно интегрирует темы из разных учебных программ.
Твоя задача: при разработке учебной программы или темы занятий для заданного предмета связывать разрабатываемый тобой контент с темами других предметов из базы знаний школы. Так ученики смогут закрепить пройденные знания по другим предметам или подготовиться к получению новых знаний из смежных дисциплин.

# КРИТИЧЕСКИ ВАЖНО - Работа только с базой знаний
- Ты ОБЯЗАН использовать ТОЛЬКО информацию из предоставленного КОНТЕКСТА (база знаний школы)
- НИКОГДА не придумывай информацию, которой нет в контексте
- Если в контексте нет нужной информации, ЧЕСТНО скажи: "В базе знаний школы нет информации по этому вопросу"
- НЕ делай предположений о содержании учебных программ, если их нет в контексте
- Все метапредметные связи должны основываться ТОЛЬКО на реальных документах из базы знаний

# Инструкция
- Отвечай на русском языке
- Если ты разрабатываешь учебную программу для определенного предмета, то связывай ее наполнение только с темами предметов из базы знаний школы. Покажи эти связи пользователю
- Если ты разрабатываешь темы уроков и занятий и их наполнение, то связывай их только с темами предметов из базы знаний школы. Покажи эти связи пользователю
- Если ты разрабатываешь учебную программу или план занятий для нового предмета, то связывай их наполнение только с темами предметов из базы знаний школы. Покажи эти связи пользователю
- На пользовательское сообщение "/start" в ответ поприветствуй его и дай краткое описание своей миссии
- В ответе обязательно укажи блок метапредметных связей: каким образом предлагаемые тобой темы связаны с темами других дисциплин из базы знаний
- Если контекст пуст или не содержит релевантной информации, сообщи об этом пользователю и предложи добавить нужные документы в базу знаний`,
  [SettingKey.MAINTENANCE_MODE]: "false",
  [SettingKey.MAINTENANCE_MESSAGE]: "Система временно недоступна для технического обслуживания. Пожалуйста, попробуйте позже.",
  [SettingKey.AI_MODEL]: "qwen/qwen3-32b",
  [SettingKey.AI_TEMPERATURE]: "0.7",
  [SettingKey.SESSION_TIMEOUT]: "86400",
};

// Кэш настроек в памяти для быстрого доступа
const settingsCache: Map<string, { value: string; updatedAt: Date }> = new Map();
const CACHE_TTL = 60 * 1000; // 1 минута

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  category: string;
  isSecret: boolean;
  updatedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Получает значение настройки по ключу
 * Использует кэш для оптимизации
 */
async function get(key: string): Promise<string> {
  // Проверяем кэш
  const cached = settingsCache.get(key);
  if (cached && Date.now() - cached.updatedAt.getTime() < CACHE_TTL) {
    return cached.value;
  }

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (setting) {
      // Обновляем кэш
      settingsCache.set(key, { value: setting.value, updatedAt: new Date() });
      return setting.value;
    }

    // Возвращаем дефолтное значение, если настройка не найдена
    const defaultValue = DEFAULT_VALUES[key];
    if (defaultValue !== undefined) {
      // Создаём настройку с дефолтным значением
      await set(key, defaultValue, getCategoryForKey(key));
      return defaultValue;
    }

    throw new Error(`Setting ${key} not found and no default value`);
  } catch (error) {
    // Если таблица не существует (миграция ещё не применена), возвращаем дефолт
    if (error instanceof Error && error.message.includes("does not exist")) {
      const defaultValue = DEFAULT_VALUES[key];
      if (defaultValue !== undefined) {
        return defaultValue;
      }
    }
    console.error(`Error getting setting ${key}:`, error);
    
    // Fallback к дефолтному значению
    return DEFAULT_VALUES[key] || "";
  }
}

/**
 * Определяет категорию для ключа настройки
 */
function getCategoryForKey(key: string): SettingCategory {
  if (key.startsWith("ai_")) return SettingCategory.AI;
  if (key.startsWith("maintenance_")) return SettingCategory.MAINTENANCE;
  if (key.startsWith("security_") || key.startsWith("session_")) return SettingCategory.SECURITY;
  return SettingCategory.GENERAL;
}

/**
 * Устанавливает значение настройки
 */
async function set(
  key: string,
  value: string,
  category: SettingCategory = SettingCategory.GENERAL,
  description?: string,
  isSecret: boolean = false,
  updatedBy?: number
): Promise<SystemSetting> {
  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value,
        description: description !== undefined ? description : undefined,
        category,
        isSecret,
        updatedBy,
        updatedAt: new Date(),
      },
      create: {
        key,
        value,
        description,
        category,
        isSecret,
        updatedBy,
      },
    });

    // Обновляем кэш
    settingsCache.set(key, { value: setting.value, updatedAt: new Date() });

    return setting;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    throw new Error(`Failed to set setting ${key}`);
  }
}

/**
 * Получает все настройки (опционально по категории)
 */
async function getAll(category?: SettingCategory): Promise<SystemSetting[]> {
  try {
    const where = category ? { category } : {};
    const settings = await prisma.systemSetting.findMany({
      where,
      orderBy: { key: "asc" },
    });

    // Маскируем секретные значения
    return settings.map((s) => ({
      ...s,
      value: s.isSecret ? "********" : s.value,
    }));
  } catch (error) {
    console.error("Error getting all settings:", error);
    return [];
  }
}

/**
 * Получает все настройки по категории (включая секретные - для внутреннего использования)
 */
async function getAllByCategory(category: SettingCategory): Promise<SystemSetting[]> {
  try {
    return await prisma.systemSetting.findMany({
      where: { category },
      orderBy: { key: "asc" },
    });
  } catch (error) {
    console.error(`Error getting settings for category ${category}:`, error);
    return [];
  }
}

/**
 * Удаляет настройку по ключу
 */
async function remove(key: string): Promise<boolean> {
  try {
    await prisma.systemSetting.delete({
      where: { key },
    });
    settingsCache.delete(key);
    return true;
  } catch (error) {
    console.error(`Error deleting setting ${key}:`, error);
    return false;
  }
}

/**
 * Сбрасывает настройку к дефолтному значению
 */
async function reset(key: string, updatedBy?: number): Promise<string | null> {
  const defaultValue = DEFAULT_VALUES[key];
  if (defaultValue === undefined) {
    return null;
  }

  await set(key, defaultValue, getCategoryForKey(key), undefined, false, updatedBy);
  return defaultValue;
}

/**
 * Сбрасывает все настройки категории к дефолтным значениям
 */
async function resetCategory(category: SettingCategory, updatedBy?: number): Promise<number> {
  let count = 0;
  for (const [key, value] of Object.entries(DEFAULT_VALUES)) {
    if (getCategoryForKey(key) === category) {
      await set(key, value, category, undefined, false, updatedBy);
      count++;
    }
  }
  return count;
}

/**
 * Очищает кэш настроек
 */
function clearCache(): void {
  settingsCache.clear();
}

/**
 * Проверяет, включён ли режим обслуживания
 */
async function isMaintenanceMode(): Promise<boolean> {
  const value = await get(SettingKey.MAINTENANCE_MODE);
  return value === "true";
}

/**
 * Получает сообщение режима обслуживания
 */
async function getMaintenanceMessage(): Promise<string> {
  return await get(SettingKey.MAINTENANCE_MESSAGE);
}

/**
 * Устанавливает режим обслуживания
 */
async function setMaintenanceMode(enabled: boolean, message?: string, updatedBy?: number): Promise<void> {
  await set(SettingKey.MAINTENANCE_MODE, String(enabled), SettingCategory.MAINTENANCE, undefined, false, updatedBy);
  if (message) {
    await set(SettingKey.MAINTENANCE_MESSAGE, message, SettingCategory.MAINTENANCE, undefined, false, updatedBy);
  }
}

// === AI-специфичные функции ===

/**
 * Получает системный промт для AI
 */
async function getAiSystemPrompt(): Promise<string> {
  return await get(SettingKey.AI_SYSTEM_PROMPT);
}

/**
 * Устанавливает системный промт для AI
 */
async function setAiSystemPrompt(prompt: string, updatedBy?: number): Promise<void> {
  await set(
    SettingKey.AI_SYSTEM_PROMPT,
    prompt,
    SettingCategory.AI,
    "Системный промт для AI-ассистента метапредметности",
    false,
    updatedBy
  );
}

/**
 * Сбрасывает системный промт к дефолтному
 */
async function resetAiSystemPrompt(updatedBy?: number): Promise<string> {
  const defaultPrompt = DEFAULT_VALUES[SettingKey.AI_SYSTEM_PROMPT];
  await setAiSystemPrompt(defaultPrompt, updatedBy);
  return defaultPrompt;
}

export const SystemSettingsService = {
  get,
  set,
  getAll,
  getAllByCategory,
  remove,
  reset,
  resetCategory,
  clearCache,
  isMaintenanceMode,
  getMaintenanceMessage,
  setMaintenanceMode,
  getAiSystemPrompt,
  setAiSystemPrompt,
  resetAiSystemPrompt,
  SettingKey,
  SettingCategory,
  DEFAULT_VALUES,
};
