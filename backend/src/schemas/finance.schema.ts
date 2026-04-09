// src/schemas/finance.schema.ts
import { z } from "zod";

const FINANCE_CATEGORIES = ["NUTRITION", "CLUBS", "MAINTENANCE", "SALARY", "OTHER"] as const;
const FINANCE_CHANNELS = ["CASH", "BANK"] as const;
const INVOICE_DIRECTIONS = ["INCOMING", "OUTGOING"] as const;

export const listFinanceSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    category: z.enum(FINANCE_CATEGORIES).optional(),
    channel: z.enum(FINANCE_CHANNELS).optional(),
    posted: z.enum(["true", "false"]).optional(),
    contractorId: z.string().regex(/^\d+$/).optional(),
    personId: z.string().regex(/^\d+$/).optional(),
    cashFlowArticleId: z.string().regex(/^\d+$/).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    search: z.string().optional(),
  }),
});

export const reportFinanceSchema = z.object({
  query: z.object({
    period: z.enum(["month", "year"]).optional(),
    category: z.enum(FINANCE_CATEGORIES).optional(),
    channel: z.enum(FINANCE_CHANNELS).optional(),
  }),
});

export const summaryFinanceSchema = z.object({
  query: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    groupBy: z.enum(["month", "quarter", "year"]).optional(),
    channel: z.enum(FINANCE_CHANNELS).optional(),
  }),
});

export const listInvoicesSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
    direction: z.enum(INVOICE_DIRECTIONS).optional(),
    contractorId: z.string().regex(/^\d+$/).optional(),
    posted: z.enum(["true", "false"]).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),
});

export const listBalancesSchema = z.object({
  query: z.object({
    snapshotDate: z.coerce.date().optional(),
  }),
});

export const listDebtorsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),
});
