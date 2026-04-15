import { AsyncLocalStorage } from "node:async_hooks";
import { PrismaClient } from "@prisma/client";

export interface RequestContextValue {
  prisma: PrismaClient;
  tenantId?: string;
}

const requestContextStorage = new AsyncLocalStorage<RequestContextValue>();

export function runWithRequestContext<T>(
  value: RequestContextValue,
  callback: () => T,
): T {
  return requestContextStorage.run(value, callback);
}

export function getRequestContext(): RequestContextValue | undefined {
  return requestContextStorage.getStore();
}

export function getRequestPrisma(): PrismaClient | undefined {
  return getRequestContext()?.prisma;
}

export function getRequestTenantId(): string | undefined {
  return getRequestContext()?.tenantId;
}