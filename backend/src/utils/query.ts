// src/utils/query.ts
import { Prisma } from "@prisma/client";

export type ListQuery = {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: any;
};

export const buildPagination = (q: ListQuery) => {
  const page = Math.max(parseInt(q.page || "1", 10), 1);
  const pageSize = Math.min(Math.max(parseInt(q.pageSize || "20", 10), 1), 200);
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  return { page, pageSize, skip, take };
};

export const buildOrderBy = (q: ListQuery, allowed: string[] = ["id"]) => {
  const safeColumns = allowed.length ? allowed : ["id"];
  const requestedColumn = typeof q.sortBy === "string" ? q.sortBy : "";
  const sortBy = safeColumns.includes(requestedColumn) ? requestedColumn : safeColumns[0];
  const sortOrder: Prisma.SortOrder = q.sortOrder === "desc" ? "desc" : "asc";
  return { [sortBy]: sortOrder } as Prisma.Enumerable<Record<string, Prisma.SortOrder>>;
};

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  limit: number;
  pages: number;
}

export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page, pageSize, totalPages, limit: pageSize, pages: totalPages };
}

// Простой конструктор where из query: eq-поиск по полям
export const buildWhere = <T extends Record<string, any>>(q: ListQuery, allowed: string[]) => {
  const where: Record<string, any> = {};
  for (const key of allowed) {
    const val = q[key];
    if (val !== undefined && val !== "") {
      where[key] = isNaN(Number(val)) ? val : Number(val);
    }
  }
  return where as T;
};
