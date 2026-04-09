// src/routes/notifications.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { validate } from "../middleware/validate";
import { createNotificationSchema, updateNotificationSchema } from "../schemas/notification.schema";
import { Role } from "@prisma/client";

const router = Router();

// GET /api/notifications
router.get("/", checkRole(["DEPUTY", "ADMIN"]), async (_req, res) => {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringContracts = await prisma.employee.findMany({
    where: {
      contractEndDate: {
        lte: thirtyDaysFromNow,
        gte: new Date(), // Только будущие или текущие даты
      },
      fireDate: null,
    },
  });

  const expiringMedicalCheckups = await prisma.employee.findMany({
    where: {
      medicalCheckupDate: {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      },
      fireDate: null,
    },
  });

  const notifications = [
    ...expiringContracts.map(emp => ({
      type: 'CONTRACT_EXPIRING',
      message: `У сотрудника ${emp.lastName} ${emp.firstName} истекает контракт ${emp.contractEndDate?.toLocaleDateString()}.`,
      employeeId: emp.id,
      date: emp.contractEndDate,
    })),
    ...expiringMedicalCheckups.map(emp => ({
      type: 'MEDICAL_CHECKUP_DUE',
      message: `У сотрудника ${emp.lastName} ${emp.firstName} истекает срок медосмотра ${emp.medicalCheckupDate?.toLocaleDateString()}.`,
      employeeId: emp.id,
      date: emp.medicalCheckupDate,
    })),
  ];

  // Сортируем по дате
  notifications.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  return res.json(notifications);
});

// --- Массовые уведомления / объявления ---

router.get(
  "/broadcasts",
  checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT", "TEACHER"]),
  async (req, res) => {
    const { targetRole, groupId } = req.query;
    const isTeacher = req.user!.role === "TEACHER";

    const where: any = isTeacher
      ? {
          OR: [{ targetRole: null }, { targetRole: "TEACHER" }],
        }
      : {
          ...(targetRole ? { targetRole: targetRole as Role } : {}),
          ...(groupId ? { targetGroupId: Number(groupId) } : {}),
        };

    const broadcasts = await prisma.notification.findMany({
      where,
      include: {
        targetGroup: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(broadcasts);
  }
);

router.post(
  "/broadcasts",
  checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]),
  validate(createNotificationSchema),
  async (req, res) => {
    const { title, content, targetRole, targetGroupId } = req.body;

    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        targetRole: targetRole ?? null,
        targetGroupId: targetGroupId ?? null,
      },
      include: {
        targetGroup: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(notification);
  }
);

router.put(
  "/broadcasts/:id",
  checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]),
  validate(updateNotificationSchema),
  async (req, res) => {
    const { id } = req.params;
    const { title, content, targetRole, targetGroupId } = req.body;

    const notification = await prisma.notification.update({
      where: { id: Number(id) },
      data: {
        ...(title ? { title } : {}),
        ...(content ? { content } : {}),
        targetRole: targetRole === undefined ? undefined : targetRole ?? null,
        targetGroupId: targetGroupId === undefined ? undefined : targetGroupId ?? null,
      },
      include: {
        targetGroup: { select: { id: true, name: true } },
      },
    });

    return res.json(notification);
  }
);

router.delete(
  "/broadcasts/:id",
  checkRole(["ADMIN"]),
  async (req, res) => {
    const { id } = req.params;
    await prisma.notification.delete({ where: { id: Number(id) } });
    return res.status(204).send();
  }
);

export default router;
