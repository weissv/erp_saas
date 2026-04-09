// src/routes/ai.routes.ts
import { Router, Request, Response } from "express";
import { AiService } from "../services/AiService";
import { checkRole } from "../middleware/checkRole";
import { z } from "zod";
import { validate } from "../middleware/validate";

const router = Router();

// Схемы валидации
const addDocumentSchema = z.object({
  body: z.object({
    content: z.string().min(10, "Текст документа должен содержать минимум 10 символов"),
    metadata: z
      .object({
        title: z.string().optional(),
        subject: z.string().optional(),
        grade: z.string().optional(),
        tags: z.array(z.string()).optional(),
        source: z.string().optional(),
      })
      .optional(),
  }),
});

const addDocumentFromTextSchema = z.object({
  body: z.object({
    content: z.string().min(10, "Текст документа должен содержать минимум 10 символов"),
    title: z.string().min(1, "Название документа обязательно"),
    subject: z.string().optional(),
    grade: z.string().optional(),
  }),
});

const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1, "Сообщение не может быть пустым"),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })
      )
      .optional(),
  }),
});

const deleteDocumentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID должен быть числом"),
  }),
});

/**
 * POST /api/ai/documents
 * Добавление документа в базу знаний
 */
router.post(
  "/documents",
  checkRole(["ADMIN", "DIRECTOR", "DEPUTY"]),
  validate(addDocumentSchema),
  async (req: Request, res: Response) => {
    try {
      const { content, metadata } = req.body;
      const result = await AiService.addDocument(content, metadata || {});

      res.status(201).json({
        success: true,
        message: "Документ успешно добавлен в базу знаний",
        data: result,
      });
    } catch (error) {
      console.error("Error adding document:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Ошибка добавления документа",
      });
    }
  }
);

/**
 * POST /api/ai/documents/upload
 * Загрузка документа с разбиением на чанки
 */
router.post(
  "/documents/upload",
  checkRole(["ADMIN", "DIRECTOR", "DEPUTY"]),
  validate(addDocumentFromTextSchema),
  async (req: Request, res: Response) => {
    try {
      const { content, title, subject, grade } = req.body;
      const result = await AiService.addDocumentFromText(content, title, subject, grade);

      res.status(201).json({
        success: true,
        message: `Документ успешно добавлен (${result.chunksCreated} частей)`,
        data: result,
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Ошибка загрузки документа",
      });
    }
  }
);

/**
 * GET /api/ai/documents
 * Получение списка всех документов базы знаний
 */
router.get(
  "/documents",
  checkRole(["ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"]),
  async (_req: Request, res: Response) => {
    try {
      const documents = await AiService.getAllDocuments();
      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      console.error("Error getting documents:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Ошибка получения документов",
      });
    }
  }
);

/**
 * DELETE /api/ai/documents/:id
 * Удаление документа из базы знаний
 */
router.delete(
  "/documents/:id",
  checkRole(["ADMIN", "DIRECTOR"]),
  validate(deleteDocumentSchema),
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      await AiService.deleteDocument(id);

      res.json({
        success: true,
        message: "Документ успешно удален",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Ошибка удаления документа",
      });
    }
  }
);

/**
 * POST /api/ai/chat
 * Чат с AI-ассистентом (RAG)
 */
router.post(
  "/chat",
  checkRole(["ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"]),
  validate(chatSchema),
  async (req: Request, res: Response) => {
    try {
      const { message, history } = req.body;

      const result = await AiService.chatWithAssistant(message, history || []);

      res.json({
        success: true,
        data: {
          response: result.response,
          sources: result.sources.map((s) => ({
            id: s.id,
            content:
              s.content.substring(0, 200) + (s.content.length > 200 ? "..." : ""),
            metadata: s.metadata,
            similarity: s.similarity,
          })),
        },
      });
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Ошибка обработки запроса к AI-ассистенту",
      });
    }
  }
);

/**
 * POST /api/ai/sync-google-drive
 * Синхронизация документов из Google Drive (фоновый режим)
 */
router.post(
  "/sync-google-drive",
  checkRole(["ADMIN", "DIRECTOR"]),
  async (req: Request, res: Response) => {
    try {
      const { background } = req.query;
      
      // Если запрошен фоновый режим
      if (background === "true") {
        const result = AiService.startBackgroundSync();
        return res.json({
          success: result.started,
          message: result.message,
          data: AiService.getSyncStatus(),
        });
      }
      
      // Синхронный режим (для небольшого количества файлов)
      const result = await AiService.syncGoogleDriveDocuments();
      
      res.json({
        success: true,
        message: `Синхронизация завершена. Добавлено: ${result.synced}, обновлено: ${result.updated}, пропущено: ${result.skipped}, ошибок: ${result.errors}`,
        data: result,
      });
    } catch (error) {
      console.error("Error syncing Google Drive:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Ошибка синхронизации Google Drive",
      });
    }
  }
);

/**
 * GET /api/ai/sync-status
 * Получение статуса синхронизации (для поллинга)
 */
router.get(
  "/sync-status",
  checkRole(["ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"]),
  async (_req: Request, res: Response) => {
    try {
      const status = AiService.getSyncStatus();
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error("Error getting sync status:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка получения статуса синхронизации",
      });
    }
  }
);

/**
 * GET /api/ai/google-drive-files
 * Получение списка файлов из Google Drive
 */
router.get(
  "/google-drive-files",
  checkRole(["ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"]),
  async (_req: Request, res: Response) => {
    try {
      const files = await AiService.getGoogleDriveFiles();
      
      res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      console.error("Error getting Google Drive files:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Ошибка получения файлов из Google Drive",
      });
    }
  }
);

/**
 * GET /api/ai/system-prompt
 * Получение текущего системного промта
 */
router.get(
  "/system-prompt",
  checkRole(["ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"]),
  async (_req: Request, res: Response) => {
    try {
      const prompt = AiService.getSystemPrompt();
      res.json({
        success: true,
        data: { prompt },
      });
    } catch (error) {
      console.error("Error getting system prompt:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка получения системного промта",
      });
    }
  }
);

/**
 * PUT /api/ai/system-prompt
 * Обновление системного промта (только ADMIN и DIRECTOR)
 */
router.put(
  "/system-prompt",
  checkRole(["ADMIN", "DIRECTOR"]),
  async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({
          success: false,
          message: "Промт не может быть пустым",
        });
      }
      
      AiService.setSystemPrompt(prompt);
      
      res.json({
        success: true,
        message: "Системный промт успешно обновлен",
      });
    } catch (error) {
      console.error("Error updating system prompt:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка обновления системного промта",
      });
    }
  }
);

/**
 * POST /api/ai/system-prompt/reset
 * Сброс системного промта к дефолтному (только ADMIN и DIRECTOR)
 */
router.post(
  "/system-prompt/reset",
  checkRole(["ADMIN", "DIRECTOR"]),
  async (_req: Request, res: Response) => {
    try {
      AiService.resetSystemPrompt();
      
      res.json({
        success: true,
        message: "Системный промт сброшен к значению по умолчанию",
        data: { prompt: AiService.getSystemPrompt() },
      });
    } catch (error) {
      console.error("Error resetting system prompt:", error);
      res.status(500).json({
        success: false,
        message: "Ошибка сброса системного промта",
      });
    }
  }
);

export default router;
