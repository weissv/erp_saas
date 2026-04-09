// src/routes/parents.routes.ts
import { Router } from "express";
import { checkRole } from "../middleware/checkRole";
import { ParentService } from "../services/ParentService";

const router = Router();

// GET /api/parents/child/:childId — родители конкретного ребёнка
router.get(
  "/child/:childId",
  checkRole(["DEPUTY", "ADMIN", "TEACHER"]),
  async (req, res) => {
    const childId = Number(req.params.childId);
    const parents = await ParentService.findByChildId(childId);
    return res.json(parents);
  }
);

// POST /api/parents — создать родителя
router.post(
  "/",
  checkRole(["DEPUTY", "ADMIN"]),
  async (req, res) => {
    const parent = await ParentService.create(req.body);
    return res.status(201).json(parent);
  }
);

// PUT /api/parents/:id — обновить родителя
router.put(
  "/:id",
  checkRole(["DEPUTY", "ADMIN"]),
  async (req, res) => {
    const parent = await ParentService.update(Number(req.params.id), req.body);
    return res.json(parent);
  }
);

// DELETE /api/parents/:id — удалить родителя
router.delete(
  "/:id",
  checkRole(["ADMIN"]),
  async (req, res) => {
    await ParentService.delete(Number(req.params.id));
    return res.status(204).send();
  }
);

export default router;
