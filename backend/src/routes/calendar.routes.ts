// src/routes/calendar.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";

const router = Router();

// GET /api/calendar - List all events (filter by date range)
router.get("/", checkRole(["DEPUTY", "ADMIN", "ACCOUNTANT", "ZAVHOZ", "TEACHER"]), async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const events = await prisma.event.findMany({
    where: {
      ...(startDate && endDate
        ? { date: { gte: new Date(startDate as string), lte: new Date(endDate as string) } }
        : {}),
    },
    include: {
      group: true,
    },
    orderBy: { date: "asc" },
  });
  
  return res.json(events);
});

// GET /api/calendar/groups - Get groups for dropdown
router.get("/groups", checkRole(["DEPUTY", "ADMIN", "ZAVHOZ", "TEACHER"]), async (_req, res) => {
  const groups = await prisma.group.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return res.json(groups);
});

// POST /api/calendar - Create new event
router.post("/", checkRole(["DEPUTY", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  const { title, date, groupId, organizer, performers } = req.body;
  
  const event = await prisma.event.create({
    data: {
      title,
      date: new Date(date),
      groupId: groupId || null,
      organizer,
      performers: performers || [],
    },
    include: {
      group: true,
    },
  });
  
  return res.status(201).json(event);
});

// PUT /api/calendar/:id - Update event
router.put("/:id", checkRole(["DEPUTY", "ADMIN", "ZAVHOZ"]), async (req, res) => {
  const { id } = req.params;
  const { title, date, groupId, organizer, performers } = req.body;
  
  const event = await prisma.event.update({
    where: { id: Number(id) },
    data: {
      title,
      date: new Date(date),
      groupId: groupId || null,
      organizer,
      performers: performers || [],
    },
    include: {
      group: true,
    },
  });
  
  return res.json(event);
});

// DELETE /api/calendar/:id - Delete event
router.delete("/:id", checkRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  
  await prisma.event.delete({
    where: { id: Number(id) },
  });
  
  return res.status(204).send();
});

export default router;
