import { prisma } from "../../../prisma";
import { buildOrderBy, buildPagination, createPaginatedResponse } from "../../../utils/query";
import type {
  OneCBalancesResponse,
  OneCDebtorsResponse,
} from "./contracts";

export const oneCFinanceAllowedRoles = ["ACCOUNTANT", "DEPUTY", "ADMIN"];

interface ListInvoicesQuery {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  direction?: "INCOMING" | "OUTGOING";
  contractorId?: string;
  posted?: "true" | "false";
  startDate?: Date;
  endDate?: Date;
}

interface ListBalancesQuery {
  snapshotDate?: Date;
}

interface ListDebtorsQuery {
  page?: string;
  pageSize?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

const isValidDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());

const coerceDate = (value: unknown) => {
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(String(value));
  return isValidDate(parsed) ? parsed : null;
};

const appendDateRange = (where: Record<string, any>, start?: unknown, end?: unknown, field = "date") => {
  const startDate = coerceDate(start);
  const endDate = coerceDate(end);
  if (!startDate && !endDate) return;
  where[field] = {};
  if (startDate) where[field].gte = startDate;
  if (endDate) where[field].lte = endDate;
};

export async function listOneCInvoices(query: ListInvoicesQuery) {
  const { page, pageSize, skip, take } = buildPagination(query);
  const orderBy = buildOrderBy(query, ["date", "totalAmount", "documentNumber", "id"]);
  const where: any = {};

  if (query.direction) where.direction = query.direction;
  if (query.contractorId) where.contractorId = Number(query.contractorId);
  if (query.posted !== undefined) where.posted = query.posted === "true";
  appendDateRange(where, query.startDate, query.endDate);

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        contractor: { select: { id: true, name: true, inn: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return createPaginatedResponse(items, total, page, pageSize);
}

export async function getOneCBalances(query: ListBalancesQuery): Promise<OneCBalancesResponse> {
  const latestDate = query.snapshotDate
    ? new Date(query.snapshotDate)
    : await prisma.balanceSnapshot
        .findFirst({ orderBy: { snapshotDate: "desc" }, select: { snapshotDate: true } })
        .then((record) => record?.snapshotDate ?? new Date());

  const snapshots = await prisma.balanceSnapshot.findMany({
    where: { snapshotDate: latestDate, balanceType: { in: ["CASH", "BANK"] } },
    select: {
      balanceType: true,
      amount: true,
      label: true,
    },
  });

  return {
    snapshotDate: latestDate,
    balances: snapshots.map((snapshot) => ({
      type: snapshot.balanceType,
      amount: Number(snapshot.amount),
      label: snapshot.label,
    })),
  };
}

export async function listOneCDebtors(query: ListDebtorsQuery): Promise<OneCDebtorsResponse> {
  const { page, pageSize, skip, take } = buildPagination(query);

  const latestDate = await prisma.balanceSnapshot
    .findFirst({
      where: { balanceType: "CONTRACTOR_DEBT" },
      orderBy: { snapshotDate: "desc" },
      select: { snapshotDate: true },
    })
    .then((record) => record?.snapshotDate ?? null);

  if (!latestDate) {
    return {
      snapshotDate: null,
      ...createPaginatedResponse([], 0, page, pageSize),
    };
  }

  const where = { snapshotDate: latestDate, balanceType: "CONTRACTOR_DEBT" as const };

  const [items, total] = await Promise.all([
    prisma.balanceSnapshot.findMany({
      where,
      skip,
      take,
      orderBy: { amount: "desc" },
      include: {
        contractor: { select: { id: true, name: true, inn: true } },
      },
    }),
    prisma.balanceSnapshot.count({ where }),
  ]);

  return {
    snapshotDate: latestDate,
    ...createPaginatedResponse(
      items.map((snapshot) => ({
        contractorId: snapshot.contractorId,
        contractorName: snapshot.contractor?.name ?? snapshot.label ?? "Без названия",
        contractorInn: snapshot.contractor?.inn,
        amount: Number(snapshot.amount),
      })),
      total,
      page,
      pageSize,
    ),
  };
}