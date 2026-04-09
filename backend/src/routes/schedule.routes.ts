// src/routes/schedule.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";

const router = Router();

// =====================
// ПРЕДМЕТЫ (Subjects)
// =====================

// GET /api/schedule/subjects
router.get("/subjects", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER"]), async (_req, res) => {
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
  });
  return res.json(subjects);
});

// POST /api/schedule/subjects
router.post("/subjects", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { name, shortName, color } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Название предмета обязательно" });
  }
  const subject = await prisma.subject.create({
    data: { name, shortName, color },
  });
  return res.status(201).json(subject);
});

// PUT /api/schedule/subjects/:id
router.put("/subjects/:id", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { name, shortName, color } = req.body;
  const subject = await prisma.subject.update({
    where: { id: Number(id) },
    data: { name, shortName, color },
  });
  return res.json(subject);
});

// DELETE /api/schedule/subjects/:id
router.delete("/subjects/:id", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  
  // Проверяем использование в расписании
  const slotsCount = await prisma.scheduleSlot.count({
    where: { subjectId: Number(id) },
  });
  if (slotsCount > 0) {
    return res.status(400).json({
      error: `Предмет используется в ${slotsCount} слотах расписания. Сначала удалите их.`,
    });
  }
  
  await prisma.subject.delete({ where: { id: Number(id) } });
  return res.status(204).send();
});

// =====================
// КАБИНЕТЫ (Rooms)
// =====================

// GET /api/schedule/rooms
router.get("/rooms", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER"]), async (_req, res) => {
  const rooms = await prisma.room.findMany({
    orderBy: { name: "asc" },
  });
  return res.json(rooms);
});

// POST /api/schedule/rooms
router.post("/rooms", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { name, capacity } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Название кабинета обязательно" });
  }
  const room = await prisma.room.create({
    data: { name, capacity: capacity ? Number(capacity) : null },
  });
  return res.status(201).json(room);
});

// PUT /api/schedule/rooms/:id
router.put("/rooms/:id", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { name, capacity } = req.body;
  const room = await prisma.room.update({
    where: { id: Number(id) },
    data: { name, capacity: capacity !== undefined ? Number(capacity) : undefined },
  });
  return res.json(room);
});

// DELETE /api/schedule/rooms/:id
router.delete("/rooms/:id", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  await prisma.room.delete({ where: { id: Number(id) } });
  return res.status(204).send();
});

// =====================
// ВРЕМЕННЫЕ СЛОТЫ (TimeSlots)
// =====================

// GET /api/schedule/timeslots
router.get("/timeslots", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER"]), async (_req, res) => {
  const slots = await prisma.timeSlot.findMany({
    orderBy: { number: "asc" },
  });
  return res.json(slots);
});

// POST /api/schedule/timeslots
router.post("/timeslots", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { number, startTime, endTime } = req.body;
  if (!number || !startTime || !endTime) {
    return res.status(400).json({ error: "Номер урока, время начала и окончания обязательны" });
  }
  const slot = await prisma.timeSlot.create({
    data: { number: Number(number), startTime, endTime },
  });
  return res.status(201).json(slot);
});

// PUT /api/schedule/timeslots/:id
router.put("/timeslots/:id", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { number, startTime, endTime } = req.body;
  const slot = await prisma.timeSlot.update({
    where: { id: Number(id) },
    data: {
      ...(number !== undefined && { number: Number(number) }),
      ...(startTime && { startTime }),
      ...(endTime && { endTime }),
    },
  });
  return res.json(slot);
});

// DELETE /api/schedule/timeslots/:id
router.delete("/timeslots/:id", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  await prisma.timeSlot.delete({ where: { id: Number(id) } });
  return res.status(204).send();
});

// =====================
// ПРИВЯЗКА УЧИТЕЛЬ-ПРЕДМЕТ (TeacherSubjects)
// =====================

// GET /api/schedule/teacher-subjects
router.get("/teacher-subjects", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (_req, res) => {
  const links = await prisma.teacherSubject.findMany({
    orderBy: { employeeId: "asc" },
  });
  return res.json(links);
});

// GET /api/schedule/teacher-subjects/:employeeId
router.get("/teacher-subjects/:employeeId", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER"]), async (req, res) => {
  const { employeeId } = req.params;
  const links = await prisma.teacherSubject.findMany({
    where: { employeeId: Number(employeeId) },
  });
  return res.json(links);
});

// POST /api/schedule/teacher-subjects
router.post("/teacher-subjects", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { employeeId, subjectId, isPrimary } = req.body;
  if (!employeeId || !subjectId) {
    return res.status(400).json({ error: "ID сотрудника и предмета обязательны" });
  }
  const link = await prisma.teacherSubject.create({
    data: {
      employeeId: Number(employeeId),
      subjectId: Number(subjectId),
      isPrimary: isPrimary || false,
    },
  });
  return res.status(201).json(link);
});

