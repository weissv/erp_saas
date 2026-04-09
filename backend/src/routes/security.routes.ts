// src/routes/security.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { validate } from "../middleware/validate";
import { createSecurityLogSchema } from "../schemas/security.schema";

const router = Router();

router.get("/", checkRole(["DEPUTY", "ADMIN", "ZAVHOZ"]), async (_req, res) => {
  const items = await prisma.securityLog.findMany({ orderBy: { date: "desc" } });
  res.json(items);
});

router.post("/", checkRole(["DEPUTY", "ADMIN", "ZAVHOZ"]), validate(createSecurityLogSchema), async (req, res) => {
  const created = await prisma.securityLog.create({ data: req.body });
  res.status(201).json(created);
});

// PUT /api/security/:id
router.put("/:id", checkRole(["DEPUTY", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  const { eventType, description, date, documentUrl } = req.body;
  try {
    const updated = await prisma.securityLog.update({
      where: { id },
      data: {
        eventType,
        description,
        date: date ? new Date(date) : undefined,
        documentUrl,
      },
    });
    return res.json(updated);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Record not found" });
    }
    throw error;
  }
});

// DELETE /api/security/:id
router.delete("/:id", checkRole(["ADMIN"]), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  try {
    await prisma.securityLog.delete({ where: { id } });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(204).send();
    }
    throw error;
  }
  return res.status(204).send();
});

export default router;
