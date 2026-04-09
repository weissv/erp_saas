// src/routes/knowledge-base.routes.ts
// Роуты для модуля «База знаний» (CRUD + семантический поиск)

import { Router, Request, Response } from "express";
import { checkRole } from "../middleware/checkRole";
import { KnowledgeBaseService } from "../services/KnowledgeBaseService";
import { Role } from "@prisma/client";

const router = Router();

// ============================================================================
// GET /  — Поиск / листинг статей
// Query: q (строка поиска), tags (через запятую), limit, offset
// Доступно всем авторизованным пользователям
// ============================================================================
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Не авторизован" });

    const q = (req.query.q as string) || undefined;
    const tagsParam = req.query.tags as string | undefined;
    const tags = tagsParam ? tagsParam.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await KnowledgeBaseService.search(
      { q, tags, limit, offset },
      user.role as Role
    );

    res.json(result);
  } catch (error) {
    console.error("[knowledge-base] GET / error:", error);
    res.status(500).json({ message: "Ошибка при поиске статей" });
  }
});

// ============================================================================
// GET /:slug  — Получение статьи по slug
// ============================================================================
router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Не авторизован" });

    const { slug } = req.params;
    const article = await KnowledgeBaseService.getBySlug(slug, user.role as Role);

    if (!article) {
      return res.status(404).json({ message: "Статья не найдена" });
    }

    res.json(article);
  } catch (error) {
    console.error("[knowledge-base] GET /:slug error:", error);
    res.status(500).json({ message: "Ошибка при получении статьи" });
  }
});

// ============================================================================
// GET /:id/related  — Похожие статьи
// ============================================================================
router.get("/:id/related", async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Не авторизован" });

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Некорректный ID" });

    const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);
    const related = await KnowledgeBaseService.getRelated(id, user.role as Role, limit);

    res.json(related);
  } catch (error) {
    console.error("[knowledge-base] GET /:id/related error:", error);
    res.status(500).json({ message: "Ошибка при поиске похожих статей" });
  }
});

// ============================================================================
// POST /  — Создание статьи (ADMIN, DEPUTY)
// ============================================================================
router.post(
  "/",
  checkRole(["ADMIN", "DEPUTY"]),
  async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Не авторизован" });

      const { title, content, tags, roles } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: "Поля 'title' и 'content' обязательны" });
      }

      const article = await KnowledgeBaseService.createArticle({
        title,
        content,
        tags: tags || [],
        roles: roles || [],
        authorId: user.id,
      });

      res.status(201).json(article);
    } catch (error) {
      console.error("[knowledge-base] POST / error:", error);
      res.status(500).json({ message: "Ошибка при создании статьи" });
    }
  }
);

// ============================================================================
// PUT /:id  — Обновление статьи (ADMIN, DEPUTY)
// ============================================================================
router.put(
  "/:id",
  checkRole(["ADMIN", "DEPUTY"]),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Некорректный ID" });

      const { title, content, tags, roles } = req.body;

      const article = await KnowledgeBaseService.updateArticle(id, {
        title,
        content,
        tags,
        roles,
      });

      res.json(article);
    } catch (error: any) {
      if (error.message === "Статья не найдена") {
        return res.status(404).json({ message: error.message });
      }
      console.error("[knowledge-base] PUT /:id error:", error);
      res.status(500).json({ message: "Ошибка при обновлении статьи" });
    }
  }
);

// ============================================================================
// DELETE /:id  — Удаление статьи (ADMIN, DEPUTY)
// ============================================================================
router.delete(
  "/:id",
  checkRole(["ADMIN", "DEPUTY"]),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Некорректный ID" });

      await KnowledgeBaseService.deleteArticle(id);
      res.json({ message: "Статья удалена" });
    } catch (error: any) {
      if (error.message === "Статья не найдена") {
        return res.status(404).json({ message: error.message });
      }
      console.error("[knowledge-base] DELETE /:id error:", error);
      res.status(500).json({ message: "Ошибка при удалении статьи" });
    }
  }
);

export default router;
