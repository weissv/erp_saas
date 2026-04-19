import jwt from "jsonwebtoken";
import type { PrismaClient, Role } from "@prisma/client";
import { Telegraf, type Context } from "telegraf";
import { config } from "../config";
import { getMasterPrisma } from "../lib/masterPrisma";
import { getRequestPrisma, getRequestTenantId } from "../lib/requestContext";
import { getTenantPrisma } from "../lib/tenantPrisma";
import { rootPrisma } from "../prisma";
import { logger } from "../utils/logger";
import { DEFAULT_TENANT_ID, getTenantIntegrations } from "./TenantIntegrationsService";

interface TelegramLinkPayload {
  type: "telegram-connect";
  tenantId: string;
  userId: number;
}

interface TelegramBotRuntime {
  bot: Telegraf;
  tenantId: string;
  tenantName: string;
  username: string | null;
}

interface TenantContext {
  prisma: PrismaClient;
  tenantName: string;
}

const bots = new Map<string, TelegramBotRuntime>();
let shutdownHooksRegistered = false;

function looksLikeTelegramToken(token: string): boolean {
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(token);
}

function isTelegramUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const response = (error as { response?: { error_code?: number } }).response;
  return response?.error_code === 401;
}

function resolveTenantId(tenantId?: string): string {
  return tenantId ?? getRequestTenantId() ?? DEFAULT_TENANT_ID;
}

async function getTenantContext(tenantId: string): Promise<TenantContext> {
  const requestPrisma = getRequestPrisma();
  const requestTenantId = getRequestTenantId();

  if (requestPrisma && requestTenantId === tenantId) {
    return {
      prisma: requestPrisma,
      tenantName: "Mirai",
    };
  }

  if (tenantId === DEFAULT_TENANT_ID) {
    return {
      prisma: rootPrisma,
      tenantName: "Mirai",
    };
  }

  const master = getMasterPrisma();
  const tenant = await master.tenant.findUnique({
    where: { id: tenantId },
    select: {
      dbUrl: true,
      name: true,
      subdomain: true,
    },
  });

  if (!tenant?.dbUrl) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  return {
    prisma: getTenantPrisma(tenantId, tenant.dbUrl),
    tenantName: tenant.name?.trim() || tenant.subdomain || "Mirai",
  };
}

function getTelegramLinkSecret(): string | null {
  if (!config.jwtSecret) {
    logger.warn("JWT_SECRET is not configured. Secure Telegram deep links are disabled.");
    return null;
  }

  return config.jwtSecret;
}

function signTelegramLink(userId: number, tenantId: string): string {
  const secret = getTelegramLinkSecret();
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      type: "telegram-connect",
      tenantId,
      userId,
    } satisfies TelegramLinkPayload,
    secret,
    { expiresIn: "7d" }
  );
}

function verifyTelegramLink(token: string): TelegramLinkPayload | null {
  try {
    const secret = getTelegramLinkSecret();
    if (!secret) {
      return null;
    }

    const payload = jwt.verify(token, secret) as Partial<TelegramLinkPayload>;

    if (
      payload.type !== "telegram-connect" ||
      typeof payload.tenantId !== "string" ||
      typeof payload.userId !== "number"
    ) {
      return null;
    }

    return payload as TelegramLinkPayload;
  } catch {
    return null;
  }
}

function getStartPayload(ctx: Context): string | null {
  const message = ctx.message;
  if (!message || !("text" in message)) {
    return null;
  }

  const parts = message.text.trim().split(/\s+/);
  return parts.length > 1 ? parts[1] : null;
}

function buildHelpMessage(tenantName: string): string {
  return [
    `🤖 <b>${tenantName}</b> — Telegram-бот уведомлений`,
    "",
    "Доступные команды:",
    "• <b>/start</b> — подключить Telegram по ссылке из системы",
    "• <b>/status</b> — проверить текущую привязку",
    "• <b>/unlink</b> — отвязать Telegram от аккаунта",
    "• <b>/help</b> — показать справку",
  ].join("\n");
}

function registerShutdownHooks(): void {
  if (shutdownHooksRegistered) {
    return;
  }

  const stopAllBots = (signal: "SIGINT" | "SIGTERM") => {
    for (const runtime of bots.values()) {
      runtime.bot.stop(signal);
    }
  };

  process.once("SIGINT", () => stopAllBots("SIGINT"));
  process.once("SIGTERM", () => stopAllBots("SIGTERM"));
  shutdownHooksRegistered = true;
}

