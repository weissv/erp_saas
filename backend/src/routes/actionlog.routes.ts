// src/routes/actionlog.routes.ts
import { Router } from "express";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
const router = Router();

router.get("/", checkRole(["DEPUTY", "ADMIN"]), async (_req, res) => {
  const logs = await prisma.actionLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 200,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });
  res.json(logs);
});

export default router;
