import { Router, Request, Response } from "express";
import { Role } from "@prisma/client";
import { checkRole } from "../middleware/checkRole";
import { asyncHandler } from "../middleware/errorHandler";
import { permissionService } from "../services/PermissionService";

const router = Router();

// Получить все права ролей
router.get(
  "/",
  checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN"]),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await permissionService.list(req.user?.role || '');
    return res.json(result);
  })
);

// Получить права конкретной роли
// Пользователь может получить свои собственные права или права других ролей (если он админ)
router.get(
  "/:role",
  asyncHandler(async (req: Request, res: Response) => {
    const permission = await permissionService.get(req.params.role as Role, req.user?.role);
    return res.json(permission);
  })
);

// Обновить права роли
router.put(
  "/:role",
  checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY"]),
  asyncHandler(async (req: Request, res: Response) => {
    const permission = await permissionService.update(req.params.role as Role, req.user!, req.body);
    return res.json(permission);
  })
);

// Получить список всех доступных модулей
router.get(
  "/meta/modules",
  checkRole(["DEVELOPER", "DIRECTOR", "DEPUTY", "ADMIN"]),
  asyncHandler(async (_req: Request, res: Response) => {
    const modules = permissionService.getModules().map((moduleId) => ({ id: moduleId, label: moduleId }));
    return res.json(modules);
  })
);

export default router;
