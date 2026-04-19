import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma, mockSendMessageToChatId, mockNotifyRole } = vi.hoisted(() => ({
  mockPrisma: {
    feedback: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  mockSendMessageToChatId: vi.fn(),
  mockNotifyRole: vi.fn(),
}));

vi.mock("../prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("../services/TelegramService", () => ({
  sendMessageToChatId: (...args: unknown[]) => mockSendMessageToChatId(...args),
  notifyRole: (...args: unknown[]) => mockNotifyRole(...args),
}));

vi.mock("../middleware/auth", () => ({
  authMiddleware: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers.authorization === "Bearer test-token") {
      req.user = { id: 1, role: "ADMIN", employeeId: 1 };
      return next();
    }

    return res.status(401).json({ message: "Unauthorized" });
  },
}));

import feedbackRoutes from "./feedback.routes";

describe("feedback.routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_ADMIN_CHAT_ID = "12345";
  });

  function createApp() {
    const app = express();
    app.use(express.json());
    app.use("/api/feedback", feedbackRoutes);
    return app;
  }

  it("creates a public waitlist request without auth", async () => {
    const createdAt = new Date("2026-04-19T12:00:00.000Z");
    mockPrisma.feedback.create.mockResolvedValue({
      id: 7,
      parentName: "Mirai Academy",
      contactInfo: "@mirai_admin",
      type: "WAITLIST",
      message: "Нужен запуск школы и demo для команды.",
      status: "NEW",
      createdAt,
    });
    mockSendMessageToChatId.mockResolvedValue(true);

    const response = await request(createApp()).post("/api/feedback").send({
      parentName: "Mirai Academy",
      contactInfo: "@mirai_admin",
      type: "WAITLIST",
      message: "Нужен запуск школы и demo для команды.",
    });

    expect(response.status).toBe(201);
    expect(mockPrisma.feedback.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentName: "Mirai Academy",
          contactInfo: "@mirai_admin",
          type: "WAITLIST",
        }),
      })
    );
    expect(mockSendMessageToChatId).toHaveBeenCalledWith(
      "12345",
      expect.stringContaining("Mirai Academy")
    );
  });

  it("requires auth for bug-report endpoint", async () => {
    const response = await request(createApp()).post("/api/feedback/bug-report").send({
      title: "Ошибка",
      severity: "HIGH",
      actualBehavior: "Подробное описание проблемы для теста.",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Unauthorized" });
  });
});
