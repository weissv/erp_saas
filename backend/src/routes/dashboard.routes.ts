// src/routes/dashboard.routes.ts
import { Router, Request, Response } from "express";
import { checkRole } from "../middleware/checkRole";
import { asyncHandler } from "../middleware/errorHandler";
import { Role } from "@prisma/client";
import { dashboardPreferencesService } from "../services/dashboard/DashboardPreferencesService";
import { dashboardWidgetService } from "../services/dashboard/DashboardWidgetService";
import {
  WIDGET_CATALOGUE,
} from "../constants/dashboard";

const router = Router();

const DASHBOARD_ROLES: Role[] = ["DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT", "TEACHER", "ZAVHOZ", "DEVELOPER"];

// ─── Bootstrap: каталог виджетов + preferences + quick actions ───
router.get(
  "/bootstrap",
  checkRole(DASHBOARD_ROLES),
  asyncHandler(async (req: Request, res: Response) => {
    const payload = await dashboardWidgetService.getBootstrap(
      req.user!.id,
      req.user!.role as Role,
      req.user!.employeeId,
    );

    if (payload.preferences.layout.length === 0) {
      payload.preferences = await dashboardPreferencesService.get(req.user!.id, req.user!.role as Role);
    }

    return res.json(payload);
  })
);

// ─── Preferences: чтение ───
router.get(
  "/preferences",
  checkRole(DASHBOARD_ROLES),
  asyncHandler(async (req: Request, res: Response) => {
    const prefs = await dashboardPreferencesService.get(req.user!.id, req.user!.role as Role);
    return res.json(prefs);
  })
);

// ─── Preferences: сохранение ───
router.put(
  "/preferences",
  checkRole(DASHBOARD_ROLES),
  asyncHandler(async (req: Request, res: Response) => {
    const saved = await dashboardPreferencesService.save(req.user!.id, req.user!.role as Role, req.body);
    return res.json(saved);
  })
);

// ─── Preferences: сброс ───
router.post(
  "/preferences/reset",
  checkRole(DASHBOARD_ROLES),
  asyncHandler(async (req: Request, res: Response) => {
    const defaults = await dashboardPreferencesService.reset(req.user!.id, req.user!.role as Role);
    return res.json(defaults);
  })
);

// ─── Widget data endpoint (universal) ───
router.get(
  "/widgets/:widgetId",
  checkRole(DASHBOARD_ROLES),
  asyncHandler(async (req: Request, res: Response) => {
    const { widgetId } = req.params;
    const role = req.user!.role as Role;
    const userId = req.user!.id;

    // Проверяем что виджет существует и доступен роли
    const widget = WIDGET_CATALOGUE.find(w => w.id === widgetId);
    if (!widget) {
      return res.status(404).json({ error: "Виджет не найден" });
    }
    if (!widget.allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Нет доступа к этому виджету" });
    }

    const filters = req.query as Record<string, unknown>;
    const data = await dashboardWidgetService.getWidgetData(widgetId, {
      role,
      userId,
      employeeId: req.user!.employeeId,
      filters,
    });

    return res.json(data);
  })
);

export default router;
