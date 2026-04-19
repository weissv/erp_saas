// src/utils/query.ts
import { Prisma } from "@prisma/client";
import { PAGINATION } from "../constants";

export type ListQuery = {
  page?: unknown;
  pageSize?: unknown;
  sortBy?: unknown;
  sortOrder?: "asc" | "desc";
};

function unwrapQueryValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.length > 0 ? unwrapQueryValue(value[0]) : undefined;
  }
  return value;
}

function getQueryString(value: unknown): string | undefined {
  const normalized = unwrapQueryValue(value);

  if (normalized === undefined || normalized === null || typeof normalized === "object") {
    return undefined;
  }

  return String(normalized);
}

function getPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(getQueryString(value) ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

type PaginationQuery = Pick<ListQuery, "page" | "pageSize">;
type SortableQuery = Pick<ListQuery, "sortBy" | "sortOrder">;

export const buildPagination = (q: PaginationQuery) => {
  const page = Math.max(getPositiveInteger(q.page, PAGINATION.DEFAULT_PAGE), 1);
  const pageSize = Math.min(
    Math.max(getPositiveInteger(q.pageSize, PAGINATION.DEFAULT_PAGE_SIZE), PAGINATION.MIN_PAGE_SIZE),
    PAGINATION.MAX_PAGE_SIZE
  );
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  return { page, pageSize, skip, take };
};

export const buildOrderBy = (q: SortableQuery, allowed: string[] = ["id"]) => {
  const safeColumns = allowed.length ? allowed : ["id"];
  const requestedColumn = getQueryString(q.sortBy) ?? "";
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
export const buildWhere = <T extends Record<string, unknown>>(q: object, allowed: string[]): Partial<T> => {
  const where: Record<string, unknown> = {};
  const query = q as Record<string, unknown>;
  for (const key of allowed) {
    const val = unwrapQueryValue(query[key]);
    if (val !== undefined && val !== "") {
      if (val instanceof Date) {
        where[key] = val;
      } else if (typeof val === "number" || typeof val === "boolean") {
        where[key] = val;
      } else if (typeof val === "string") {
        where[key] = Number.isNaN(Number(val)) ? val : Number(val);
      }
    }
  }
  return where as Partial<T>;
};
