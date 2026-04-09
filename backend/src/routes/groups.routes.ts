// src/routes/groups.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";

const router = Router();

// GET /api/groups
router.get("/", checkRole(["DEPUTY", "ADMIN", "TEACHER", "ACCOUNTANT"]), async (req, res) => {
  const groups = await prisma.group.findMany({
    include: {
      _count: {
        select: { children: true }
      },
      teacher: {
        select: { id: true, firstName: true, lastName: true }
      }
    },
    orderBy: [{ grade: 'asc' }, { name: 'asc' }]
  });
  
  // Сортировка по номеру класса (1 класс, 2 класс, ... 11 класс)
  groups.sort((a, b) => {
    // Сначала сортируем по grade, если есть
    if (a.grade !== null && b.grade !== null) {
      return a.grade - b.grade;
    }
    // Если grade нет, парсим из названия
    const numA = parseInt(a.name.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.name.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });
  
  return res.json(groups);
});

// POST /api/groups - создать класс
router.post("/", checkRole(["ADMIN"]), async (req, res) => {
  const { name, grade, academicYear, teacherId, capacity, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: "Название обязательно" });
  }
  
  const group = await prisma.group.create({
    data: { 
      name,
      grade: grade ?? null,
      academicYear: academicYear ?? null,
      teacherId: teacherId ?? null,
      capacity: capacity ?? 30,
      description: description ?? null
    },
    include: {
      teacher: {
        select: { id: true, firstName: true, lastName: true }
      }
    }
  });
  
  return res.status(201).json(group);
});

// PUT /api/groups/:id - обновить класс
router.put("/:id", checkRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { name, grade, academicYear, teacherId, capacity, description } = req.body;
  
  const group = await prisma.group.update({
    where: { id: Number(id) },
    data: { 
      ...(name !== undefined && { name }),
      ...(grade !== undefined && { grade }),
      ...(academicYear !== undefined && { academicYear }),
      ...(teacherId !== undefined && { teacherId }),
      ...(capacity !== undefined && { capacity }),
      ...(description !== undefined && { description })
    },
    include: {
      teacher: {
        select: { id: true, firstName: true, lastName: true }
      }
    }
  });
  
  return res.json(group);
});

// DELETE /api/groups/:id - удалить класс
router.delete("/:id", checkRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  
  // Проверяем, есть ли дети в этом классе
  const childrenCount = await prisma.child.count({
    where: { groupId: Number(id) }
  });
  
  if (childrenCount > 0) {
    return res.status(400).json({ 
      error: `В этом классе ${childrenCount} детей. Сначала переведите их в другой класс.` 
    });
  }
  
  await prisma.group.delete({
    where: { id: Number(id) }
  });
  
  return res.status(204).send();
});

export default router;
