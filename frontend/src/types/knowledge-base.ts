// Типы для модуля «База знаний» (Knowledge Base)

// Роли доступа (подмножество backend Role enum)
export type Role =
  | "DEVELOPER"
  | "DIRECTOR"
  | "DEPUTY"
  | "ADMIN"
  | "TEACHER"
  | "ACCOUNTANT"
  | "ZAVHOZ";

// Автор статьи (вложенный объект)
export interface ArticleAuthor {
  id: number;
  email: string;
  employee: {
    firstName: string;
    lastName: string;
  };
}

// Полная статья
export interface KnowledgeBaseArticle {
  id: number;
  title: string;
  slug: string;
  content: string;   // Markdown
  summary: string;
  tags: string[];
  roles: Role[];
  authorId: number;
  author?: ArticleAuthor;
  similarity?: number; // Только при семантическом поиске
  createdAt: string;
  updatedAt: string;
}

// Карточка статьи (для списка)
export type ArticleCard = Pick<
  KnowledgeBaseArticle,
  "id" | "title" | "slug" | "summary" | "tags" | "roles" | "author" | "similarity" | "createdAt" | "updatedAt"
>;

// Результат поиска / листинга
export interface ArticleListResponse {
  items: KnowledgeBaseArticle[];
  total: number;
}

// Параметры поиска
export interface ArticleSearchParams {
  q?: string;
  tags?: string;   // через запятую
  limit?: number;
  offset?: number;
}

// Создание статьи
export interface CreateArticleInput {
  title: string;
  content: string;
  tags?: string[];
  roles?: Role[];
}

// Обновление статьи
export interface UpdateArticleInput {
  title?: string;
  content?: string;
  tags?: string[];
  roles?: Role[];
}

// Маппинг ролей (для UI)
export const roleLabels: Record<Role, string> = {
  DEVELOPER: "Разработчик",
  DIRECTOR: "Директор",
  DEPUTY: "Завуч",
  ADMIN: "Администратор",
  TEACHER: "Учитель",
  ACCOUNTANT: "Бухгалтер",
  ZAVHOZ: "Завхоз",
};
