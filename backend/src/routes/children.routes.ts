// src/routes/children.routes.ts
// Thin controller — вся бизнес-логика в ChildService
import { Router } from "express";
import { checkRole } from "../middleware/checkRole";
import { logAction } from "../middleware/actionLogger";
import { validate } from "../middleware/validate";
import {
  createChildSchema,
  updateChildSchema,
  createAbsenceSchema,
  updateAbsenceSchema,
  childListQuerySchema,
} from "../schemas/child.schema";
import { ChildService } from "../services/ChildService";

const router = Router();

// ======== Child CRUD ========

// GET /api/children — список с фильтрами, поиском, пагинацией
router.get(
  "/",
  checkRole(["DEPUTY", "ADMIN", "TEACHER", "ACCOUNTANT"]),
  validate(childListQuerySchema),
  async (req, res) => {
    const { page, pageSize, sortBy, sortOrder, status, groupId, search, gender } = req.query as Record<string, string | undefined>;
    const result = await ChildService.findMany({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortBy,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      status,
      groupId: groupId ? Number(groupId) : undefined,
      search,
      gender,
    });
    return res.json(result);
  }
);

// GET /api/children/:id — детальный профиль ребёнка
router.get(
  "/:id",
  checkRole(["DEPUTY", "ADMIN", "TEACHER", "ACCOUNTANT"]),
  async (req, res) => {
    const child = await ChildService.findById(Number(req.params.id));
    return res.json(child);
  }
);

// POST /api/children — создать ребёнка
router.post(
  "/",
  checkRole(["DEPUTY", "ADMIN"]),
  validate(createChildSchema),
  logAction("CREATE_CHILD", (req) => ({ body: req.body })),
  async (req, res) => {
    const child = await ChildService.create(req.body);
    return res.status(201).json(child);
  }
);

// PUT /api/children/:id — обновить ребёнка
router.put(
  "/:id",
  checkRole(["DEPUTY", "ADMIN"]),
  validate(updateChildSchema),
  logAction("UPDATE_CHILD", (req) => ({ id: req.params.id, body: req.body })),
  async (req, res) => {
    const child = await ChildService.update(Number(req.params.id), req.body);
    return res.json(child);
  }
);

// PUT /api/children/:id/archive — архивировать (soft-delete)
router.put(
  "/:id/archive",
  checkRole(["DEPUTY", "ADMIN"]),
  logAction("ARCHIVE_CHILD", (req) => ({ id: req.params.id })),
  async (req, res) => {
    await ChildService.archive(Number(req.params.id));
    return res.status(204).send();
  }
);

// DELETE /api/children/:id — полное удаление (только админ)
router.delete(
  "/:id",
  checkRole(["ADMIN"]),
  logAction("DELETE_CHILD", (req) => ({ id: req.params.id })),
  async (req, res) => {
    await ChildService.delete(Number(req.params.id));
    return res.status(204).send();
  }
);

// ======== TemporaryAbsence CRUD ========

// GET /api/children/:id/absences
router.get(
  "/:id/absences",
  checkRole(["DEPUTY", "ADMIN", "TEACHER"]),
  async (req, res) => {
    const absences = await ChildService.getAbsences(Number(req.params.id));
    return res.json(absences);
  }
);

// POST /api/children/:id/absences
router.post(
  "/:id/absences",
  checkRole(["DEPUTY", "ADMIN"]),
  validate(createAbsenceSchema),
  async (req, res) => {
    const absence = await ChildService.addAbsence(Number(req.params.id), req.body);
    return res.status(201).json(absence);
  }
);

// PUT /api/children/absences/:absenceId
router.put(
  "/absences/:absenceId",
  checkRole(["DEPUTY", "ADMIN"]),
  validate(updateAbsenceSchema),
  async (req, res) => {
    const absence = await ChildService.updateAbsence(Number(req.params.absenceId), req.body);
    return res.json(absence);
  }
);

// DELETE /api/children/absences/:absenceId
router.delete(
  "/absences/:absenceId",
  checkRole(["ADMIN"]),
  async (req, res) => {
    await ChildService.deleteAbsence(Number(req.params.absenceId));
    return res.status(204).send();
  }
);

export default router;
