// src/routes/clubs.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { validate } from "../middleware/validate";
import { createClubSchema, enrollClubSchema } from "../schemas/club.schema";

const router = Router();

// GET /api/clubs
router.get("/", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT", "TEACHER"]), async (req, res) => {
  const isTeacher = req.user!.role === "TEACHER";
  const where = isTeacher ? { teacherId: req.user!.employeeId } : {};
  const clubs = await prisma.club.findMany({ where, include: { teacher: true } });
  return res.json(clubs);
});

// GET /api/clubs/:id
router.get("/:id", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT", "TEACHER"]), async (req, res) => {
  const id = Number(req.params.id);
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) return res.status(404).json({ message: "Not found" });
  if (req.user!.role === "TEACHER" && club.teacherId !== req.user!.employeeId) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return res.json(club);
});
router.post("/", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), validate(createClubSchema), async (req, res) => {
  const club = await prisma.club.create({ data: req.body });
  res.status(201).json(club);
});

// DELETE /api/clubs/:id - удаление кружка
router.delete("/:id", checkRole(["ADMIN"]), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }
  try {
    // Удаляем связанные записи
    await prisma.clubEnrollment.deleteMany({ where: { clubId: id } });
    await prisma.clubRating.deleteMany({ where: { clubId: id } });
    await prisma.attendance.deleteMany({ where: { clubId: id } });
    await prisma.club.delete({ where: { id } });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(204).send();
    }
    throw error;
  }
  return res.status(204).send();
});

router.post("/:id/enroll", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), validate(enrollClubSchema), async (req, res) => {  const clubId = Number(req.params.id);
  const { childId } = req.body as { childId: number };
  // Валидация вместимости
  const [club, activeCount] = await Promise.all([
    prisma.club.findUnique({ where: { id: clubId } }),
    prisma.clubEnrollment.count({ where: { clubId, status: "ACTIVE" } }),
  ]);
  if (!club) return res.status(404).json({ message: "Club not found" });
  if (activeCount >= club.maxStudents) {
    // Добавляем в лист ожидания, если заполнено
    const enrollment = await prisma.clubEnrollment.upsert({
      where: { childId_clubId: { childId, clubId } },
      update: { status: "WAITING_LIST" },
      create: { childId, clubId, status: "WAITING_LIST" },
    });
    return res.status(201).json({ enrollment, message: "Added to waiting list" });
  }
  const enrollment = await prisma.clubEnrollment.upsert({
    where: { childId_clubId: { childId, clubId } },
    update: { status: "ACTIVE" },
    create: { childId, clubId, status: "ACTIVE" },
  });
  return res.status(201).json({ enrollment, message: "Enrolled" });
});

// --- ClubRating CRUD ---

// GET /api/clubs/:id/ratings - получить оценки кружка
router.get("/:id/ratings", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER"]), async (req, res) => {
  const { id } = req.params;
  
  const ratings = await prisma.clubRating.findMany({
    where: { clubId: Number(id) },
    include: {
      child: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { rating: "desc" },
  });
  
  // Средняя оценка
  const avgRating = ratings.length > 0
    ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
    : 0;
  
  return res.json({
    ratings,
    average: Math.round(avgRating * 10) / 10,
    count: ratings.length,
  });
});

// POST /api/clubs/:id/ratings - добавить оценку кружку
router.post("/:id/ratings", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { childId, rating, comment } = req.body;
  
  // Проверяем, что ребенок записан в кружок
  const enrollment = await prisma.clubEnrollment.findUnique({
    where: {
      childId_clubId: {
        childId: Number(childId),
        clubId: Number(id),
      },
    },
  });
  
  if (!enrollment) {
    return res.status(400).json({ error: "Child is not enrolled in this club" });
  }
  
  const clubRating = await prisma.clubRating.upsert({
    where: {
      clubId_childId: {
        clubId: Number(id),
        childId: Number(childId),
      },
    },
    update: { rating, comment: comment || null },
    create: {
      clubId: Number(id),
      childId: Number(childId),
      rating,
      comment: comment || null,
    },
  });
  
  return res.status(201).json(clubRating);
});

// DELETE /api/clubs/ratings/:ratingId - удалить оценку
router.delete("/ratings/:ratingId", checkRole(["ADMIN"]), async (req, res) => {
  const { ratingId } = req.params;
  await prisma.clubRating.delete({ where: { id: Number(ratingId) } });
  return res.status(204).send();
});

// GET /api/clubs/:id/reports - отчет по кружку (посещаемость + финансы)
router.get("/:id/reports", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER", "ACCOUNTANT"]), async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;
  
  const club = await prisma.club.findUnique({
    where: { id: Number(id) },
    include: {
      teacher: { select: { firstName: true, lastName: true } },
    },
  });
  
  if (!club) {
    return res.status(404).json({ error: "Club not found" });
  }
  
  // Проверка прав для учителя
  if (req.user!.role === "TEACHER" && club.teacherId !== req.user!.employeeId) {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  const where: any = {};
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(String(startDate));
    if (endDate) where.date.lte = new Date(String(endDate));
  }
  
  const [enrollments, attendance, finances] = await Promise.all([
    // Записи на кружок
    prisma.clubEnrollment.findMany({
      where: { clubId: Number(id) },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    
    // Посещаемость (из общей таблицы Attendance)
    // TODO: может потребоваться отдельная модель ClubAttendance
    prisma.attendance.count({
      where: {
        ...where,
        child: {
          enrollments: {
            some: {
              clubId: Number(id),
              status: "ACTIVE",
            },
          },
        },
        isPresent: true,
      },
    }),
    
    // Финансовые транзакции по кружку
    prisma.financeTransaction.findMany({
      where: {
        ...where,
        clubId: Number(id),
      },
    }),
  ]);
  
  const totalIncome = finances
    .filter((f: any) => f.type === "INCOME")
    .reduce((sum: number, f: any) => sum + Number(f.amount), 0);
  
  const totalExpense = finances
    .filter((f: any) => f.type === "EXPENSE")
    .reduce((sum: number, f: any) => sum + Number(f.amount), 0);
  
  return res.json({
    club: {
      id: club.id,
      name: club.name,
      teacher: `${club.teacher.firstName} ${club.teacher.lastName}`,
      maxStudents: club.maxStudents,
    },
    enrollments: {
      active: enrollments.filter((e: any) => e.status === "ACTIVE").length,
      waiting: enrollments.filter((e: any) => e.status === "WAITING_LIST").length,
      total: enrollments.length,
    },
    attendance: {
      totalPresent: attendance,
    },
    finances: {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
    },
  });
});

// Алиас для совместимости с фронтендом (единственное число)
router.get("/:id/report", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER", "ACCOUNTANT"]), async (req, res, next) => {
  // Перенаправляем на основной эндпоинт
  req.url = req.url.replace('/report', '/reports');
  next();
}, async (req, res) => {
  // Основной обработчик уже вызовется через next()
});

export default router;