// DELETE /api/schedule/teacher-subjects/:id
router.delete("/teacher-subjects/:id", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  await prisma.teacherSubject.delete({ where: { id: Number(id) } });
  return res.status(204).send();
});

// =====================
// СЛОТЫ РАСПИСАНИЯ (ScheduleSlots)
// =====================

// GET /api/schedule/slots - все слоты с фильтрами
router.get("/slots", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER"]), async (req, res) => {
  const { groupId, teacherId, dayOfWeek } = req.query;

  const where: any = { isActive: true };
  if (groupId) where.groupId = Number(groupId);
  if (teacherId) where.teacherId = Number(teacherId);
  if (dayOfWeek) where.dayOfWeek = Number(dayOfWeek);

  const slots = await prisma.scheduleSlot.findMany({
    where,
    include: {
      timeSlot: true,
      subject: true,
      room: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { timeSlot: { number: "asc" } }],
  });
  return res.json(slots);
});

// GET /api/schedule/grid/:groupId - расписание для класса в виде сетки
router.get("/grid/:groupId", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER"]), async (req, res) => {
  const { groupId } = req.params;

  const slots = await prisma.scheduleSlot.findMany({
    where: { groupId: Number(groupId), isActive: true },
    include: {
      timeSlot: true,
      subject: true,
      room: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { timeSlot: { number: "asc" } }],
  });

  // Получаем информацию об учителях
  const teacherIds = [...new Set(slots.map((s) => s.teacherId))];
  const teachers = await prisma.employee.findMany({
    where: { id: { in: teacherIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t]));

  // Формируем сетку: dayOfWeek -> timeSlotNumber -> slot
  const grid: Record<number, Record<number, any>> = {};
  for (let day = 1; day <= 6; day++) {
    grid[day] = {};
  }

  for (const slot of slots) {
    const teacher = teacherMap[slot.teacherId];
    grid[slot.dayOfWeek][slot.timeSlot.number] = {
      ...slot,
      teacherName: teacher ? `${teacher.lastName} ${teacher.firstName[0]}.` : "—",
    };
  }

  return res.json(grid);
});

// GET /api/schedule/teacher-grid/:teacherId - расписание для учителя
router.get("/teacher-grid/:teacherId", checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "TEACHER"]), async (req, res) => {
  const { teacherId } = req.params;

  const slots = await prisma.scheduleSlot.findMany({
    where: { teacherId: Number(teacherId), isActive: true },
    include: {
      timeSlot: true,
      subject: true,
      room: true,
    },
    orderBy: [{ dayOfWeek: "asc" }, { timeSlot: { number: "asc" } }],
  });

  // Получаем информацию о классах
  const groupIds = [...new Set(slots.map((s) => s.groupId))];
  const groups = await prisma.group.findMany({
    where: { id: { in: groupIds } },
    select: { id: true, name: true },
  });
  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g]));

  // Формируем сетку
  const grid: Record<number, Record<number, any>> = {};
  for (let day = 1; day <= 6; day++) {
    grid[day] = {};
  }

  for (const slot of slots) {
    const group = groupMap[slot.groupId];
    const key = slot.timeSlot.number;
    
    // Учитель может вести несколько уроков в один слот (разные классы)
    if (!grid[slot.dayOfWeek][key]) {
      grid[slot.dayOfWeek][key] = [];
    }
    grid[slot.dayOfWeek][key].push({
      ...slot,
      groupName: group ? group.name : "—",
    });
  }

  return res.json(grid);
});

// POST /api/schedule/slots - создать слот
router.post("/slots", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { dayOfWeek, timeSlotId, groupId, subjectId, teacherId, roomId, notes } = req.body;

  if (!dayOfWeek || !timeSlotId || !groupId || !subjectId || !teacherId) {
    return res.status(400).json({
      error: "День недели, урок, класс, предмет и учитель обязательны",
    });
  }

  // Проверка конфликтов
  const conflicts = await checkConflicts({
    dayOfWeek: Number(dayOfWeek),
    timeSlotId: Number(timeSlotId),
    groupId: Number(groupId),
    teacherId: Number(teacherId),
    roomId: roomId ? Number(roomId) : undefined,
  });

  if (conflicts.length > 0) {
    return res.status(409).json({
      error: "Обнаружены конфликты в расписании",
      conflicts,
    });
  }

  const slot = await prisma.scheduleSlot.create({
    data: {
      dayOfWeek: Number(dayOfWeek),
      timeSlotId: Number(timeSlotId),
      groupId: Number(groupId),
      subjectId: Number(subjectId),
      teacherId: Number(teacherId),
      roomId: roomId ? Number(roomId) : null,
      notes,
    },
    include: {
      timeSlot: true,
      subject: true,
      room: true,
    },
  });

  return res.status(201).json(slot);
});