async function ensureTelegramBot(tenantId: string): Promise<TelegramBotRuntime | null> {
  const existing = bots.get(tenantId);
  if (existing) {
    return existing;
  }

  const creds = await getTenantIntegrations(tenantId);
  const token = creds.telegramBotToken?.trim();

  if (!token) {
    logger.warn(`[${tenantId}] TELEGRAM_BOT_TOKEN не установлен. Telegram уведомления отключены.`);
    return null;
  }

  if (!looksLikeTelegramToken(token)) {
    logger.warn(`[${tenantId}] TELEGRAM_BOT_TOKEN имеет некорректный формат. Telegram уведомления отключены.`);
    return null;
  }

  try {
    const tenantContext = await getTenantContext(tenantId);
    const telegramBot = new Telegraf(token);

    telegramBot.start(async (ctx: Context) => {
      const chatId = ctx.chat?.id?.toString();
      if (!chatId) {
        await ctx.reply("❌ Не удалось определить Chat ID. Попробуйте ещё раз.");
        return;
      }

      const payloadToken = getStartPayload(ctx);
      if (!payloadToken) {
        await ctx.reply(buildHelpMessage(tenantContext.tenantName), { parse_mode: "HTML" });
        return;
      }

      const payload = verifyTelegramLink(payloadToken);
      if (!payload || payload.tenantId !== tenantId) {
        await ctx.reply(
          "❌ Ссылка для подключения недействительна или устарела. Сгенерируйте новую ссылку в системе."
        );
        return;
      }

      try {
        const existingUser = await tenantContext.prisma.user.findUnique({
          where: { telegramChatId: chatId },
          select: { id: true },
        });

        if (existingUser && existingUser.id !== payload.userId) {
          await ctx.reply(
            "⚠️ Этот Telegram уже привязан к другому аккаунту. Сначала выполните /unlink в текущем аккаунте."
          );
          return;
        }

        const user = await tenantContext.prisma.user.findFirst({
          where: {
            id: payload.userId,
            deletedAt: null,
          },
          include: { employee: true },
        });

        if (!user) {
          await ctx.reply("❌ Учётная запись не найдена или уже деактивирована.");
          return;
        }

        await tenantContext.prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: chatId },
        });

        const userName = user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : user.email;

        await ctx.reply(
          [
            "✅ <b>Telegram подключён</b>",
            "",
            `<b>Школа:</b> ${tenantContext.tenantName}`,
            `<b>Пользователь:</b> ${userName}`,
            `<b>Email:</b> ${user.email}`,
            "",
            "Теперь вы будете получать системные уведомления в этот чат.",
          ].join("\n"),
          { parse_mode: "HTML" }
        );

        logger.info(`[${tenantId}] Telegram привязан: user=${user.id}, chat=${chatId}`);
      } catch (error) {
        logger.error(`[${tenantId}] Ошибка привязки Telegram:`, error);
        await ctx.reply("❌ Не удалось завершить привязку. Попробуйте ещё раз немного позже.");
      }
    });

    telegramBot.command("unlink", async (ctx: Context) => {
      const chatId = ctx.chat?.id?.toString();
      if (!chatId) {
        return;
      }

      try {
        const user = await tenantContext.prisma.user.findUnique({
          where: { telegramChatId: chatId },
          select: { id: true },
        });

        if (!user) {
          await ctx.reply("ℹ️ Этот Telegram ещё не привязан ни к одной учётной записи.");
          return;
        }

        await tenantContext.prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: null },
        });

        await ctx.reply("✅ Telegram успешно отвязан от аккаунта.");
        logger.info(`[${tenantId}] Telegram отвязан: user=${user.id}`);
      } catch (error) {
        logger.error(`[${tenantId}] Ошибка отвязки Telegram:`, error);
        await ctx.reply("❌ Не удалось отвязать Telegram. Попробуйте позже.");
      }
    });

    telegramBot.command("status", async (ctx: Context) => {
      const chatId = ctx.chat?.id?.toString();
      if (!chatId) {
        return;
      }

      try {
        const user = await tenantContext.prisma.user.findUnique({
          where: { telegramChatId: chatId },
          include: { employee: true },
        });

        if (!user) {
          await ctx.reply(
            `ℹ️ Telegram ещё не подключён.\n\nОткройте ссылку подключения в системе ${tenantContext.tenantName}.`
          );
          return;
        }

        const userName = user.employee
          ? `${user.employee.firstName} ${user.employee.lastName}`
          : user.email;

        await ctx.reply(
          [
            "📊 <b>Статус подключения</b>",
            "",
            `<b>Школа:</b> ${tenantContext.tenantName}`,
            `<b>Пользователь:</b> ${userName}`,
            `<b>Email:</b> ${user.email}`,
            `<b>Роль:</b> ${user.role}`,
          ].join("\n"),
          { parse_mode: "HTML" }
        );
      } catch (error) {
        logger.error(`[${tenantId}] Ошибка проверки статуса Telegram:`, error);
        await ctx.reply("❌ Не удалось получить статус подключения.");
      }
    });

    telegramBot.help(async (ctx: Context) => {
      await ctx.reply(buildHelpMessage(tenantContext.tenantName), { parse_mode: "HTML" });
    });

    const me = await telegramBot.telegram.getMe();
    await telegramBot.launch();

    const runtime: TelegramBotRuntime = {
      bot: telegramBot,
      tenantId,
      tenantName: tenantContext.tenantName,
      username: me.username ?? null,
    };

    bots.set(tenantId, runtime);
    registerShutdownHooks();

    logger.info(
      `[${tenantId}] Telegram бот успешно запущен${me.username ? ` как @${me.username}` : ""}`
    );

    return runtime;
  } catch (error) {
    bots.delete(tenantId);

    if (isTelegramUnauthorizedError(error)) {
      logger.warn(`[${tenantId}] TELEGRAM_BOT_TOKEN недействителен. Telegram уведомления отключены.`);
      return null;
    }

    logger.error(
      `[${tenantId}] Ошибка инициализации Telegram бота:`,
      error instanceof Error ? error : String(error),
    );
    return null;
  }
}

