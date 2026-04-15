// src/prisma.ts
import { PrismaClient } from "@prisma/client";
import { getRequestPrisma } from "./lib/requestContext";
import { createScopedClientProxy } from "./lib/scopedClientProxy";

export const rootPrisma = new PrismaClient({
  log: ["error", "warn"],
});

export const prisma = createScopedClientProxy(rootPrisma, getRequestPrisma);
