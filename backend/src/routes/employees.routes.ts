// src/routes/employees.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { buildPagination, buildOrderBy, buildWhere } from "../utils/query";
import bcrypt from "bcryptjs";
import { validate } from "../middleware/validate";
import { createEmployeeSchema, updateEmployeeSchema } from "../schemas/employee.schema";
const router = Router();

router.get("/", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const { skip, take } = buildPagination(req.query);
  const orderBy = buildOrderBy(req.query, [
    "id",
    "firstName",
    "lastName",
    "position",
    "hireDate",
    "rate",
    "createdAt",
  ]);
  const where = buildWhere<any>(req.query, ["position", "lastName"]);
  const [items, total] = await Promise.all([
    prisma.employee.findMany({ where, skip, take, orderBy, include: { user: true } }),
    prisma.employee.count({ where }),
  ]);
  return res.json({ items, total });
});

router.post("/", checkRole(["DEPUTY", "ADMIN"]), validate(createEmployeeSchema), async (req, res) => {
  const { body } = req as any;
  const { user, ...employee } = body;
  const created = await prisma.$transaction(async (tx: any) => {
    const emp = await tx.employee.create({ data: employee });
    let usr = null;
    if (user) {
      usr = await tx.user.create({
        data: {
          email: user.email,
          passwordHash: await (await import("bcryptjs")).hash(user.password, 10),
          role: user.role,
          employeeId: emp.id,
        },
      });
    }
    return { emp, usr };
  });
  return res.status(201).json(created);
});

// TODO: При увольнении (fireDate): деактивировать User, открепить от Club, записать в ActionLog.
router.put("/:id", checkRole(["DEPUTY", "ADMIN"]), validate(updateEmployeeSchema), async (req, res) => {
  const id = Number(req.params.id);
  const updated = await prisma.employee.update({ where: { id }, data: req.body });
  return res.json(updated);
});

// DELETE /api/employees/:id - удаление сотрудника
router.delete("/:id", checkRole(["ADMIN"]), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid employee id" });
  }

  try {
    // Сначала удаляем связанного пользователя, если есть
    await prisma.user.deleteMany({ where: { employeeId: id } });
    // Затем удаляем сотрудника
    await prisma.employee.delete({ where: { id } });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(204).send();
    }
    throw error;
  }

  return res.status(204).send();
});

// GET /api/employees/reminders - напоминания о медосмотрах и аттестации
router.get("/reminders", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const { days = 30 } = req.query;
  const futureDate = new Date(Date.now() + Number(days) * 24 * 3600 * 1000);
  
  const [medicalCheckups, attestations] = await Promise.all([
    // Сотрудники, которым скоро нужен медосмотр
    prisma.employee.findMany({
      where: {
        fireDate: null,
        medicalCheckupDate: {
          lte: futureDate,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        medicalCheckupDate: true,
      },
      orderBy: { medicalCheckupDate: "asc" },
    }),
    
    // Сотрудники, которым скоро нужна аттестация
    prisma.employee.findMany({
      where: {
        fireDate: null,
        attestationDate: {
          lte: futureDate,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        attestationDate: true,
      },
      orderBy: { attestationDate: "asc" },
    }),
  ]);
  
  return res.json({
    medicalCheckups: medicalCheckups.map((e: any) => ({
      ...e,
      daysUntil: Math.ceil((new Date(e.medicalCheckupDate!).getTime() - Date.now()) / (24 * 3600 * 1000)),
    })),
    attestations: attestations.map((e: any) => ({
      ...e,
      daysUntil: Math.ceil((new Date(e.attestationDate!).getTime() - Date.now()) / (24 * 3600 * 1000)),
    })),
  });
});

export default router;
