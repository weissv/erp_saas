// src/middleware/checkRole.ts
import { Request, Response, NextFunction } from "express";
import { FULL_ACCESS_ROLES } from "../constants";

export const checkRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    
    // DEVELOPER и DIRECTOR имеют полный доступ
    if ((FULL_ACCESS_ROLES as readonly string[]).includes(user.role)) return next();
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};
