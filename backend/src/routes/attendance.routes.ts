// src/routes/attendance.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { validate } from "../middleware/validate";
import { markAttendanceSchema } from "../schemas/attendance.schema";

const router = Router();

// POST /api/attendance
router.post(
  "/",
  checkRole(["DEPUTY", "ADMIN", "TEACHER"]),
  validate(markAttendanceSchema),
  async (req, res) => {
    const { date, childId, clubId, isPresent } = req.body as {
      date: string;
      childId: number;
      clubId?: number | null;
      isPresent: boolean;
    };

    if (req.user!.role === "TEACHER") {
      if (!clubId) {
        return res.status(403).json({ message: "Teachers can only mark attendance for their clubs" });
      }
      const employeeId = req.user!.employeeId;
      if (!employeeId) {
        return res.status(403).json({ message: "Forbidden: User is not a valid employee." });
      }
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (!club || club.teacherId !== employeeId) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const attendanceDate = new Date(date);
    const attendanceWhere = {
      date: attendanceDate,
      childId,
      clubId: clubId ?? null,
    };

    const existing = await prisma.attendance.findFirst({ where: attendanceWhere });

    const record = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: { isPresent },
        })
      : await prisma.attendance.create({
          data: {
            date: attendanceDate,
            childId,
            clubId: clubId ?? null,
            isPresent,
          },
        });

    return res.status(existing ? 200 : 201).json(record);
  }
);

export default router;