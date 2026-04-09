import { prisma as db } from "../../../prisma";
import { buildPagination, createPaginatedResponse } from "../../../utils/query";
import type {
  OneCGroupedCount,
  OneCSummary,
} from "./contracts";

export const oneCAllowedRoles = ["ADMIN", "ACCOUNTANT", "DIRECTOR"];

const catalogModels: Record<string, string> = {
  organizations: "oneCOrganization",
  nomenclature: "oneCNomenclature",
  "bank-accounts": "oneCBankAccount",
  contracts: "oneCContract",
  employees: "oneCEmployee",
  positions: "oneCPosition",
  "fixed-assets": "oneCFixedAsset",
  warehouses: "oneCWarehouse",
  currencies: "oneCCurrency",
  departments: "oneCDepartment",
};

type QueryValue = string | string[] | undefined;
type QueryRecord = Record<string, QueryValue>;

function getQueryValue(value: QueryValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseQueryArray(value: QueryValue): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v) => v.split(",")).filter(Boolean);
  }
  return value ? value.split(",").filter(Boolean) : [];
}

function groupCount(value: any): number {
  if (typeof value === "number") return value;
  if (value && typeof value._all === "number") return value._all;
  return 0;
}

function createDateFilter(query: QueryRecord) {
  const from = getQueryValue(query.from);
  const to = getQueryValue(query.to);
  const filter: Record<string, Date> = {};

  if (from) filter.gte = new Date(from);
  if (to) filter.lte = new Date(to);

  return Object.keys(filter).length > 0 ? filter : undefined;
}

function mapGroupedCounts(
  items: Array<{ [key: string]: any; _count: unknown }>,
  key: string,
): OneCGroupedCount[] {
  return items.map((item) => ({
    type: item[key],
    count: groupCount(item._count),
  }));
}

export async function getOneCSummary(): Promise<OneCSummary> {
  const [
    organizations,
    nomenclature,
    bankAccounts,
    contracts,
    employees,
    positions,
    fixedAssets,
    warehouses,
    currencies,
    departments,
    documents,
    hrDocuments,
    payrollDocuments,
    universalCatalogs,
    registers,
  ] = await Promise.all([
    db.oneCOrganization.count(),
    db.oneCNomenclature.count(),
    db.oneCBankAccount.count(),
    db.oneCContract.count(),
    db.oneCEmployee.count(),
    db.oneCPosition.count(),
    db.oneCFixedAsset.count(),
    db.oneCWarehouse.count(),
    db.oneCCurrency.count(),
    db.oneCDepartment.count(),
    db.oneCDocument.count(),
    db.oneCHRDocument.count(),
    db.oneCPayrollDocument.count(),
    db.oneCCatalog.count(),
    db.oneCRegister.count(),
  ]);

  const [docTypes, hrDocTypes, payrollDocTypes, catalogTypes, registerTypes] = await Promise.all([
    db.oneCDocument.groupBy({ by: ["docType"], _count: true }),
    db.oneCHRDocument.groupBy({ by: ["docType"], _count: true }),
    db.oneCPayrollDocument.groupBy({ by: ["docType"], _count: true }),
    db.oneCCatalog.groupBy({ by: ["catalogType"], _count: true }),
    db.oneCRegister.groupBy({ by: ["registerType"], _count: true }),
  ]);

  return {
    catalogs: {
      organizations,
      nomenclature,
      bankAccounts,
      contracts,
      employees,
      positions,
      fixedAssets,
      warehouses,
      currencies,
      departments,
    },
    documents: { total: documents, byType: mapGroupedCounts(docTypes as any[], "docType") },
    hrDocuments: { total: hrDocuments, byType: mapGroupedCounts(hrDocTypes as any[], "docType") },
    payrollDocuments: { total: payrollDocuments, byType: mapGroupedCounts(payrollDocTypes as any[], "docType") },
    universalCatalogs: { total: universalCatalogs, byType: mapGroupedCounts(catalogTypes as any[], "catalogType") },
    registers: { total: registers, byType: mapGroupedCounts(registerTypes as any[], "registerType") },
  };
}