// PUT /api/schedule/slots/:id
router.put("/slots/:id", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { dayOfWeek, timeSlotId, groupId, subjectId, teacherId, roomId, notes, isActive } = req.body;

  // Проверка конфликтов (исключая текущий слот)
  if (dayOfWeek || timeSlotId || teacherId || roomId) {
    const currentSlot = await prisma.scheduleSlot.findUnique({ where: { id: Number(id) } });
    if (!currentSlot) {
      return res.status(404).json({ error: "Слот не найден" });
    }

    const conflicts = await checkConflicts(
      {
        dayOfWeek: Number(dayOfWeek ?? currentSlot.dayOfWeek),
        timeSlotId: Number(timeSlotId ?? currentSlot.timeSlotId),
        groupId: Number(groupId ?? currentSlot.groupId),
        teacherId: Number(teacherId ?? currentSlot.teacherId),
        roomId: roomId !== undefined ? (roomId ? Number(roomId) : undefined) : currentSlot.roomId ?? undefined,
      },
      Number(id)
    );

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: "Обнаружены конфликты в расписании",
        conflicts,
      });
    }
  }

  const slot = await prisma.scheduleSlot.update({
    where: { id: Number(id) },
    data: {
      ...(dayOfWeek !== undefined && { dayOfWeek: Number(dayOfWeek) }),
      ...(timeSlotId !== undefined && { timeSlotId: Number(timeSlotId) }),
      ...(groupId !== undefined && { groupId: Number(groupId) }),
      ...(subjectId !== undefined && { subjectId: Number(subjectId) }),
      ...(teacherId !== undefined && { teacherId: Number(teacherId) }),
      ...(roomId !== undefined && { roomId: roomId ? Number(roomId) : null }),
      ...(notes !== undefined && { notes }),
      ...(isActive !== undefined && { isActive }),
    },
    include: {
      timeSlot: true,
      subject: true,
      room: true,
    },
  });

  return res.json(slot);
});

// DELETE /api/schedule/slots/:id
router.delete("/slots/:id", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  await prisma.scheduleSlot.delete({ where: { id: Number(id) } });
  return res.status(204).send();
});

// =====================
// ПРОВЕРКА КОНФЛИКТОВ
// =====================

interface ConflictCheckParams {
  dayOfWeek: number;
  timeSlotId: number;
  groupId: number;
  teacherId: number;
  roomId?: number;
}

interface Conflict {
  type: "teacher" | "room" | "group";
  message: string;
  slotId: number;
}

async function checkConflicts(params: ConflictCheckParams, excludeSlotId?: number): Promise<Conflict[]> {
  const { dayOfWeek, timeSlotId, groupId, teacherId, roomId } = params;
  const conflicts: Conflict[] = [];

  const baseWhere = {
    dayOfWeek,
    timeSlotId,
    isActive: true,
    ...(excludeSlotId && { id: { not: excludeSlotId } }),
  };

  // 1. Проверка: учитель уже занят в это время
  const teacherConflict = await prisma.scheduleSlot.findFirst({
    where: { ...baseWhere, teacherId },
    include: { subject: true, room: true },
  });
  if (teacherConflict) {
    const teacher = await prisma.employee.findUnique({
      where: { id: teacherId },
      select: { firstName: true, lastName: true },
    });
    const group = await prisma.group.findUnique({ where: { id: teacherConflict.groupId } });
    conflicts.push({
      type: "teacher",
      message: `Учитель ${teacher?.lastName} ${teacher?.firstName} уже ведёт урок в классе ${group?.name || teacherConflict.groupId}`,
      slotId: teacherConflict.id,
    });
  }

  // 2. Проверка: класс уже занят в это время
  const groupConflict = await prisma.scheduleSlot.findFirst({
    where: { ...baseWhere, groupId },
    include: { subject: true },
  });
  if (groupConflict) {
    conflicts.push({
      type: "group",
      message: `У класса уже есть урок (${groupConflict.subject.name}) в это время`,
      slotId: groupConflict.id,
    });
  }

  // 3. Проверка: кабинет занят (если указан)
  if (roomId) {
    const roomConflict = await prisma.scheduleSlot.findFirst({
      where: { ...baseWhere, roomId },
      include: { subject: true },
    });
    if (roomConflict) {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      const group = await prisma.group.findUnique({ where: { id: roomConflict.groupId } });
      conflicts.push({
        type: "room",
        message: `Кабинет ${room?.name || roomId} занят классом ${group?.name || roomConflict.groupId}`,
        slotId: roomConflict.id,
      });
    }
  }

  return conflicts;
}

