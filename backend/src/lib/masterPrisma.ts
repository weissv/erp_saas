// src/lib/masterPrisma.ts
// Singleton Prisma client for the Control Plane (master) database.
// This client is used exclusively for tenant look-ups and global settings.

import { PrismaClient } from "@prisma/master-client";

let instance: PrismaClient | undefined;

/**
 * Returns a singleton PrismaClient that is connected to the Control Plane
 * (master) database.  Reuses the same instance for the lifetime of the process.
 */
export function getMasterPrisma(): PrismaClient {
  if (!instance) {
    instance = new PrismaClient({
      log: ["error", "warn"],
      datasourceUrl: process.env.MASTER_DATABASE_URL,
    });
  }
  return instance;
}

/**
 * Gracefully shuts down the master Prisma client.
 * Call this during application shutdown.
 */
export async function disconnectMaster(): Promise<void> {
  if (instance) {
    await instance.$disconnect();
    instance = undefined;
  }
}
