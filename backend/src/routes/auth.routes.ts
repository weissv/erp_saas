// src/routes/auth.routes.ts
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { JWT } from "../constants";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { logger } from "../utils/logger";

const router = Router();

// Публичный роут для входа
router.post("/login", asyncHandler(async (req: Request, res: Response) => {
  const { email, login, password } = req.body;
  const identifier = login || email;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Email/login and password are required" });
  }

  // Use tenant-scoped prisma when available, fallback to global for backward compat
  const db = req.prisma ?? prisma;

  const user = await db.user.findFirst({
    where: {
      email: identifier,
      deletedAt: null,
    },
    include: { employee: true },
  });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, employeeId: user.employeeId } as object,
    config.jwtSecret,
    { expiresIn: JWT.EXPIRES_IN }
  );

  // Set HttpOnly cookie
  const cookieOptions = {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "none" as const,
    maxAge: JWT.COOKIE_MAX_AGE,
  };
  
  res.cookie(JWT.COOKIE_NAME, token, cookieOptions);
  
  // Remove sensitive data
  const { passwordHash, ...sanitizedUser } = user;
  return res.json({ user: sanitizedUser, token });
}));

// Session probe route: returns null instead of 401 when user is not authenticated
router.get("/me", asyncHandler(async (req: Request, res: Response) => {
  let token = req.cookies?.[JWT.COOKIE_NAME];

  if (!token) {
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      token = header.substring(7);
    }
  }

  if (!token) {
    return res.json({ user: null });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as { id?: number };
    if (!payload?.id) {
      return res.json({ user: null });
    }

    const db = req.prisma ?? prisma;

    const me = await db.user.findFirst({
      where: {
        id: payload.id,
        deletedAt: null,
      },
      include: { employee: true },
    });

    if (!me) {
      return res.json({ user: null });
    }

    const { passwordHash, ...sanitizedUser } = me;
    return res.json({ user: sanitizedUser });
  } catch {
    return res.json({ user: null });
  }
}));

// Logout route - clears the cookie
router.post("/logout", (_req: Request, res: Response) => {
  res.cookie(JWT.COOKIE_NAME, "", {
    httpOnly: true,
    expires: new Date(0),
    secure: config.nodeEnv === "production",
    sameSite: "none" as const,
  });
  return res.status(200).json({ message: "Logged out successfully" });
});

export default router;