// GET /api/schedule/check-conflicts - проверить конфликты без сохранения
router.post("/check-conflicts", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { dayOfWeek, timeSlotId, groupId, teacherId, roomId, excludeSlotId } = req.body;

  const conflicts = await checkConflicts(
    {
      dayOfWeek: Number(dayOfWeek),
      timeSlotId: Number(timeSlotId),
      groupId: Number(groupId),
      teacherId: Number(teacherId),
      roomId: roomId ? Number(roomId) : undefined,
    },
    excludeSlotId ? Number(excludeSlotId) : undefined
  );

  return res.json({ conflicts, hasConflicts: conflicts.length > 0 });
});

// GET /api/schedule/all-conflicts - найти все конфликты в расписании
router.get("/all-conflicts", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (_req, res) => {
  const allSlots = await prisma.scheduleSlot.findMany({
    where: { isActive: true },
    include: { timeSlot: true, subject: true, room: true },
    orderBy: [{ dayOfWeek: "asc" }, { timeSlot: { number: "asc" } }],
  });

  const conflicts: Array<{
    type: string;
    dayOfWeek: number;
    timeSlot: number;
    slots: number[];
    message: string;
  }> = [];

  // Группируем по день+слот
  const grouped: Record<string, typeof allSlots> = {};
  for (const slot of allSlots) {
    const key = `${slot.dayOfWeek}-${slot.timeSlotId}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }

  // Проверяем каждую группу на конфликты
  for (const [key, slots] of Object.entries(grouped)) {
    const [dayOfWeek, timeSlotId] = key.split("-").map(Number);

    // Проверка учителей
    const teacherGroups: Record<number, typeof allSlots> = {};
    for (const slot of slots) {
      if (!teacherGroups[slot.teacherId]) teacherGroups[slot.teacherId] = [];
      teacherGroups[slot.teacherId].push(slot);
    }
    for (const [teacherId, teacherSlots] of Object.entries(teacherGroups)) {
      if (teacherSlots.length > 1) {
        const teacher = await prisma.employee.findUnique({
          where: { id: Number(teacherId) },
          select: { firstName: true, lastName: true },
        });
        const groups = await prisma.group.findMany({
          where: { id: { in: teacherSlots.map((s) => s.groupId) } },
        });
        conflicts.push({
          type: "teacher",
          dayOfWeek,
          timeSlot: slots[0].timeSlot.number,
          slots: teacherSlots.map((s) => s.id),
          message: `${teacher?.lastName} ${teacher?.firstName} назначен(а) в ${teacherSlots.length} классах одновременно: ${groups.map((g) => g.name).join(", ")}`,
        });
      }
    }

    // Проверка кабинетов
    const roomGroups: Record<number, typeof allSlots> = {};
    for (const slot of slots) {
      if (slot.roomId) {
        if (!roomGroups[slot.roomId]) roomGroups[slot.roomId] = [];
        roomGroups[slot.roomId].push(slot);
      }
    }
    for (const [roomId, roomSlots] of Object.entries(roomGroups)) {
      if (roomSlots.length > 1) {
        const room = await prisma.room.findUnique({ where: { id: Number(roomId) } });
        const groups = await prisma.group.findMany({
          where: { id: { in: roomSlots.map((s) => s.groupId) } },
        });
        conflicts.push({
          type: "room",
          dayOfWeek,
          timeSlot: slots[0].timeSlot.number,
          slots: roomSlots.map((s) => s.id),
          message: `Кабинет ${room?.name} назначен ${roomSlots.length} классам одновременно: ${groups.map((g) => g.name).join(", ")}`,
        });
      }
    }
  }

  return res.json(conflicts);
});

// GET /api/schedule/teacher-load/:teacherId - нагрузка учителя
router.get("/teacher-load/:teacherId", checkRole(["DIRECTOR", "DEPUTY", "ADMIN"]), async (req, res) => {
  const { teacherId } = req.params;

  const slots = await prisma.scheduleSlot.findMany({
    where: { teacherId: Number(teacherId), isActive: true },
    include: { timeSlot: true, subject: true },
  });

  // Подсчёт уроков по предметам
  const bySubject: Record<string, number> = {};
  for (const slot of slots) {
    bySubject[slot.subject.name] = (bySubject[slot.subject.name] || 0) + 1;
  }

  // Подсчёт уроков по дням
  const byDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const slot of slots) {
    byDay[slot.dayOfWeek]++;
  }

  return res.json({
    totalLessons: slots.length,
    bySubject,
    byDay,
    lessonsPerWeek: slots.length,
  });
});

export default router;
