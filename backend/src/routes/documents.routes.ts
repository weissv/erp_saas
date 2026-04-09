// src/routes/documents.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";

const router = Router();

// GET /api/documents - List all documents (filter by employeeId or childId)
router.get("/", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const { employeeId, childId } = req.query;
  
  const documents = await prisma.document.findMany({
    where: {
      ...(employeeId ? { employeeId: Number(employeeId) } : {}),
      ...(childId ? { childId: Number(childId) } : {}),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
      child: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  
  return res.json(documents);
});

// POST /api/documents - Create new document
router.post("/", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const { name, fileUrl, templateId, employeeId, childId } = req.body;
  
  const document = await prisma.document.create({
    data: {
      name,
      fileUrl,
      templateId: templateId || null,
      employeeId: employeeId || null,
      childId: childId || null,
    },
    include: {
      template: true,
      employee: { select: { id: true, firstName: true, lastName: true } },
      child: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  
  return res.status(201).json(document);
});

// PUT /api/documents/:id - Update document
router.put("/:id", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { name, fileUrl } = req.body;
  
  const document = await prisma.document.update({
    where: { id: Number(id) },
    data: { name, fileUrl },
    include: {
      template: true,
      employee: { select: { id: true, firstName: true, lastName: true } },
      child: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  
  return res.json(document);
});

// DELETE /api/documents/:id - Delete document
router.delete("/:id", checkRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  
  await prisma.document.delete({
    where: { id: Number(id) },
  });
  
  return res.status(204).send();
});

// --- DocumentTemplate CRUD ---

// GET /api/documents/templates - List all templates
router.get("/templates", checkRole(["DEPUTY", "ADMIN"]), async (_req, res) => {
  const templates = await prisma.documentTemplate.findMany({
    orderBy: { name: "asc" },
  });
  
  return res.json(templates);
});

// POST /api/documents/templates - Create new template
router.post("/templates", checkRole(["ADMIN"]), async (req, res) => {
  const { name, content } = req.body;
  
  const template = await prisma.documentTemplate.create({
    data: { name, content },
  });
  
  return res.status(201).json(template);
});

// PUT /api/documents/templates/:id - Update template
router.put("/templates/:id", checkRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { name, content } = req.body;
  
  const template = await prisma.documentTemplate.update({
    where: { id: Number(id) },
    data: { name, content },
  });
  
  return res.json(template);
});

// DELETE /api/documents/templates/:id - Delete template
router.delete("/templates/:id", checkRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  
  await prisma.documentTemplate.delete({
    where: { id: Number(id) },
  });
  
  return res.status(204).send();
});

export default router;