export async function initTelegramBot(tenantId: string = DEFAULT_TENANT_ID): Promise<void> {
  await ensureTelegramBot(resolveTenantId(tenantId));
}

export async function initTelegramBots(): Promise<void> {
  try {
    const master = getMasterPrisma();
    const tenants = await master.tenant.findMany({
      select: { id: true },
    });

    await Promise.allSettled(tenants.map(({ id }) => ensureTelegramBot(id)));
  } catch (error) {
    logger.warn("Не удалось инициализировать Telegram-ботов из master DB, пробуем legacy режим.");
    await ensureTelegramBot(DEFAULT_TENANT_ID);
  }
}

export async function notifyRole(
  role: Role,
  message: string,
  tenantId: string = DEFAULT_TENANT_ID
): Promise<void> {
  const resolvedTenantId = resolveTenantId(tenantId);
  const runtime = await ensureTelegramBot(resolvedTenantId);
  if (!runtime) {
    logger.warn(`[${resolvedTenantId}] Telegram бот не инициализирован. Уведомление не отправлено.`);
    return;
  }

  try {
    const tenantContext = await getTenantContext(resolvedTenantId);
    const users = await tenantContext.prisma.user.findMany({
      where: {
        role,
        telegramChatId: { not: null },
      },
      select: {
        id: true,
        telegramChatId: true,
      },
    });

    if (users.length === 0) {
      logger.info(`Нет пользователей с ролью ${role} для уведомления`);
      return;
    }

    const results = await Promise.allSettled(
      users.map(async (user) => {
        if (!user.telegramChatId) {
          return;
        }

        await runtime.bot.telegram.sendMessage(user.telegramChatId, message, {
          parse_mode: "HTML",
        });
      })
    );

    const successful = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.filter((result) => result.status === "rejected").length;
    logger.info(`Уведомление для роли ${role}: отправлено ${successful}, ошибок ${failed}`);
  } catch (error) {
    logger.error(`Ошибка отправки уведомления для роли ${role}:`, error);
  }
}

export async function sendTelegramMessage(
  userId: number,
  message: string,
  tenantId: string = DEFAULT_TENANT_ID
): Promise<boolean> {
  const resolvedTenantId = resolveTenantId(tenantId);
  const runtime = await ensureTelegramBot(resolvedTenantId);
  if (!runtime) {
    logger.warn(`[${resolvedTenantId}] Telegram бот не инициализирован. Сообщение не отправлено.`);
    return false;
  }

  try {
    const tenantContext = await getTenantContext(resolvedTenantId);
    const user = await tenantContext.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    if (!user?.telegramChatId) {
      logger.info(`У пользователя ${userId} не привязан Telegram`);
      return false;
    }

    await runtime.bot.telegram.sendMessage(user.telegramChatId, message, {
      parse_mode: "HTML",
    });

    logger.info(`Сообщение отправлено пользователю ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Ошибка отправки сообщения пользователю ${userId}:`, error);
    return false;
  }
}

export async function sendMessageToChatId(
  chatId: string,
  message: string,
  tenantId: string = DEFAULT_TENANT_ID
): Promise<boolean> {
  const resolvedTenantId = resolveTenantId(tenantId);
  const runtime = await ensureTelegramBot(resolvedTenantId);
  if (!runtime) {
    logger.warn(`[${resolvedTenantId}] Telegram бот не инициализирован. Сообщение не отправлено.`);
    return false;
  }

  try {
    await runtime.bot.telegram.sendMessage(chatId, message, {
      parse_mode: "HTML",
    });
    return true;
  } catch (error) {
    logger.error(`Ошибка отправки в чат ${chatId}:`, error);
    return false;
  }
}

export function getTelegramBot(tenantId: string = DEFAULT_TENANT_ID): Telegraf | null {
  return bots.get(resolveTenantId(tenantId))?.bot ?? null;
}

export async function getTelegramConnectionLink(
  userId: number,
  tenantId: string = DEFAULT_TENANT_ID
): Promise<string | null> {
  const resolvedTenantId = resolveTenantId(tenantId);
  const runtime = await ensureTelegramBot(resolvedTenantId);

  if (!runtime?.username) {
    return null;
  }

  try {
    return `https://t.me/${runtime.username}?start=${signTelegramLink(userId, resolvedTenantId)}`;
  } catch (error) {
    logger.error(`[${resolvedTenantId}] Failed to create Telegram connect link:`, error);
    return null;
  }
}
