// src/middleware/actionLogger.ts
import { Request, Response, NextFunction } from "express";
import { prisma } from "../prisma";

// Универсальный логгер действий
export const logAction =
  (action: string, details?: (req: Request) => any) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        await prisma.actionLog.create({
          data: {
            userId: req.user.id,
            action,
            details: details ? details(req) : undefined,
          },
        });
      }
    } catch (e) {
      // Не валим основной флоу, если логирование упало
      console.warn("ActionLog error:", e);
    }
    next();
  };
