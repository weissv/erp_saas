// src/routes/lms-school.routes.ts
// Школьные маршруты LMS: классы, расписание, журнал, домашние задания
import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma";

const router = Router();

const ADMIN_ROLES = ["ADMIN", "DIRECTOR", "DEPUTY"] as const;
const TEACHING_ROLES = [...ADMIN_ROLES, "TEACHER"] as const;

const classSchema = z.object({
  name: z.string().min(1),
  grade: z.number().int().min(1).max(11).optional().nullable(),
  academicYear: z.string().min(4).optional().nullable(),
  teacherId: z.number().int().optional().nullable(),
  capacity: z.number().int().positive().default(30),
  description: z.string().optional().nullable(),
});

const subjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  grade: z.number().int().min(1).max(11).optional(),
  hoursPerWeek: z.number().int().positive().optional(),
});

const scheduleSchema = z.object({
  classId: z.number().int().positive(), // Group id (Int)
  subjectId: z.string().cuid(),
  teacherId: z.number().int().optional(),
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().min(4),
  endTime: z.string().min(4),
  room: z.string().optional(),
});

const gradeSchema = z.object({
  studentId: z.string().cuid(),
  subjectId: z.string().cuid(),
  classId: z.number().int().positive(), // Group id (Int)
  value: z.number().int().min(1).max(100),
  gradeType: z.string().optional(),
  maxValue: z.number().int().min(1).optional(),
  date: z.coerce.date(),
  comment: z.string().optional(),
});

const gradeUpdateSchema = z.object({
  value: z.number().int().min(1).max(100).optional(),
  gradeType: z.string().optional(),
  maxValue: z.number().int().min(1).optional(),
  date: z.coerce.date().optional(),
  comment: z.string().optional(),
});

const homeworkSchema = z.object({
  classId: z.number().int().positive(), // Group id (Int)
  subjectId: z.string().cuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
  maxPoints: z.number().int().positive().optional(),
});

const attendanceRecordSchema = z.object({
  studentId: z.string().cuid(),
  status: z.string().min(1),
  note: z.string().optional(),
});

const attendanceBulkSchema = z.object({
  date: z.coerce.date(),
  classId: z.number().int().positive(), // Group id (Int)
  records: z.array(attendanceRecordSchema).min(1),
});

const gradeSubmissionSchema = z.object({
  points: z.number().int().nonnegative().optional(),
  feedback: z.string().optional(),
});

const validate = <T>(schema: z.Schema<T>, payload: unknown, res: Response): T | null => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    res.status(400).json({
      error: "Validation failed",
      details: result.error.flatten().fieldErrors,
    });
    return null;
  }
  return result.data;
};

const ensureRole = (req: Request, res: Response, roles: readonly string[]) => {
  if (!roles.includes(req.user?.role || "")) {
    res.status(403).json({ error: "Not authorized" });
    return false;
  }
  return true;
};

// ============================================================================
// КЛАССЫ (используем Group из ERP)
// ============================================================================

