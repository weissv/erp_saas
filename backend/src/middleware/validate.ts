// src/middleware/validate.ts
import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({ body: req.body, query: req.query, params: req.params });
      // Persist sanitized values back onto the request so downstream handlers receive coerced data.
      if (parsed.body) req.body = parsed.body;
      if (parsed.query) req.query = parsed.query as any;
      if (parsed.params) req.params = parsed.params;
      return next();
    } catch (error) {
      // Возвращаем zod-ошибку как есть, чтобы фронт мог отобразить точные сообщения
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          issues: error.issues,
        });
      }
      return res.status(400).json(error);
    }
  };