export async function listOneCCatalog(type: string, query: QueryRecord) {
  const modelField = catalogModels[type];
  if (!modelField) {
    throw new Error("UNKNOWN_CATALOG_TYPE");
  }

  const { page, pageSize, skip, take } = buildPagination(query);
  const search = (getQueryValue(query.search) || "").trim();
  const model = (db as any)[modelField];
  const where = search ? { name: { contains: search, mode: "insensitive" } } : {};

  const [items, total] = await Promise.all([
    model.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    model.count({ where }),
  ]);

  return createPaginatedResponse(items, total, page, pageSize);
}

export async function listOneCDocuments(query: QueryRecord) {
  const { page, pageSize, skip, take } = buildPagination(query);
  const docType = getQueryValue(query.docType);
  const search = (getQueryValue(query.search) || "").trim();
  const date = createDateFilter(query);
  const where: any = {};

  if (docType) where.docType = docType;
  if (date) where.date = date;
  if (search) {
    where.OR = [
      { documentNumber: { contains: search, mode: "insensitive" } },
      { comment: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    db.oneCDocument.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
    }),
    db.oneCDocument.count({ where }),
  ]);

  return createPaginatedResponse(items, total, page, pageSize);
}

export async function listOneCHRDocuments(query: QueryRecord) {
  const { page, pageSize, skip, take } = buildPagination(query);
  const docType = getQueryValue(query.docType);
  const search = (getQueryValue(query.search) || "").trim();
  const date = createDateFilter(query);
  const where: any = {};

  if (docType) where.docType = docType;
  if (date) where.date = date;
  if (search) {
    where.OR = [
      { documentNumber: { contains: search, mode: "insensitive" } },
      { employeeName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    db.oneCHRDocument.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
    }),
    db.oneCHRDocument.count({ where }),
  ]);

  return createPaginatedResponse(items, total, page, pageSize);
}

export async function listOneCPayrollDocuments(query: QueryRecord) {
  const { page, pageSize, skip, take } = buildPagination(query);
  const docType = getQueryValue(query.docType);
  const date = createDateFilter(query);
  const where: any = {};

  if (docType) where.docType = docType;
  if (date) where.date = date;

  const [items, total] = await Promise.all([
    db.oneCPayrollDocument.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take,
    }),
    db.oneCPayrollDocument.count({ where }),
  ]);

  return createPaginatedResponse(items, total, page, pageSize);
}

export async function listOneCUniversalCatalogs(query: QueryRecord) {
  const { page, pageSize, skip, take } = buildPagination(query);
  const catalogType = getQueryValue(query.catalogType);
  const search = (getQueryValue(query.search) || "").trim();
  const where: any = {};

  if (catalogType) where.catalogType = catalogType;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { code: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    db.oneCCatalog.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
    }),
    db.oneCCatalog.count({ where }),
  ]);

  return createPaginatedResponse(items, total, page, pageSize);
}

export async function listOneCRegisters(query: QueryRecord) {
  const { page, pageSize, skip, take } = buildPagination(query);
  const registerType = getQueryValue(query.registerType);
  const registerKind = getQueryValue(query.registerKind);

  const registerTypesRaw = query.registerTypes;
  const registerTypes = parseQueryArray(registerTypesRaw);

  const where: any = {};

  if (registerType) {
    where.registerType = registerType;
  } else if (registerTypes.length > 0) {
    where.registerType = { in: registerTypes };
  }
  if (registerKind) where.registerKind = registerKind;

  const [items, total] = await Promise.all([
    db.oneCRegister.findMany({
      where,
      orderBy: { period: "desc" },
      skip,
      take,
    }),
    db.oneCRegister.count({ where }),
  ]);

  return createPaginatedResponse(items, total, page, pageSize);
}