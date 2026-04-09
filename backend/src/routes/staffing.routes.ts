// src/routes/staffing.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";

const router = Router();

// --- StaffingTable CRUD ---

// GET /api/staffing/tables - List all staffing tables
router.get("/tables", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const tables = await prisma.staffingTable.findMany({
    orderBy: { position: "asc" },
  });
  
  return res.json(tables);
});

// POST /api/staffing/tables - Create new staffing table entry
router.post("/tables", checkRole(["ADMIN"]), async (req, res) => {
  const { position, requiredRate } = req.body;
  
  const table = await prisma.staffingTable.create({
    data: {
      position,
      requiredRate,
    },
  });
  
  return res.status(201).json(table);
});

// PUT /api/staffing/tables/:id - Update staffing table
router.put("/tables/:id", checkRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { position, requiredRate } = req.body;
  
  const table = await prisma.staffingTable.update({
    where: { id: Number(id) },
    data: {
      position,
      requiredRate,
    },
  });
  
  return res.json(table);
});

// DELETE /api/staffing/tables/:id - Delete staffing table
router.delete("/tables/:id", checkRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  
  await prisma.staffingTable.delete({
    where: { id: Number(id) },
  });
  
  return res.status(204).send();
});

// --- EmployeeAttendance CRUD ---

// GET /api/staffing/attendance - List employee attendance records
router.get("/attendance", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const { employeeId, startDate, endDate } = req.query;
  
  const attendance = await prisma.employeeAttendance.findMany({
    where: {
      ...(employeeId ? { employeeId: Number(employeeId) } : {}),
      ...(startDate && endDate
        ? { date: { gte: new Date(startDate as string), lte: new Date(endDate as string) } }
        : {}),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, position: true } },
    },
    orderBy: { date: "desc" },
  });
  
  return res.json(attendance);
});

// POST /api/staffing/attendance - Create new attendance record
router.post("/attendance", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const { employeeId, date, status, hoursWorked, notes } = req.body;
  
  const attendance = await prisma.employeeAttendance.create({
    data: {
      employeeId,
      date: new Date(date),
      status,
      hoursWorked: hoursWorked || null,
      notes: notes || null,
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, position: true } },
    },
  });
  
  return res.status(201).json(attendance);
});

// PUT /api/staffing/attendance/:id - Update attendance record
router.put("/attendance/:id", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  const { id } = req.params;
  const { status, hoursWorked, notes } = req.body;
  
  const attendance = await prisma.employeeAttendance.update({
    where: { id: Number(id) },
    data: {
      status,
      hoursWorked,
      notes,
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, position: true } },
    },
  });
  
  return res.json(attendance);
});

// DELETE /api/staffing/attendance/:id - Delete attendance record
router.delete("/attendance/:id", checkRole(["ADMIN"]), async (req, res) => {
  const { id } = req.params;
  
  await prisma.employeeAttendance.delete({
    where: { id: Number(id) },
  });
  
  return res.status(204).send();
});

// GET /api/staffing/report - Generate staffing compliance report
router.get("/report", checkRole(["DEPUTY", "ADMIN"]), async (req, res) => {
  // Get staffing table requirements
  const requirements = await prisma.staffingTable.findMany();
  
  // Get current employee distribution
  const employees = await prisma.employee.findMany({
    where: { fireDate: null },
    select: {
      position: true,
      rate: true,
    },
  });
  
  // Group by position
  const currentStaffing = employees.reduce((acc: any, emp: any) => {
    const key = emp.position;
    if (!acc[key]) {
      acc[key] = { position: emp.position, currentRate: 0 };
    }
    acc[key].currentRate += emp.rate;
    return acc;
  }, {});
  
  // Compare with requirements
  const report = requirements.map((req: any) => {
    const key = req.position;
    const current = currentStaffing[key] || { currentRate: 0 };
    return {
      position: req.position,
      requiredRate: req.requiredRate,
      currentRate: current.currentRate,
      deficit: req.requiredRate - current.currentRate,
    };
  });
  
  return res.json(report);
});

export default router;
