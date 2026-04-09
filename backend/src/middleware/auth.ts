// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { prisma } from "../prisma";

export interface AuthUser {
  id: number;
  role: string;
  employeeId: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Allow preflight requests to pass through without authentication
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Try to get token from cookie first
  let token = req.cookies?.auth_token;
  
  // Fallback to Authorization header for non-browser clients
  if (!token) {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      token = header.substring(7);
    }
  }
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    const activeUser = await prisma.user.findFirst({
      where: {
        id: payload.id,
        deletedAt: null,
      },
      select: {
        id: true,
        role: true,
        employeeId: true,
      },
    });

    if (!activeUser) {
      return res.status(401).json({ message: "User account is inactive" });
    }

    req.user = activeUser;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