// Получить все классы
router.get("/classes", async (req: Request, res: Response) => {
  try {
    const { academicYear, grade, isActive } = req.query;

    const where: any = {};
    if (academicYear) where.academicYear = academicYear as string;
    if (grade) where.grade = parseInt(grade as string);
    if (isActive === "true") {
      where.children = { some: { status: "ACTIVE" } };
    }

    const classes = await prisma.group.findMany({
      where,
      include: {
        _count: {
          select: { 
            children: true,
            lmsStudents: true,
          },
        },
      },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    });

    // Получаем классных руководителей
    const teacherIds = classes.map(c => c.teacherId).filter((id): id is number => id !== null);
    const teachers = teacherIds.length > 0 
      ? await prisma.employee.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const teacherMap = Object.fromEntries(teachers.map(t => [t.id, t]));

    const result = classes.map(c => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      academicYear: c.academicYear,
      teacherId: c.teacherId,
      capacity: c.capacity,
      description: c.description,
      studentsCount: c._count.children,
      lmsStudentsCount: c._count.lmsStudents,
      teacher: c.teacherId ? teacherMap[c.teacherId] : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Получить класс по ID
router.get("/classes/:id", async (req: Request, res: Response) => {
  try {
    const classId = parseInt(req.params.id);
    if (isNaN(classId)) {
      return res.status(400).json({ error: "Invalid class ID" });
    }

    const schoolClass = await prisma.group.findUnique({
      where: { id: classId },
      include: {
        children: {
          select: { id: true, firstName: true, lastName: true, birthDate: true, status: true },
        },
        lmsStudents: {
          where: { status: "active" },
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, birthDate: true },
            },
          },
        },
      },
    });

    if (!schoolClass) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Получить классного руководителя
    let teacher = null;
    if (schoolClass.teacherId) {
      teacher = await prisma.employee.findUnique({
        where: { id: schoolClass.teacherId },
        select: { id: true, firstName: true, lastName: true },
      });
    }

    res.json({
      ...schoolClass,
      teacher,
      studentsCount: schoolClass.children.length,
    });
  } catch (error) {
    console.error("Error fetching class:", error);
    res.status(500).json({ error: "Failed to fetch class" });
  }
});

// Создать класс
router.post("/classes", async (req: Request, res: Response) => {
  try {
    if (!ensureRole(req, res, ADMIN_ROLES)) return;
    const payload = validate(classSchema, req.body, res);
    if (!payload) return;

    const schoolClass = await prisma.group.create({ data: payload });

    res.status(201).json(schoolClass);
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// Обновить класс
router.put("/classes/:id", async (req: Request, res: Response) => {
  try {
    const classId = parseInt(req.params.id);
    if (isNaN(classId)) {
      return res.status(400).json({ error: "Invalid class ID" });
    }
    if (!ensureRole(req, res, ADMIN_ROLES)) return;
    const payload = validate(classSchema.partial(), req.body, res);
    if (!payload) return;

    const schoolClass = await prisma.group.update({
      where: { id: classId },
      data: payload,
    });

    res.json(schoolClass);
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(500).json({ error: "Failed to update class" });
  }
});

// Удалить класс
router.delete("/classes/:id", async (req: Request, res: Response) => {
  try {
    const classId = parseInt(req.params.id);
    if (isNaN(classId)) {
      return res.status(400).json({ error: "Invalid class ID" });
    }
    const userRole = req.user?.role;

    if (!["ADMIN", "DIRECTOR", "DEPUTY"].includes(userRole || "")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Проверяем, есть ли дети в классе
    const childrenCount = await prisma.child.count({ where: { groupId: classId } });
    if (childrenCount > 0) {
      return res.status(400).json({ 
        error: `В этом классе ${childrenCount} детей. Сначала переведите их в другой класс.` 
      });
    }

    await prisma.group.delete({ where: { id: classId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting class:", error);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

// ============================================================================
// УЧЕНИКИ
// ============================================================================

// Получить учеников класса (синхронизировано с ERP)
router.get("/classes/:classId/students", async (req: Request, res: Response) => {
  try {
    const classId = parseInt(req.params.classId);
    if (isNaN(classId)) {
      return res.status(400).json({ error: "Invalid class ID" });
    }

    // Получаем детей напрямую из ERP (таблица Child)
    const children = await prisma.child.findMany({
      where: { 
        groupId: classId,
        status: "ACTIVE"
      },
      orderBy: { lastName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
      }
    });

    // Получаем существующие LmsSchoolStudent записи
    const lmsStudents = await prisma.lmsSchoolStudent.findMany({
      where: { classId, status: "active" },
      select: { id: true, studentId: true }
    });
    const lmsStudentMap = new Map(lmsStudents.map(s => [s.studentId, s.id]));

    // Создаём LmsSchoolStudent записи для детей, у которых их ещё нет
    const newLmsStudents = [];
    for (const child of children) {
      if (!lmsStudentMap.has(child.id)) {
        const newStudent = await prisma.lmsSchoolStudent.create({
          data: {
            studentId: child.id,
            classId,
            status: "active"
          }
        });
        lmsStudentMap.set(child.id, newStudent.id);
        newLmsStudents.push(newStudent);
      }
    }

    // Возвращаем учеников в формате LmsSchoolStudent
    const result = children.map(child => ({
      id: lmsStudentMap.get(child.id),
      studentId: child.id,
      classId,
      enrollmentDate: new Date().toISOString(),
      status: "active",
      student: {
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate
      }
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// Добавить ученика в класс
router.post("/students", async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role;
    if (!["ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"].includes(userRole || "")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { studentId, classId } = req.body;

    const schoolStudent = await prisma.lmsSchoolStudent.create({
      data: {
        studentId,
        classId: typeof classId === "string" ? parseInt(classId) : classId,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    res.status(201).json(schoolStudent);
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({ error: "Failed to create student" });
  }
});

// Обновить статус ученика
router.put("/students/:id", async (req: Request, res: Response) => {
  try {
    const studentId = req.params.id;
    const userRole = req.user?.role;

    if (!["ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"].includes(userRole || "")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { classId, status } = req.body;

    const student = await prisma.lmsSchoolStudent.update({
      where: { id: studentId },
      data: { 
        classId: classId ? (typeof classId === "string" ? parseInt(classId) : classId) : undefined,
        status 
      },
    });

    res.json(student);
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ error: "Failed to update student" });
  }
});

// Удалить ученика из класса
router.delete("/students/:id", async (req: Request, res: Response) => {
  try {
    const studentId = req.params.id;
    const userRole = req.user?.role;

    if (!["ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"].includes(userRole || "")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.lmsSchoolStudent.delete({ where: { id: studentId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

// ============================================================================
// ПРЕДМЕТЫ (синхронизировано с ERP Subject)
// ============================================================================

// Получить все предметы (из ERP)
router.get("/subjects", async (req: Request, res: Response) => {
  try {
    // Получаем ERP Subject и синхронизируем с LmsSubject
    const erpSubjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
    });

    // Синхронизируем LmsSubject с ERP Subject
    const lmsSubjects = await Promise.all(
      erpSubjects.map(async (erpSubject) => {
        // Ищем существующий LmsSubject по erpSubjectId
        let lmsSubject = await prisma.lmsSubject.findUnique({
          where: { erpSubjectId: erpSubject.id },
        });

        if (!lmsSubject) {
          // Создаём новый LmsSubject
          lmsSubject = await prisma.lmsSubject.create({
            data: {
              erpSubjectId: erpSubject.id,
              name: erpSubject.name,
              description: null,
              grade: null,
              hoursPerWeek: 1,
            },
          });
        } else if (lmsSubject.name !== erpSubject.name) {
          // Обновляем название если изменилось
          lmsSubject = await prisma.lmsSubject.update({
            where: { id: lmsSubject.id },
            data: { name: erpSubject.name },
          });
        }

        return lmsSubject;
      })
    );

    // Возвращаем LmsSubject (с правильными CUID id)
    const subjects = lmsSubjects.map(s => ({
      id: s.id, // CUID
      name: s.name,
      description: s.description,
      grade: s.grade,
      hoursPerWeek: s.hoursPerWeek,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    res.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// Создать предмет (в ERP Subject + LmsSubject)
router.post("/subjects", async (req: Request, res: Response) => {
  try {
    if (!ensureRole(req, res, ADMIN_ROLES)) return;
    
    const { name, description, grade, hoursPerWeek } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Название предмета обязательно" });
    }

    // Создаём в ERP Subject
    const erpSubject = await prisma.subject.create({
      data: { 
        name,
        shortName: null,
        color: null
      }
    });

    // Создаём связанный LmsSubject
    const lmsSubject = await prisma.lmsSubject.create({
      data: {
        erpSubjectId: erpSubject.id,
        name: erpSubject.name,
        description: description || null,
        grade: grade || null,
        hoursPerWeek: hoursPerWeek || 1,
      },
    });

    res.status(201).json({
      id: lmsSubject.id, // CUID
      name: lmsSubject.name,
      description: lmsSubject.description,
      grade: lmsSubject.grade,
      hoursPerWeek: lmsSubject.hoursPerWeek,
      createdAt: lmsSubject.createdAt.toISOString(),
      updatedAt: lmsSubject.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

// Обновить предмет (в ERP Subject)
router.put("/subjects/:id", async (req: Request, res: Response) => {
  try {
    const subjectId = parseInt(req.params.id);
    if (isNaN(subjectId)) {
      return res.status(400).json({ error: "Invalid subject ID" });
    }
    if (!ensureRole(req, res, ADMIN_ROLES)) return;
    
    const { name } = req.body;

    const subject = await prisma.subject.update({
      where: { id: subjectId },
      data: { ...(name && { name }) },
    });

    res.json({
      id: String(subject.id),
      name: subject.name,
      description: null,
      grade: null,
      hoursPerWeek: 1,
      createdAt: subject.createdAt.toISOString(),
      updatedAt: subject.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating subject:", error);
    res.status(500).json({ error: "Failed to update subject" });
  }
});

// ============================================================================
// РАСПИСАНИЕ (синхронизировано с ERP ScheduleSlot)
// ============================================================================

// Получить расписание класса (из ERP)
router.get("/schedule", async (req: Request, res: Response) => {
  try {
    const { classId, teacherId, dayOfWeek } = req.query;

    const where: any = { isActive: true };
    if (classId) where.groupId = parseInt(classId as string);
    if (teacherId) where.teacherId = parseInt(teacherId as string);
    if (dayOfWeek) where.dayOfWeek = parseInt(dayOfWeek as string);

    // Используем ERP ScheduleSlot
    const erpSchedule = await prisma.scheduleSlot.findMany({
      where,
      include: {
        timeSlot: true,
        subject: true,
        room: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { timeSlot: { number: "asc" } }],
    });

    // Получаем информацию об учителях
    const teacherIds = [...new Set(erpSchedule.map((s) => s.teacherId))];
    const teachers = teacherIds.length > 0 ? await prisma.employee.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, firstName: true, lastName: true },
    }) : [];
    const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t]));

    // Получаем информацию о классах
    const groupIds = [...new Set(erpSchedule.map((s) => s.groupId))];
    const groups = groupIds.length > 0 ? await prisma.group.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, name: true, grade: true },
    }) : [];
    const groupMap = Object.fromEntries(groups.map((g) => [g.id, g]));

    // Конвертируем в формат LMS
    const schedule = erpSchedule.map(slot => ({
      id: String(slot.id), // LMS использует string id
      classId: slot.groupId,
      subjectId: String(slot.subjectId),
      teacherId: slot.teacherId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.timeSlot.startTime,
      endTime: slot.timeSlot.endTime,
      room: slot.room?.name || null,
      class: groupMap[slot.groupId] || null,
      subject: slot.subject ? { id: String(slot.subject.id), name: slot.subject.name } : null,
      teacher: teacherMap[slot.teacherId] || null,
      createdAt: slot.createdAt.toISOString(),
      updatedAt: slot.updatedAt.toISOString(),
    }));

    res.json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({ error: "Failed to fetch schedule" });
  }
});

// Создать элемент расписания (в ERP ScheduleSlot)
router.post("/schedule", async (req: Request, res: Response) => {
  try {
    if (!ensureRole(req, res, ADMIN_ROLES)) return;
    
    const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room } = req.body;
    
    if (!classId || !subjectId || !dayOfWeek || !startTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Найдём или создадим TimeSlot
    let timeSlot = await prisma.timeSlot.findFirst({
      where: { startTime, endTime: endTime || startTime }
    });
    
    if (!timeSlot) {
      const maxNumber = await prisma.timeSlot.aggregate({ _max: { number: true } });
      timeSlot = await prisma.timeSlot.create({
        data: {
          number: (maxNumber._max.number || 0) + 1,
          startTime,
          endTime: endTime || startTime
        }
      });
    }

    // Найдём или создадим Room
    let roomRecord = null;
    if (room) {
      roomRecord = await prisma.room.findFirst({ where: { name: room } });
      if (!roomRecord) {
        roomRecord = await prisma.room.create({ data: { name: room } });
      }
    }

    // Создаём ScheduleSlot в ERP
    const scheduleSlot = await prisma.scheduleSlot.create({
      data: {
        dayOfWeek,
        timeSlotId: timeSlot.id,
        groupId: classId,
        subjectId: parseInt(subjectId),
        teacherId: teacherId || 0,
        roomId: roomRecord?.id || null,
      },
      include: {
        timeSlot: true,
        subject: true,
        room: true,
      },
    });

    // Получаем учителя
    const teacher = teacherId ? await prisma.employee.findUnique({
      where: { id: teacherId },
      select: { id: true, firstName: true, lastName: true }
    }) : null;

    // Получаем класс
    const group = await prisma.group.findUnique({
      where: { id: classId },
      select: { id: true, name: true, grade: true }
    });

    res.status(201).json({
      id: String(scheduleSlot.id),
      classId: scheduleSlot.groupId,
      subjectId: String(scheduleSlot.subjectId),
      teacherId: scheduleSlot.teacherId,
      dayOfWeek: scheduleSlot.dayOfWeek,
      startTime: scheduleSlot.timeSlot.startTime,
      endTime: scheduleSlot.timeSlot.endTime,
      room: scheduleSlot.room?.name || null,
      class: group,
      subject: scheduleSlot.subject ? { id: String(scheduleSlot.subject.id), name: scheduleSlot.subject.name } : null,
      teacher,
      createdAt: scheduleSlot.createdAt.toISOString(),
      updatedAt: scheduleSlot.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating schedule item:", error);
    res.status(500).json({ error: "Failed to create schedule item" });
  }
});

// Обновить элемент расписания (в ERP ScheduleSlot)
router.put("/schedule/:id", async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid schedule item ID" });
    }
    if (!ensureRole(req, res, ADMIN_ROLES)) return;
    
    const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room } = req.body;

    const updateData: any = {};
    if (classId) updateData.groupId = classId;
    if (subjectId) updateData.subjectId = parseInt(subjectId);
    if (teacherId !== undefined) updateData.teacherId = teacherId;
    if (dayOfWeek) updateData.dayOfWeek = dayOfWeek;

    // Обновляем TimeSlot если нужно
    if (startTime || endTime) {
      let timeSlot = await prisma.timeSlot.findFirst({
        where: { startTime: startTime || "", endTime: endTime || startTime || "" }
      });
      if (!timeSlot) {
        const maxNumber = await prisma.timeSlot.aggregate({ _max: { number: true } });
        timeSlot = await prisma.timeSlot.create({
          data: {
            number: (maxNumber._max.number || 0) + 1,
            startTime: startTime || "",
            endTime: endTime || startTime || ""
          }
        });
      }
      updateData.timeSlotId = timeSlot.id;
    }

    // Обновляем Room если нужно
    if (room !== undefined) {
      if (room) {
        let roomRecord = await prisma.room.findFirst({ where: { name: room } });
        if (!roomRecord) {
          roomRecord = await prisma.room.create({ data: { name: room } });
        }
        updateData.roomId = roomRecord.id;
      } else {
        updateData.roomId = null;
      }
    }

    const scheduleSlot = await prisma.scheduleSlot.update({
      where: { id: itemId },
      data: updateData,
      include: {
        timeSlot: true,
        subject: true,
        room: true,
      }
    });

    res.json({
      id: String(scheduleSlot.id),
      classId: scheduleSlot.groupId,
      subjectId: String(scheduleSlot.subjectId),
      teacherId: scheduleSlot.teacherId,
      dayOfWeek: scheduleSlot.dayOfWeek,
      startTime: scheduleSlot.timeSlot.startTime,
      endTime: scheduleSlot.timeSlot.endTime,
      room: scheduleSlot.room?.name || null,
    });
  } catch (error) {
    console.error("Error updating schedule item:", error);
    res.status(500).json({ error: "Failed to update schedule item" });
  }
});

// Удалить элемент расписания
router.delete("/schedule/:id", async (req: Request, res: Response) => {
  try {
    const itemId = parseInt(req.params.id);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid schedule item ID" });
    }
    const userRole = req.user?.role;

    if (!["ADMIN", "DIRECTOR", "DEPUTY"].includes(userRole || "")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Удаляем из ERP ScheduleSlot
    await prisma.scheduleSlot.delete({ where: { id: itemId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting schedule item:", error);
    res.status(500).json({ error: "Failed to delete schedule item" });
  }
});

// ============================================================================
// ЖУРНАЛ ОЦЕНОК
// ============================================================================

// Получить оценки
router.get("/grades", async (req: Request, res: Response) => {
  try {
    const { classId, subjectId, studentId, startDate, endDate, gradeType } = req.query;

    const where: any = {};
    if (classId) where.classId = parseInt(classId as string);
    if (subjectId) where.subjectId = subjectId as string;
    if (studentId) where.studentId = studentId as string;
    if (gradeType) where.gradeType = gradeType as string;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const grades = await prisma.lmsGrade.findMany({
      where,
      include: {
        student: {
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
        },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { date: "desc" },
    });

    res.json(grades);
  } catch (error) {
    console.error("Error fetching grades:", error);
    res.status(500).json({ error: "Failed to fetch grades" });
  }
});

// Получить журнал класса по предмету (синхронизировано с ERP)
router.get("/gradebook/:classId/:subjectId", async (req: Request, res: Response) => {
  try {
    const classId = parseInt(req.params.classId);
    const subjectId = req.params.subjectId;
    const { startDate, endDate } = req.query;

    if (isNaN(classId)) {
      return res.status(400).json({ error: "Invalid class ID" });
    }

    // Получаем детей из ERP напрямую
    const children = await prisma.child.findMany({
      where: { 
        groupId: classId,
        status: "ACTIVE"
      },
      orderBy: { lastName: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
      }
    });

    // Получаем/создаём LmsSchoolStudent записи для детей
    const lmsStudents = await prisma.lmsSchoolStudent.findMany({
      where: { classId, status: "active" }
    });
    const lmsStudentMap = new Map(lmsStudents.map(s => [s.studentId, s]));

    // Создаём LmsSchoolStudent записи для детей, у которых их ещё нет
    for (const child of children) {
      if (!lmsStudentMap.has(child.id)) {
        const newStudent = await prisma.lmsSchoolStudent.create({
          data: {
            studentId: child.id,
            classId,
            status: "active"
          }
        });
        lmsStudentMap.set(child.id, newStudent);
      }
    }

    // Формируем список учеников в формате для журнала
    const students = children.map(child => ({
      id: lmsStudentMap.get(child.id)!.id,
      studentId: child.id,
      classId,
      status: "active",
      student: {
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName
      }
    }));

    // Получаем оценки
    const where: any = { classId, subjectId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const grades = await prisma.lmsGrade.findMany({
      where,
      orderBy: { date: "asc" },
    });

    // Группируем оценки по ученикам
    const gradesByStudent = new Map<string, typeof grades>();
    grades.forEach(g => {
      if (!gradesByStudent.has(g.studentId)) {
        gradesByStudent.set(g.studentId, []);
      }
      gradesByStudent.get(g.studentId)!.push(g);
    });

    // Получаем уникальные даты для колонок
    const uniqueDates = [...new Set(grades.map(g => g.date.toISOString().split('T')[0]))].sort();

    const result = students.map(student => ({
      student,
      grades: gradesByStudent.get(student.id) || [],
      average: calculateAverage(gradesByStudent.get(student.id) || []),
    }));

    res.json({
      students: result,
      dates: uniqueDates,
      classId,
      subjectId,
    });
  } catch (error) {
    console.error("Error fetching gradebook:", error);
    res.status(500).json({ error: "Failed to fetch gradebook" });
  }
});

function calculateAverage(grades: { value: number }[]): number {
  if (grades.length === 0) return 0;
  const sum = grades.reduce((acc, g) => acc + g.value, 0);
  return Math.round((sum / grades.length) * 100) / 100;
}

// Добавить оценку
router.post("/grades", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!ensureRole(req, res, TEACHING_ROLES)) return;
    const payload = validate(gradeSchema, req.body, res);
    if (!payload) return;

    // Получаем employee id по user id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    const newGrade = await prisma.lmsGrade.create({
      data: {
        studentId: payload.studentId,
        subjectId: payload.subjectId,
        classId: payload.classId,
        teacherId: user?.employeeId || undefined,
        value: payload.value,
        gradeType: payload.gradeType || "regular",
        maxValue: payload.maxValue || 5,
        date: payload.date,
        comment: payload.comment,
      },
      include: {
        student: {
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
        },
        subject: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(newGrade);
  } catch (error) {
    console.error("Error creating grade:", error);
    res.status(500).json({ error: "Failed to create grade" });
  }
});

// Обновить оценку
router.put("/grades/:id", async (req: Request, res: Response) => {
  try {
    const gradeId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const existingGrade = await prisma.lmsGrade.findUnique({ where: { id: gradeId } });
    if (!existingGrade) {
      return res.status(404).json({ error: "Grade not found" });
    }

    // Получаем employee id по user id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    // Только автор или админ может редактировать
    if (existingGrade.teacherId !== user?.employeeId && !["ADMIN", "DIRECTOR"].includes(userRole || "")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const payload = validate(gradeUpdateSchema, req.body, res);
    if (!payload) return;

    const updatedGrade = await prisma.lmsGrade.update({
      where: { id: gradeId },
      data: payload,
    });

    res.json(updatedGrade);
  } catch (error) {
    console.error("Error updating grade:", error);
    res.status(500).json({ error: "Failed to update grade" });
  }
});

// Удалить оценку
router.delete("/grades/:id", async (req: Request, res: Response) => {
  try {
    const gradeId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const existingGrade = await prisma.lmsGrade.findUnique({ where: { id: gradeId } });
    if (!existingGrade) {
      return res.status(404).json({ error: "Grade not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (existingGrade.teacherId !== user?.employeeId && !["ADMIN", "DIRECTOR"].includes(userRole || "")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.lmsGrade.delete({ where: { id: gradeId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting grade:", error);
    res.status(500).json({ error: "Failed to delete grade" });
  }
});

// ============================================================================
// ДОМАШНИЕ ЗАДАНИЯ
// ============================================================================

// Получить домашние задания
router.get("/homework", async (req: Request, res: Response) => {
  try {
    const { classId, subjectId, teacherId, startDate, endDate } = req.query;

    const where: any = { status: "active" };
    if (classId) where.classId = classId as string;
    if (subjectId) where.subjectId = subjectId as string;
    if (teacherId) where.teacherId = parseInt(teacherId as string);
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate as string);
      if (endDate) where.dueDate.lte = new Date(endDate as string);
    }

    const homework = await prisma.lmsHomework.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    const result = homework.map(h => ({
      ...h,
      submissionsCount: h._count.submissions,
      _count: undefined,
    }));

    res.json(result);
  } catch (error) {
    console.error("Error fetching homework:", error);
    res.status(500).json({ error: "Failed to fetch homework" });
  }
});

// Создать домашнее задание
router.post("/homework", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!ensureRole(req, res, TEACHING_ROLES)) return;
    const payload = validate(homeworkSchema, req.body, res);
    if (!payload) return;

    // Получаем employee id по user id
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (!user?.employeeId) {
      return res.status(400).json({ error: "User has no associated employee" });
    }

    const homework = await prisma.lmsHomework.create({
      data: {
        classId: payload.classId,
        subjectId: payload.subjectId,
        teacherId: user.employeeId,
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
        maxPoints: payload.maxPoints,
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    res.status(201).json(homework);
  } catch (error) {
    console.error("Error creating homework:", error);
    res.status(500).json({ error: "Failed to create homework" });
  }
});

// Обновить домашнее задание
router.put("/homework/:id", async (req: Request, res: Response) => {
  try {
    const homeworkId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const existing = await prisma.lmsHomework.findUnique({ where: { id: homeworkId } });
    if (!existing) {
      return res.status(404).json({ error: "Homework not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (existing.teacherId !== user?.employeeId && !["ADMIN", "DIRECTOR"].includes(userRole || "")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const payload = validate(homeworkSchema.partial().extend({ status: z.string().optional() }), req.body, res);
    if (!payload) return;

    const homework = await prisma.lmsHomework.update({
      where: { id: homeworkId },
      data: { 
        title: payload.title, 
        description: payload.description, 
        dueDate: payload.dueDate, 
        maxPoints: payload.maxPoints, 
        status: payload.status 
      },
    });

    res.json(homework);
  } catch (error) {
    console.error("Error updating homework:", error);
    res.status(500).json({ error: "Failed to update homework" });
  }
});

// Удалить домашнее задание
router.delete("/homework/:id", async (req: Request, res: Response) => {
  try {
    const homeworkId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const existing = await prisma.lmsHomework.findUnique({ where: { id: homeworkId } });
    if (!existing) {
      return res.status(404).json({ error: "Homework not found" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    if (existing.teacherId !== user?.employeeId && !["ADMIN", "DIRECTOR"].includes(userRole || "")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.lmsHomework.delete({ where: { id: homeworkId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting homework:", error);
    res.status(500).json({ error: "Failed to delete homework" });
  }
});

// Получить работы по домашнему заданию
router.get("/homework/:id/submissions", async (req: Request, res: Response) => {
  try {
    const homeworkId = req.params.id;

    const submissions = await prisma.lmsHomeworkSubmission.findMany({
      where: { homeworkId },
      include: {
        student: {
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    res.json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Оценить работу
router.put("/homework/submissions/:id/grade", async (req: Request, res: Response) => {
  try {
    const submissionId = req.params.id;
    const userId = req.user?.id;

    if (!ensureRole(req, res, TEACHING_ROLES)) return;
    const payload = validate(gradeSubmissionSchema, req.body, res);
    if (!payload) return;

    const submission = await prisma.lmsHomeworkSubmission.update({
      where: { id: submissionId },
      data: {
        points: payload.points,
        feedback: payload.feedback,
        gradedAt: new Date(),
        gradedBy: userId?.toString(),
      },
    });

    res.json(submission);
  } catch (error) {
    console.error("Error grading submission:", error);
    res.status(500).json({ error: "Failed to grade submission" });
  }
});

// ============================================================================
// ПОСЕЩАЕМОСТЬ
// ============================================================================

// Получить посещаемость класса
router.get("/attendance", async (req: Request, res: Response) => {
  try {
    const { classId, studentId, date, startDate, endDate } = req.query;

    const where: any = {};
    if (classId) where.classId = classId as string;
    if (studentId) where.studentId = studentId as string;
    if (date) where.date = new Date(date as string);
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const attendance = await prisma.lmsStudentAttendance.findMany({
      where,
      include: {
        student: {
          include: {
            student: { select: { firstName: true, lastName: true } },
          },
        },
        class: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }],
    });

    res.json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

// Отметить посещаемость (массово)
router.post("/attendance/bulk", async (req: Request, res: Response) => {
  try {
    if (!ensureRole(req, res, TEACHING_ROLES)) return;
    const payload = validate(attendanceBulkSchema, req.body, res);
    if (!payload) return;

    const results = await Promise.all(
      payload.records.map(async (record) => {
        // Проверяем есть ли уже запись
        const existing = await prisma.lmsStudentAttendance.findFirst({
          where: {
            studentId: record.studentId,
            classId: payload.classId,
            date: payload.date,
          },
        });

        if (existing) {
          return prisma.lmsStudentAttendance.update({
            where: { id: existing.id },
            data: {
              status: record.status,
              note: record.note,
            },
          });
        } else {
          return prisma.lmsStudentAttendance.create({
            data: {
              studentId: record.studentId,
              classId: payload.classId,
              date: payload.date,
              status: record.status,
              note: record.note,
            },
          });
        }
      })
    );

    res.json(results);
  } catch (error) {
    console.error("Error recording attendance:", error);
    res.status(500).json({ error: "Failed to record attendance" });
  }
});

// ============================================================================
// ОБЪЯВЛЕНИЯ (использует существующую модель LmsAnnouncement)
// ============================================================================

// Получить объявления
router.get("/announcements", async (req: Request, res: Response) => {
  try {
    const announcements = await prisma.lmsClassAnnouncement.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    res.json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Создать объявление
router.post("/announcements", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!["ADMIN", "DIRECTOR", "DEPUTY", "TEACHER"].includes(userRole || "")) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const { title, content, isPinned, classId } = req.body;

    const announcement = await prisma.lmsClassAnnouncement.create({
      data: {
        title,
        content,
        authorId: userId!,
        isPinned: isPinned || false,
        classId: classId || null,
      },
    });

    res.status(201).json(announcement);
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// ============================================================================
// СТАТИСТИКА ШКОЛЫ
// ============================================================================

// Получить статистику для дашборда школы
router.get("/school-stats", async (req: Request, res: Response) => {
  try {
    // Общая статистика
    const [
      totalClasses,
      totalStudents,
      totalSubjects,
      todayAttendance,
      recentGrades,
      upcomingHomework,
    ] = await Promise.all([
      prisma.group.count(),
      prisma.lmsSchoolStudent.count({ where: { status: "active" } }),
      prisma.lmsSubject.count(),
      prisma.lmsStudentAttendance.groupBy({
        by: ['status'],
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        _count: true,
      }),
      prisma.lmsGrade.findMany({
        where: {
          date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: "desc" },
        take: 10,
        include: {
          student: {
            include: {
              student: { select: { firstName: true, lastName: true } },
            },
          },
          subject: { select: { name: true } },
        },
      }),
      prisma.lmsHomework.count({
        where: {
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          status: "active",
        },
      }),
    ]);

    // Подсчет посещаемости
    const attendanceStats = {
      present: todayAttendance.find(a => a.status === 'present')?._count || 0,
      absent: todayAttendance.find(a => a.status === 'absent')?._count || 0,
      late: todayAttendance.find(a => a.status === 'late')?._count || 0,
      excused: todayAttendance.find(a => a.status === 'excused')?._count || 0,
    };

    res.json({
      totalClasses,
      totalStudents,
      totalSubjects,
      attendanceStats,
      recentGrades,
      upcomingHomework,
    });
  } catch (error) {
    console.error("Error fetching school stats:", error);
    res.status(500).json({ error: "Failed to fetch school stats" });
  }
});

// Получить список учеников (Children) для выбора при добавлении в класс
router.get("/available-students", async (req: Request, res: Response) => {
  try {
    const { classId } = req.query;
    const classIdNum = classId ? parseInt(classId as string) : undefined;

    // Получаем всех детей которые ещё не в классах
    const existingStudentIds = await prisma.lmsSchoolStudent.findMany({
      where: classIdNum ? { classId: { not: classIdNum } } : {},
      select: { studentId: true },
    });

    const children = await prisma.child.findMany({
      where: {
        status: "ACTIVE",
        id: {
          notIn: existingStudentIds.map(s => s.studentId),
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
        group: { select: { name: true } },
      },
      orderBy: { lastName: "asc" },
    });

    res.json(children);
  } catch (error) {
    console.error("Error fetching available students:", error);
    res.status(500).json({ error: "Failed to fetch available students" });
  }
});

// Получить список учителей (Employees) для выбора
router.get("/teachers", async (req: Request, res: Response) => {
  try {
    const teachers = await prisma.employee.findMany({
      where: {
        position: {
          in: ["Учитель", "Преподаватель", "Педагог", "Teacher"],
        },
        fireDate: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
      },
      orderBy: { lastName: "asc" },
    });

    res.json(teachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
});

export default router;
