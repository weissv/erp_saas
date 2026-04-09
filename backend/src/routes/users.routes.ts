// src/routes/users.routes.ts
import { Router } from "express";
import { checkRole } from "../middleware/checkRole";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../middleware/errorHandler";
import { createUserSchema, updateUserSchema, userIdParamsSchema } from "../schemas/user.schema";
import { userService } from "../services/UserService";
import type { Role } from "@prisma/client";

const router = Router();

// GET /api/users/employees/available - Сотрудники без привязанных пользователей
router.get(
  "/employees/available",
  checkRole(["ADMIN"]),
  asyncHandler(async (_req, res) => {
    const employees = await userService.listAvailableEmployees();
    return res.json(employees);
  })
);

// GET /api/users - Список всех пользователей
router.get(
  "/",
  checkRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const result = await userService.findMany({
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
      sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
      role: typeof req.query.role === 'string' ? (req.query.role as Role) : undefined,
      status: typeof req.query.status === 'string' ? (req.query.status as 'ACTIVE' | 'INACTIVE' | 'ALL') : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
    });

    return res.json(result);
  })
);

// GET /api/users/:id - Получить пользователя по ID
router.get(
  "/:id",
  checkRole(["ADMIN"]),
  validate(userIdParamsSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.findById(Number(req.params.id));
    return res.json(user);
  })
);

// POST /api/users - Создать нового пользователя
router.post(
  "/",
  checkRole(["ADMIN"]),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.create(req.body, req.user);
    return res.status(201).json(user);
  })
);

// PUT /api/users/:id - Обновить данные пользователя
router.put(
  "/:id",
  checkRole(["ADMIN"]),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.update(Number(req.params.id), req.body, req.user);
    return res.json(user);
  })
);

// POST /api/users/:id/restore - Восстановить деактивированного пользователя
router.post(
  "/:id/restore",
  checkRole(["ADMIN"]),
  validate(userIdParamsSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.restore(Number(req.params.id), req.user!);
    return res.json(user);
  })
);

// DELETE /api/users/:id - Деактивировать пользователя
router.delete(
  "/:id",
  checkRole(["ADMIN"]),
  validate(userIdParamsSchema),
  asyncHandler(async (req, res) => {
    await userService.softDelete(Number(req.params.id), req.user!);
    return res.status(204).send();
  })
);

export default router;
