// src/services/TelegramService.ts
import { Telegraf, Context } from 'telegraf';
import { prisma } from '../prisma';
import { Role } from '@prisma/client';

// Telegram Bot instance (singleton)
let bot: Telegraf | null = null;

function looksLikeTelegramToken(token: string): boolean {
  return /^\d+:[A-Za-z0-9_-]{20,}$/.test(token);
}

function isTelegramUnauthorizedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const response = (error as { response?: { error_code?: number } }).response;
  return response?.error_code === 401;
}

/**
 * Инициализация Telegram бота
 * Обрабатывает команду /start для привязки аккаунта пользователя
 */
export async function initTelegramBot(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  
  if (!token) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN не установлен. Telegram уведомления отключены.');
    return;
  }

  if (!looksLikeTelegramToken(token)) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN имеет некорректный формат. Telegram уведомления отключены.');
    return;
  }

  try {
    const telegramBot = new Telegraf(token);

    // Обработка команды /start <userId>
    telegramBot.start(async (ctx: Context) => {
      const message = ctx.message;
      if (!message || !('text' in message)) return;

      const text = message.text;
      const chatId = ctx.chat?.id?.toString();
      
      if (!chatId) {
        await ctx.reply('❌ Ошибка: не удалось получить Chat ID.');
        return;
      }

      // Извлекаем userId из команды /start <userId>
      const parts = text.split(' ');
      if (parts.length < 2) {
        await ctx.reply(
          '👋 Добро пожаловать!\n\n' +
          'Чтобы связать ваш аккаунт с системой уведомлений, ' +
          'используйте ссылку из вашего профиля в системе.'
        );
        return;
      }

      const userIdParam = parts[1];
      const userId = parseInt(userIdParam, 10);

      if (isNaN(userId)) {
        await ctx.reply('❌ Неверный ID пользователя.');
        return;
      }

      try {
        // Проверяем, не привязан ли уже этот Telegram к другому пользователю
        const existingUser = await prisma.user.findUnique({
          where: { telegramChatId: chatId },
        });

        if (existingUser && existingUser.id !== userId) {
          await ctx.reply(
            '⚠️ Этот Telegram аккаунт уже привязан к другому пользователю.\n' +
            'Отвяжите его сначала через настройки профиля.'
          );
          return;
        }

        // Привязываем Telegram Chat ID к пользователю
        const user = await prisma.user.update({
          where: { id: userId },
          data: { telegramChatId: chatId },
          include: { employee: true },
        });

        const userName = user.employee 
          ? `${user.employee.firstName} ${user.employee.lastName}` 
          : user.email;

        await ctx.reply(
          `✅ Telegram успешно привязан!\n\n` +
          `👤 Пользователь: ${userName}\n` +
          `📧 Email: ${user.email}\n` +
          `🔔 Теперь вы будете получать уведомления о заявках.`
        );

        console.log(`✅ Telegram привязан: User ${userId} -> Chat ${chatId}`);
      } catch (error: any) {
        console.error('Ошибка привязки Telegram:', error);
        
        if (error?.code === 'P2025') {
          await ctx.reply('❌ Пользователь с таким ID не найден в системе.');
        } else {
          await ctx.reply('❌ Произошла ошибка при привязке аккаунта. Попробуйте позже.');
        }
      }
    });

    // Команда /unlink для отвязки аккаунта
    telegramBot.command('unlink', async (ctx: Context) => {
      const chatId = ctx.chat?.id?.toString();
      
      if (!chatId) return;

      try {
        const user = await prisma.user.findUnique({
          where: { telegramChatId: chatId },
        });

        if (!user) {
          await ctx.reply('ℹ️ Ваш Telegram не привязан ни к одному аккаунту.');
          return;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { telegramChatId: null },
        });

        await ctx.reply('✅ Telegram успешно отвязан от вашего аккаунта.');
        console.log(`✅ Telegram отвязан: User ${user.id}`);
      } catch (error) {
        console.error('Ошибка отвязки Telegram:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
      }
    });

    // Команда /status для проверки привязки
    telegramBot.command('status', async (ctx: Context) => {
      const chatId = ctx.chat?.id?.toString();
      
      if (!chatId) return;

      try {
        const user = await prisma.user.findUnique({
          where: { telegramChatId: chatId },
          include: { employee: true },
        });

        if (!user) {
          await ctx.reply('ℹ️ Ваш Telegram не привязан ни к одному аккаунту.');
          return;
        }

        const userName = user.employee 
          ? `${user.employee.firstName} ${user.employee.lastName}` 
          : user.email;

        await ctx.reply(
          `📊 Статус привязки:\n\n` +
          `✅ Аккаунт привязан\n` +
          `👤 Пользователь: ${userName}\n` +
          `📧 Email: ${user.email}\n` +
          `🎭 Роль: ${user.role}`
        );
      } catch (error) {
        console.error('Ошибка проверки статуса:', error);
        await ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
      }
    });

    // Команда /help
    telegramBot.help(async (ctx: Context) => {
      await ctx.reply(
        '📖 Команды бота:\n\n' +
        '/start - Привязать Telegram к аккаунту (через ссылку из системы)\n' +
        '/status - Проверить статус привязки\n' +
        '/unlink - Отвязать Telegram от аккаунта\n' +
        '/help - Показать эту справку'
      );
    });

    const me = await telegramBot.telegram.getMe();
    await telegramBot.launch();
    bot = telegramBot;

    console.log(`🤖 Telegram бот успешно запущен${me.username ? ` как @${me.username}` : ''}`);

    // Graceful shutdown
    process.once('SIGINT', () => telegramBot.stop('SIGINT'));
    process.once('SIGTERM', () => telegramBot.stop('SIGTERM'));

  } catch (error) {
    bot = null;

    if (isTelegramUnauthorizedError(error)) {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN недействителен. Telegram уведомления отключены.');
      return;
    }

    console.error(
      '❌ Ошибка инициализации Telegram бота:',
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Отправить уведомление всем пользователям с определённой ролью
 * @param role - Роль пользователей для уведомления
 * @param message - Текст сообщения
 */
export async function notifyRole(role: Role, message: string): Promise<void> {
  if (!bot) {
    console.warn('⚠️ Telegram бот не инициализирован. Уведомление не отправлено.');
    return;
  }

  try {
    // Находим всех пользователей с указанной ролью и привязанным Telegram
    const users = await prisma.user.findMany({
      where: {
        role: role,
        telegramChatId: { not: null },
      },
      select: {
        id: true,
        telegramChatId: true,
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (users.length === 0) {
      console.log(`ℹ️ Нет пользователей с ролью ${role} для уведомления`);
      return;
    }

    // Отправляем сообщение каждому пользователю
    const results = await Promise.allSettled(
      users.map(async (user) => {
        if (user.telegramChatId) {
          await bot!.telegram.sendMessage(user.telegramChatId, message, {
            parse_mode: 'HTML',
          });
          return user.id;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`📤 Уведомление для роли ${role}: отправлено ${successful}, ошибок ${failed}`);

  } catch (error) {
    console.error(`❌ Ошибка отправки уведомления для роли ${role}:`, error);
  }
}

/**
 * Отправить сообщение конкретному пользователю по ID
 * @param userId - ID пользователя в системе
 * @param message - Текст сообщения
 */
export async function sendTelegramMessage(userId: number, message: string): Promise<boolean> {
  if (!bot) {
    console.warn('⚠️ Telegram бот не инициализирован. Сообщение не отправлено.');
    return false;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramChatId: true },
    });

    if (!user?.telegramChatId) {
      console.log(`ℹ️ У пользователя ${userId} не привязан Telegram`);
      return false;
    }

    await bot.telegram.sendMessage(user.telegramChatId, message, {
      parse_mode: 'HTML',
    });

    console.log(`📤 Сообщение отправлено пользователю ${userId}`);
    return true;

  } catch (error) {
    console.error(`❌ Ошибка отправки сообщения пользователю ${userId}:`, error);
    return false;
  }
}

/**
 * Отправить сообщение по Telegram Chat ID напрямую
 * @param chatId - Telegram Chat ID
 * @param message - Текст сообщения
 */
export async function sendMessageToChatId(chatId: string, message: string): Promise<boolean> {
  if (!bot) {
    console.warn('⚠️ Telegram бот не инициализирован. Сообщение не отправлено.');
    return false;
  }

  try {
    await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });
    return true;
  } catch (error) {
    console.error(`❌ Ошибка отправки в чат ${chatId}:`, error);
    return false;
  }
}

/**
 * Получить экземпляр бота (для расширенного использования)
 */
export function getTelegramBot(): Telegraf | null {
  return bot;
}
