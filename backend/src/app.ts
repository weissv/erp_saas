// src/app.ts
import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { authMiddleware } from "./middleware/auth";
import { tenantResolver } from "./middleware/tenantResolver";
import { errorHandler } from "./middleware/errorHandler";
import { config } from "./config";
import { logger } from "./utils/logger";
import stripeWebhookRoutes from "./modules/saas/routes/stripe-webhook.routes";

// Импорты роутов
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import childrenRoutes from "./routes/children.routes";
import parentsRoutes from "./routes/parents.routes";
import employeesRoutes from "./routes/employees.routes";
import clubsRoutes from "./routes/clubs.routes";
import attendanceRoutes from "./routes/attendance.routes";
import financeRoutes from "./routes/finance.routes";
import inventoryRoutes from "./routes/inventory.routes";
import menuRoutes from "./routes/menu.routes";
import maintenanceRoutes from "./routes/maintenance.routes";
import securityRoutes from "./routes/security.routes";
import actionlogRoutes from "./routes/actionlog.routes";
import groupsRoutes from "./routes/groups.routes";
import notificationsRoutes from "./routes/notifications.routes";
import documentsRoutes from "./routes/documents.routes";
import calendarRoutes from "./routes/calendar.routes";
import feedbackRoutes from "./routes/feedback.routes";
import procurementRoutes from "./routes/procurement.routes";
import recipesRoutes from "./routes/recipes.routes";
import staffingRoutes from "./routes/staffing.routes";
import integrationRoutes from "./routes/export.routes";
import oneCIntegrationRoutes from "./modules/onec/routes/sync.routes";
import oneCDataRoutes from "./modules/onec/routes/onec-data.routes";
import oneCPushSyncRoutes from "./modules/onec/routes/push-sync.routes";
import oneCPushApiRoutes from "./modules/onec/routes/push-api.routes";
import oneCIntegrationSettingsRoutes from "./modules/onec/routes/onec-integration-settings.routes";
import usersRoutes from "./routes/users.routes";
import aiRoutes from "./routes/ai.routes";
import scheduleRoutes from "./routes/schedule.routes";
import settingsRoutes from "./routes/settings.routes";
import lmsSchoolRoutes from "./routes/lms-school.routes";
import permissionsRoutes from "./routes/permissions.routes";
import examsRoutes from "./routes/exams.routes";
import publicExamsRoutes from "./routes/public-exams.routes";
import tenantRoutes from "./routes/tenant.routes";
import uploadRoutes from "./routes/upload.routes";
import knowledgeBaseRoutes from "./routes/knowledge-base.routes";

const app = express();

const allowedOrigins = new Set(config.corsOrigins);
const allowPattern = [/\.onrender\.com$/, /\.trycloudflare\.com$/, /\.loca\.lt$/];

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.has(origin) || allowPattern.some((regex) => regex.test(origin))) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
  exposedHeaders: ["Set-Cookie"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Stripe webhook needs the raw body for signature verification – must be
// mounted BEFORE the global express.json() middleware.
app.use(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookRoutes,
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// Health check endpoint (public, no tenant resolution needed)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Tenant resolution ──────────────────────────────────────────────────
// Every request below this point is scoped to a specific tenant.
// The middleware parses the subdomain, looks up the Control Plane, and
// injects req.tenantId + req.prisma for downstream handlers.
app.use(tenantResolver);

// Публичные роуты
app.use("/api/auth", authRoutes);
app.use("/api/public/exams", publicExamsRoutes); // Публичный доступ к контрольным для студентов
app.use("/api/tenant", tenantRoutes); // Public tenant branding (no auth)

// ── 1C Push API (Integration Key auth — not JWT) ────────────────────────
// This endpoint is called by the 1C Extension using a per-tenant API key.
// It must be mounted BEFORE the JWT auth middleware.
app.use("/api/v1/integration", oneCPushSyncRoutes);
app.use("/api/v1/integration", oneCPushApiRoutes);

// Защита всех последующих роутов
app.use(authMiddleware);

// 3. Эти роуты теперь защищены:
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/children", childrenRoutes);
app.use("/api/parents", parentsRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/clubs", clubsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/actionlog", actionlogRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/procurement", procurementRoutes);
app.use("/api/recipes", recipesRoutes);
app.use("/api/staffing", staffingRoutes);
app.use("/api/integration", integrationRoutes);
app.use("/api/integrations", oneCIntegrationRoutes);
app.use("/api/integrations", oneCIntegrationSettingsRoutes);
app.use("/api/onec-data", oneCDataRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/lms/school", lmsSchoolRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/exams", examsRoutes); // Управление контрольными для учителей/админов
app.use("/api/knowledge-base", knowledgeBaseRoutes); // База знаний
app.use("/api/uploads", uploadRoutes); // Tenant-scoped file uploads

// Обработчик ошибок
app.use(errorHandler);

export default app;