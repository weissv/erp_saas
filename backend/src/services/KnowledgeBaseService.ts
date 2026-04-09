// src/services/KnowledgeBaseService.ts
// Сервис для управления статьями Базы Знаний с поддержкой векторного поиска (RAG)
// ALL queries enforce mandatory tenantId filtering to prevent cross-tenant data leakage.

import { PrismaClient, Role } from "@prisma/client";
import { AiService } from "./AiService";
import { DEFAULT_TENANT_ID } from "./TenantIntegrationsService";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

// ============================================================================
// ТИПЫ
// ============================================================================

export interface CreateArticleInput {
  title: string;
  content: string; // Markdown
  tags?: string[];
  roles?: Role[];  // Какие роли видят статью (пустой = все)
  authorId: number;
  tenantId?: string;
}

export interface UpdateArticleInput {
  title?: string;
  content?: string;
  tags?: string[];
  roles?: Role[];
}

export interface ArticleSearchParams {
  q?: string;       // Текстовый / семантический запрос
  tags?: string[];   // Фильтрация по тегам
  limit?: number;
  offset?: number;
  tenantId?: string;
}

export interface ArticleResult {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary: string;
  tags: string[];
  roles: Role[];
  authorId: number;
  author?: { id: number; email: string; employee: { firstName: string; lastName: string } };
  similarity?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticleListResult {
  items: ArticleResult[];
  total: number;
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Генерирует уникальный slug из заголовка (транслитерация + нормализация)
 */
function generateSlug(title: string): string {
  const translitMap: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
    ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };

  const slug = title
    .toLowerCase()
    .split("")
    .map((char) => translitMap[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Добавляем timestamp-суффикс для уникальности
  const suffix = Date.now().toString(36).slice(-4);
  return `${slug}-${suffix}`;
}

/**
 * Генерирует краткое описание (summary) из контента
 * Берёт первые 200 символов чистого текста
 */
function generateSummary(content: string): string {
  const plainText = content
    .replace(/#{1,6}\s+/g, "")       // убираем заголовки md
    .replace(/[*_~`>]/g, "")         // убираем форматирование
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](link) -> text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")  // убираем картинки
    .replace(/```[\s\S]*?```/g, "")  // убираем блоки кода
    .replace(/\n+/g, " ")
    .trim();

  return plainText.length > 200 ? plainText.slice(0, 197) + "..." : plainText;
}

// ============================================================================
// СЕРВИС
// ============================================================================

/**
 * Sanitizes a tenantId for safe inclusion in raw SQL queries.
 * Allows only alphanumeric, dash, and underscore characters.
 * Throws if the value looks like a SQL injection attempt.
 */
function safeTenantId(tenantId: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    throw new Error("Invalid tenantId");
  }
  return tenantId;
 * Validates a tenantId to prevent SQL injection when used in $queryRawUnsafe.
 * Only alphanumeric, hyphens, and underscores are allowed.
 */
function sanitizeTenantId(tenantId: string): string {
  const cleaned = tenantId.replace(/[^a-zA-Z0-9_-]/g, "");
  return cleaned || "default";
}

/**
 * Создание статьи с автоматической генерацией embedding, slug и summary
 */
async function createArticle(input: CreateArticleInput): Promise<ArticleResult> {
  const { title, content, tags = [], roles = [], authorId, tenantId = DEFAULT_TENANT_ID } = input;
  const { title, content, tags = [], roles = [], authorId, tenantId = "default" } = input;

  const slug = generateSlug(title);
  const summary = generateSummary(content);

  // 1. Создаём статью без embedding (Prisma не поддерживает Unsupported напрямую)
  const article = await prisma.knowledgeBaseArticle.create({
    data: {
      tenantId,
      title,
      slug,
      content,
      summary,
      tags,
      roles,
      authorId,
      tenantId,
    },
    include: {
      author: {
        select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  // 2. Генерируем embedding через AiService и сохраняем raw-запросом
  try {
    const embeddingText = `${title}\n${summary}\n${tags.join(", ")}`;
    const embedding = await AiService.generateEmbedding(embeddingText, tenantId);
    const embeddingStr = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      UPDATE "KnowledgeBaseArticle"
      SET embedding = ${embeddingStr}::vector
      WHERE id = ${article.id} AND "tenantId" = ${tenantId}
    `;
  } catch (err) {
    logger.error(`[KnowledgeBase] Ошибка генерации embedding для статьи #${article.id}:`, err);
    // Статья создана, но без вектора — не фатально
  }

  return article as ArticleResult;
}

/**
 * Обновление статьи с перегенерацией embedding.
 * MANDATORY tenantId filter prevents cross-tenant modification.
 */
async function updateArticle(id: number, input: UpdateArticleInput, tenantId: string = DEFAULT_TENANT_ID): Promise<ArticleResult> {
  const existing = await prisma.knowledgeBaseArticle.findUnique({ where: { id } });
 * Обновление статьи с перегенерацией embedding (tenant-scoped)
 */
async function updateArticle(id: number, input: UpdateArticleInput, tenantId: string = "default"): Promise<ArticleResult> {
  const existing = await prisma.knowledgeBaseArticle.findFirst({ where: { id, tenantId } });
  if (!existing) {
    throw new Error("Статья не найдена");
  }
  if (existing.tenantId !== tenantId) {
    throw new Error("Статья не найдена");
  }

  const data: Record<string, unknown> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.content !== undefined) {
    data.content = input.content;
    data.summary = generateSummary(input.content);
  }
  if (input.tags !== undefined) data.tags = input.tags;
  if (input.roles !== undefined) data.roles = input.roles;

  const article = await prisma.knowledgeBaseArticle.update({
    where: { id },
    data,
    include: {
      author: {
        select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  // Перегенерируем embedding если изменился контент или заголовок
  if (input.title !== undefined || input.content !== undefined) {
    try {
      const embeddingText = `${article.title}\n${article.summary}\n${article.tags.join(", ")}`;
      const embedding = await AiService.generateEmbedding(embeddingText, tenantId);
      const embeddingStr = `[${embedding.join(",")}]`;

      await prisma.$executeRaw`
        UPDATE "KnowledgeBaseArticle"
        SET embedding = ${embeddingStr}::vector
        WHERE id = ${article.id} AND "tenantId" = ${tenantId}
      `;
    } catch (err) {
      logger.error(`[KnowledgeBase] Ошибка обновления embedding для статьи #${article.id}:`, err);
    }
  }

  return article as ArticleResult;
}

/**
 * Гибридный поиск: семантический (по вектору) + фильтрация по тегам и ролям.
 * MANDATORY tenantId filter prevents cross-tenant data leakage.
 */
async function search(
  params: ArticleSearchParams,
  userRole: Role
): Promise<ArticleListResult> {
  const { q, tags, limit = 20, offset = 0, tenantId = DEFAULT_TENANT_ID } = params;
  const { q, tags, limit = 20, offset = 0, tenantId: rawTenantId = "default" } = params;
  const tenantId = sanitizeTenantId(rawTenantId);

  // ========== Семантический поиск (если есть запрос) ==========
  if (q && q.trim().length > 0) {
    try {
      const queryEmbedding = await AiService.generateEmbedding(q, tenantId);
      const embeddingStr = `[${queryEmbedding.join(",")}]`;

      // Строим WHERE-условия для ролей, тегов и ОБЯЗАТЕЛЬНОГО tenantId
      const conditions: string[] = [
        `embedding IS NOT NULL`,
        `"tenantId" = '${safeTenantId(tenantId)}'`,
      // Строим WHERE-условия: mandatory tenantId + ролевой фильтр + теги
      const conditions: string[] = [
        `embedding IS NOT NULL`,
        `"tenantId" = '${tenantId}'`,
      ];

      // Пользователь видит статьи: без ограничений по ролям ИЛИ его роль в списке
      conditions.push(`(roles = '{}' OR '${userRole}' = ANY(roles))`);

      if (tags && tags.length > 0) {
        const tagsLiteral = `{${tags.map((t) => `"${t}"`).join(",")}}`;
        conditions.push(`tags && '${tagsLiteral}'::text[]`);
      }

      const whereClause = conditions.join(" AND ");

      const articles = await prisma.$queryRawUnsafe<ArticleResult[]>(`
        SELECT 
          id, title, slug, content, summary, tags, roles,
          "authorId", "createdAt", "updatedAt",
          1 - (embedding <=> '${embeddingStr}'::vector) as similarity
        FROM "KnowledgeBaseArticle"
        WHERE ${whereClause}
        ORDER BY embedding <=> '${embeddingStr}'::vector
        LIMIT ${limit} OFFSET ${offset}
      `);

      // Считаем total
      const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(`
        SELECT COUNT(*) as count
        FROM "KnowledgeBaseArticle"
        WHERE ${whereClause}
      `);
      const total = Number(countResult[0]?.count ?? 0);

      // Подгружаем авторов
      const articleIds = articles.map((a) => a.id);
      const authors = articleIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: articles.map((a) => a.authorId) } },
            select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } },
          })
        : [];
      const authorMap = new Map(authors.map((a) => [a.id, a]));

      const items = articles.map((a) => ({
        ...a,
        author: authorMap.get(a.authorId),
      }));

      return { items, total };
    } catch (err) {
      logger.error("[KnowledgeBase] Ошибка семантического поиска:", err);
      // Fallback к текстовому поиску
    }
  }

  // ========== Текстовый поиск / листинг ==========
  const where: Record<string, unknown> = {
    tenantId, // MANDATORY tenant filter
    tenantId,
  };

  // Фильтр по ролям
  where.OR = [
    { roles: { isEmpty: true } },
    { roles: { has: userRole } },
  ];

  if (tags && tags.length > 0) {
    where.tags = { hasSome: tags };
  }

  if (q && q.trim().length > 0) {
    where.AND = [
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.knowledgeBaseArticle.findMany({
      where: where as any,
      include: {
        author: {
          select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.knowledgeBaseArticle.count({ where: where as any }),
  ]);

  return { items: items as ArticleResult[], total };
}

/**
 * Получение статьи по slug.
 * MANDATORY tenantId filter prevents cross-tenant data leakage.
 */
async function getBySlug(slug: string, userRole: Role, tenantId: string = DEFAULT_TENANT_ID): Promise<ArticleResult | null> {
  const article = await prisma.knowledgeBaseArticle.findUnique({
    where: { slug },
 * Получение статьи по slug (tenant-scoped)
 */
async function getBySlug(slug: string, userRole: Role, tenantId: string = "default"): Promise<ArticleResult | null> {
  const article = await prisma.knowledgeBaseArticle.findFirst({
    where: { slug, tenantId },
    include: {
      author: {
        select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  if (!article) return null;

  // Verify tenant ownership
  if (article.tenantId !== tenantId) return null;

  // Проверка доступа по роли
  if (article.roles.length > 0 && !article.roles.includes(userRole)) {
    return null; // Нет доступа
  }

  return article as ArticleResult;
}

/**
 * Поиск похожих статей на основе embedding текущей статьи.
 * MANDATORY tenantId filter prevents cross-tenant data leakage.
 */
async function getRelated(articleId: number, userRole: Role, limit: number = 5, tenantId: string = DEFAULT_TENANT_ID): Promise<ArticleResult[]> {
 * Поиск похожих статей на основе embedding текущей статьи (tenant-scoped)
 */
async function getRelated(articleId: number, userRole: Role, limit: number = 5, tenantId: string = "default"): Promise<ArticleResult[]> {
  const safeTenantId = sanitizeTenantId(tenantId);
  try {
    const conditions = [
      `id != ${articleId}`,
      `embedding IS NOT NULL`,
      `"tenantId" = '${safeTenantId(tenantId)}'`,
      `"tenantId" = '${safeTenantId}'`,
      `(roles = '{}' OR '${userRole}' = ANY(roles))`,
    ];
    const whereClause = conditions.join(" AND ");

    const articles = await prisma.$queryRawUnsafe<ArticleResult[]>(`
      SELECT 
        a.id, a.title, a.slug, a.summary, a.tags, a.roles,
        a."authorId", a."createdAt", a."updatedAt",
        1 - (a.embedding <=> source.embedding) as similarity
      FROM "KnowledgeBaseArticle" a,
           (SELECT embedding FROM "KnowledgeBaseArticle" WHERE id = ${articleId}) source
      WHERE ${whereClause}
        AND source.embedding IS NOT NULL
      ORDER BY a.embedding <=> source.embedding
      LIMIT ${limit}
    `);

    return articles;
  } catch (err) {
    logger.error("[KnowledgeBase] Ошибка поиска похожих статей:", err);
    return [];
  }
}

/**
 * Удаление статьи.
 * MANDATORY tenantId filter prevents cross-tenant deletion.
 */
async function deleteArticle(id: number, tenantId: string = DEFAULT_TENANT_ID): Promise<boolean> {
  const existing = await prisma.knowledgeBaseArticle.findUnique({ where: { id } });
 * Удаление статьи (tenant-scoped)
 */
async function deleteArticle(id: number, tenantId: string = "default"): Promise<boolean> {
  const existing = await prisma.knowledgeBaseArticle.findFirst({ where: { id, tenantId } });
  if (!existing) {
    throw new Error("Статья не найдена");
  }
  if (existing.tenantId !== tenantId) {
    throw new Error("Статья не найдена");
  }

  await prisma.knowledgeBaseArticle.delete({ where: { id } });
  return true;
}

// ============================================================================
// ЭКСПОРТ
// ============================================================================

export const KnowledgeBaseService = {
  createArticle,
  updateArticle,
  search,
  getBySlug,
  getRelated,
  deleteArticle,
};
