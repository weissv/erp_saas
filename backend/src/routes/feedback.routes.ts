// src/routes/feedback.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { notifyRole } from "../services/TelegramService";

const router = Router();

const BUG_REPORT_TYPE = "Баг-репорт";

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
  CRITICAL: "Критический",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeMultilineText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
}

function buildStoredBugMessage(payload: {
  title: string;
  severity: string;
  pageUrl?: string;
  expectedBehavior?: string;
  actualBehavior: string;
  stepsToReproduce?: string;
  browserInfo?: string;
}): string {
  const sections = [
    `Заголовок: ${payload.title}`,
    `Критичность: ${SEVERITY_LABELS[payload.severity] || payload.severity}`,
    payload.pageUrl ? `Страница: ${payload.pageUrl}` : null,
    `Фактическое поведение:\n${payload.actualBehavior}`,
    payload.expectedBehavior ? `Ожидаемое поведение:\n${payload.expectedBehavior}` : null,
    payload.stepsToReproduce ? `Шаги для воспроизведения:\n${payload.stepsToReproduce}` : null,
    payload.browserInfo ? `Техническая информация:\n${payload.browserInfo}` : null,
  ].filter(Boolean);

  return sections.join("\n\n");
}

function buildTelegramBugMessage(payload: {
  reporterName: string;
  reporterEmail: string;
  reporterRole: string;
  title: string;
  severity: string;
  pageUrl?: string;
  expectedBehavior?: string;
  actualBehavior: string;
  stepsToReproduce?: string;
  browserInfo?: string;
}): string {
  const parts = [
    "🐞 <b>Новый баг-репорт</b>",
    "",
    `<b>Автор:</b> ${escapeHtml(payload.reporterName)}`,
    `<b>Email:</b> ${escapeHtml(payload.reporterEmail)}`,
    `<b>Роль:</b> ${escapeHtml(payload.reporterRole)}`,
    `<b>Заголовок:</b> ${escapeHtml(payload.title)}`,
    `<b>Критичность:</b> ${escapeHtml(SEVERITY_LABELS[payload.severity] || payload.severity)}`,
    payload.pageUrl ? `<b>Страница:</b> ${escapeHtml(payload.pageUrl)}` : null,
    "",
    `<b>Фактическое поведение:</b>\n${escapeHtml(payload.actualBehavior)}`,
    payload.expectedBehavior
      ? `\n<b>Ожидаемое поведение:</b>\n${escapeHtml(payload.expectedBehavior)}`
      : null,
    payload.stepsToReproduce
      ? `\n<b>Шаги для воспроизведения:</b>\n${escapeHtml(payload.stepsToReproduce)}`
      : null,
    payload.browserInfo
      ? `\n<b>Техническая информация:</b>\n${escapeHtml(payload.browserInfo)}`
      : null,
  ].filter(Boolean);

  return parts.join("\n");
}

// GET /api/feedback - List all feedback (filter by status, type)
router.get("/", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const { status, type } = req.query;
  
  const feedback = await prisma.feedback.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(type ? { type: type as any } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  
  return res.json(feedback);
});

// POST /api/feedback - Create new feedback (public endpoint for parents)
router.post("/", async (req, res) => {
  const { parentName, contactInfo, type, message } = req.body;
  
  const feedback = await prisma.feedback.create({
    data: {
      parentName,
      contactInfo,
      type,
      message,
      status: "NEW",
    },
  });
  
  return res.status(201).json(feedback);
});

// POST /api/feedback/bug-report - Create authenticated bug report and notify developers in Telegram
router.post("/bug-report", async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const title = normalizeMultilineText(req.body?.title);
    const severity = normalizeMultilineText(req.body?.severity).toUpperCase();
    const pageUrl = normalizeMultilineText(req.body?.pageUrl);
    const expectedBehavior = normalizeMultilineText(req.body?.expectedBehavior);
    const actualBehavior = normalizeMultilineText(req.body?.actualBehavior);
    const stepsToReproduce = normalizeMultilineText(req.body?.stepsToReproduce);
    const browserInfo = normalizeMultilineText(req.body?.browserInfo);

    if (title.length < 5) {
      return res.status(400).json({ message: "Укажите краткий заголовок проблемы" });
    }

    if (!Object.prototype.hasOwnProperty.call(SEVERITY_LABELS, severity)) {
      return res.status(400).json({ message: "Укажите корректную критичность" });
    }

    if (actualBehavior.length < 10) {
      return res.status(400).json({ message: "Опишите фактическое поведение подробнее" });
    }

    const reporter = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { employee: true },
    });

    if (!reporter) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const reporterName = reporter.employee
      ? `${reporter.employee.firstName} ${reporter.employee.lastName}`
      : reporter.email;

    const storedMessage = buildStoredBugMessage({
      title,
      severity,
      pageUrl,
      expectedBehavior,
      actualBehavior,
      stepsToReproduce,
      browserInfo,
    });

    const feedback = await prisma.feedback.create({
      data: {
        parentName: reporterName,
        contactInfo: reporter.email,
        type: BUG_REPORT_TYPE,
        message: storedMessage,
        status: "NEW",
      },
    });

    try {
      await notifyRole(
        "DEVELOPER",
        buildTelegramBugMessage({
          reporterName,
          reporterEmail: reporter.email,
          reporterRole: reporter.role,
          title,
          severity,
          pageUrl,
          expectedBehavior,
          actualBehavior,
          stepsToReproduce,
          browserInfo,
        })
      );
    } catch (telegramError) {
      console.error("Ошибка отправки bug-report в Telegram:", telegramError);
    }

    return res.status(201).json(feedback);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Ошибка создания баг-репорта" });
  }
});

// PUT /api/feedback/:id - Update feedback status/response
router.put("/:id", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { status, response } = req.body;
  
  const feedback = await prisma.feedback.update({
    where: { id: Number(id) },
    data: {
      status,
      response: response || null,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });
  
  return res.json(feedback);
});

// DELETE /api/feedback/:id - Delete feedback
router.delete("/:id", checkRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  
  await prisma.feedback.delete({
    where: { id: Number(id) },
  });
  
  return res.status(204).send();
});

export default router;
