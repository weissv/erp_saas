import { Router } from "express";
import * as XLSX from "xlsx";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";
import { Prisma, ChildStatus, InventoryType, FinanceType, FinanceCategory, FinanceSource } from "@prisma/client";
import { prisma } from "../prisma";
import { checkRole } from "../middleware/checkRole";
import { validate } from "../middleware/validate";
import {
  exportExcelSchema,
  importExcelSchema,
  importGoogleSheetSchema,
  IntegrationEntity,
} from "../schemas/export.schema";
import { csvTextToRecords } from "../utils/csv";

const router = Router();

type ImportRow = Record<string, any>;

type ImportStats = {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
};

const defaultStats = (): ImportStats => ({ processed: 0, created: 0, updated: 0, skipped: 0 });

const entityExporters: Record<IntegrationEntity, () => Promise<Record<string, unknown>[]>> = {
  children: async () => {
    const children = await prisma.child.findMany({
      include: {
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        parents: {
          select: { fullName: true, relation: true, phone: true },
        },
      },
      orderBy: [{ group: { name: "asc" } }, { lastName: "asc" }, { firstName: "asc" }],
    });

    const genderLabel = (g: string | null) => {
      if (g === "MALE") return "Мужской";
      if (g === "FEMALE") return "Женский";
      return g ?? "";
    };

    return children.map((child, index) => {
      const father = child.parents.find((p) => p.relation === "отец");
      const mother = child.parents.find((p) => p.relation === "мать");
      const phones = child.parents.map((p) => p.phone).filter(Boolean).join(", ");

      return {
        "№": index + 1,
        "Ф.И.О. ребенка": [child.lastName, child.firstName, child.middleName].filter(Boolean).join(" "),
        "Класс": child.group?.name ?? "",
        "Адрес проживания": child.address ?? "",
        "Дата рождения": child.birthDate.toLocaleDateString("ru-RU"),
        "Национальность": child.nationality ?? "",
        "Пол": genderLabel(child.gender),
        "Номер метрики": child.birthCertificateNumber ?? "",
        "Ф.И.О. отца": father?.fullName ?? child.fatherName ?? "",
        "Ф.И.О. матери": mother?.fullName ?? child.motherName ?? "",
        "Телефоны родителей": phones || child.parentPhone || "",
        "№ Договора": child.contractNumber ?? "",
        "Дата договора": child.contractDate ? child.contractDate.toLocaleDateString("ru-RU") : "",
        "Статус": child.status,
      };
    });
  },
  employees: async () => {
    const employees = await prisma.employee.findMany({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return employees.map((employee) => ({
      ID: employee.id,
      "First Name": employee.firstName,
      "Last Name": employee.lastName,
      Position: employee.position,
      Rate: employee.rate,
      "Hire Date": employee.hireDate.toISOString().split("T")[0],
      "Contract End Date": employee.contractEndDate?.toISOString().split("T")[0] ?? "",
      "Medical Checkup Date": employee.medicalCheckupDate?.toISOString().split("T")[0] ?? "",
    }));
  },
  inventory: async () => {
    const items = await prisma.inventoryItem.findMany({
      include: { ingredient: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });

    return items.map((item) => ({
      ID: item.id,
      Name: item.name,
      Quantity: item.quantity,
      Unit: item.unit,
      Type: item.type,
      "Expiry Date": item.expiryDate?.toISOString().split("T")[0] ?? "",
      "Ingredient ID": item.ingredientId ?? "",
      "Ingredient Name": item.ingredient?.name ?? "",
    }));
  },
  finance: async () => {
    const transactions = await prisma.financeTransaction.findMany({
      include: { club: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
    });

    return transactions.map((tx) => ({
      ID: tx.id,
      Amount: tx.amount.toString(),
      Type: tx.type,
      Category: tx.category,
      Source: tx.source,
      Description: tx.description ?? "",
      Date: tx.date.toISOString().split("T")[0],
      "Club ID": tx.clubId ?? "",
      "Club Name": tx.club?.name ?? "",
    }));
  },
};

const entityImporters: Record<IntegrationEntity, (rows: ImportRow[]) => Promise<ImportStats>> = {
  children: async (rows) => {
    const stats = defaultStats();

    // Pre-load groups for matching by name
    const allGroups = await prisma.group.findMany();

    for (const row of rows) {
      stats.processed += 1;

      // Try to parse full name from "Ф.И.О. ребенка" column
      const fullName = getString(row, "Ф.И.О. ребенка", "ФИО ребенка", "Full Name");
      let firstName: string | undefined;
      let lastName: string | undefined;
      let middleName: string | undefined;

      if (fullName) {
        const parts = fullName.trim().split(/\s+/);
        lastName = parts[0];
        firstName = parts[1];
        middleName = parts.slice(2).join(" ") || undefined;
      } else {
        firstName = getString(row, "First Name", "firstName", "Имя");
        lastName = getString(row, "Last Name", "lastName", "Фамилия");
        middleName = getString(row, "Отчество", "middleName") ?? undefined;
      }

      if (!firstName || !lastName) {
        stats.skipped += 1;
        continue;
      }

      // Resolve group: try "Класс" column, then "Group ID"
      let groupId = getInt(row, "Group ID", "groupId");
      const className = getString(row, "Класс", "Class");
      if (!groupId && className) {
        // Normalize class name: remove extra quotes/spaces
        const normalized = className.replace(/[""«»]/g, '"').trim();
        const group = allGroups.find((g) => g.name === normalized || g.name === className);
        if (group) {
          groupId = group.id;
        } else {
          // Auto-create the group
          const newGroup = await prisma.group.create({ data: { name: className } });
          allGroups.push(newGroup);
          groupId = newGroup.id;
        }
      }

      if (!groupId) {
        stats.skipped += 1;
        continue;
      }

      // Parse dates
      const birthDate = parseDateFlexible(row, "Дата рождения", "Birth Date", "birthDate");
      if (!birthDate) {
        stats.skipped += 1;
        continue;
      }

      const contractDate = parseDateFlexible(row, "дата договора", "Дата договора", "Contract Date", "contractDate") ?? undefined;

      const status = (getEnum(row, Object.values(ChildStatus), "Status", "status", "Статус") ?? ChildStatus.ACTIVE) as ChildStatus;
      const payload = {
        firstName,
        lastName,
        middleName: middleName ?? null,
        birthDate,
        groupId,
        status,
        address: getString(row, "Адрес проживания", "Address", "address") ?? null,
        nationality: getString(row, "Национальность", "Nationality", "nationality") ?? null,
        gender: (getString(row, "Пол", "Gender", "gender") as import('@prisma/client').Gender) ?? null,
        birthCertificateNumber: getString(row, "Номер метрики", "Номер метрки", "Birth Certificate", "birthCertificateNumber") ?? null,
        fatherName: getString(row, "Ф.И.О. отца", "ФИО отца", "Father Name", "fatherName") ?? null,
        motherName: getString(row, "Ф.И.О. матери", "ФИО матери", "Mother Name", "motherName") ?? null,
        parentPhone: getString(row, "телефоны родителей", "Телефоны родителей", "Parent Phone", "parentPhone") ?? null,
        contractNumber: getString(row, "№ Договора", "Contract Number", "contractNumber") ?? null,
        contractDate: contractDate ?? null,
      };

      const id = getInt(row, "ID", "id", "№");
      try {
        // For CSV imports we always create (don't upsert by row number "№")
        // Only upsert if there's a real ID
        const realId = getInt(row, "ID", "id");
        await upsertByNumericId(
          realId,
          (numericId) => prisma.child.update({ where: { id: numericId }, data: payload }),
          (numericId) =>
            prisma.child.create({
              data: {
                ...payload,
                ...(numericId ? { id: numericId } : {}),
              },
            }),
          stats
        );
      } catch (error) {
        stats.skipped += 1;
      }
    }
    return stats;
  },
  employees: async (rows) => {
    const stats = defaultStats();
    for (const row of rows) {
      stats.processed += 1;
      const firstName = getString(row, "First Name", "firstName");
      const lastName = getString(row, "Last Name", "lastName");
      const position = getString(row, "Position", "position");
      const rate = getNumber(row, "Rate", "rate") ?? 1;
      const hireDate = getDate(row, "Hire Date", "hireDate") ?? new Date();
      if (!firstName || !lastName || !position) {
        stats.skipped += 1;
        continue;
      }
      const payload = {
        firstName,
        lastName,
        position,
        rate,
        hireDate,
        contractEndDate: getDate(row, "Contract End Date", "contractEndDate") ?? undefined,
        medicalCheckupDate: getDate(row, "Medical Checkup Date", "medicalCheckupDate") ?? undefined,
      };
      const id = getInt(row, "ID", "id");
      try {
        await upsertByNumericId(
          id,
          (numericId) => prisma.employee.update({ where: { id: numericId }, data: payload }),
          (numericId) =>
            prisma.employee.create({
              data: {
                ...payload,
                ...(numericId ? { id: numericId } : {}),
              },
            }),
          stats
        );
      } catch (error) {
        stats.skipped += 1;
      }
    }
    return stats;
  },
  inventory: async (rows) => {
    const stats = defaultStats();
    for (const row of rows) {
      stats.processed += 1;
      const name = getString(row, "Name", "name");
      const quantity = getNumber(row, "Quantity", "quantity");
      const unit = getString(row, "Unit", "unit");
      if (!name || quantity === undefined || !unit) {
        stats.skipped += 1;
        continue;
      }
      const type =
        (getEnum(row, Object.values(InventoryType), "Type", "type") as InventoryType | undefined) ?? InventoryType.FOOD;
      const payload = {
        name,
        quantity,
        unit,
        type,
        expiryDate: getDate(row, "Expiry Date", "expiryDate") ?? undefined,
        ingredientId: getInt(row, "Ingredient ID", "ingredientId") ?? undefined,
      };
      const id = getInt(row, "ID", "id");
      try {
        await upsertByNumericId(
          id,
          (numericId) => prisma.inventoryItem.update({ where: { id: numericId }, data: payload }),
          (numericId) =>
            prisma.inventoryItem.create({
              data: {
                ...payload,
                ...(numericId ? { id: numericId } : {}),
              },
            }),
          stats
        );
      } catch (error) {
        stats.skipped += 1;
      }
    }
    return stats;
  },
  finance: async (rows) => {
    const stats = defaultStats();
    for (const row of rows) {
      stats.processed += 1;
      const amount = getString(row, "Amount", "amount");
      const type = getEnum(row, Object.values(FinanceType), "Type", "type") as FinanceType | undefined;
      const category = getEnum(row, Object.values(FinanceCategory), "Category", "category") as FinanceCategory | undefined;
      const date = getDate(row, "Date", "date");
      if (!amount || !type || !category || !date) {
        stats.skipped += 1;
        continue;
      }
      const payload = {
        amount: new Prisma.Decimal(amount.replace(/,/g, ".")),
        type,
        category,
        source: (getEnum(row, Object.values(FinanceSource), "Source", "source") as FinanceSource | undefined) ?? FinanceSource.BUDGET,
        description: getString(row, "Description", "description") ?? undefined,
        date,
        clubId: getInt(row, "Club ID", "clubId") ?? undefined,
      };
      const id = getInt(row, "ID", "id");
      try {
        await upsertByNumericId(
          id,
          (numericId) => prisma.financeTransaction.update({ where: { id: numericId }, data: payload }),
          (numericId) =>
            prisma.financeTransaction.create({
              data: {
                ...payload,
                ...(numericId ? { id: numericId } : {}),
              },
            }),
          stats
        );
      } catch (error) {
        stats.skipped += 1;
      }
    }
    return stats;
  },
};

router.get(
  "/export/excel/:entity",
  checkRole(["DIRECTOR", "DEPUTY", "ADMIN", "ACCOUNTANT"]),
  validate(exportExcelSchema),
  async (req, res) => {
    const entity = req.params.entity as IntegrationEntity;
    const exporter = entityExporters[entity];
    if (!exporter) {
      return res.status(400).json({ message: "Unknown entity" });
    }

    const rows = await exporter();
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, entity.toUpperCase());
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=${entity}-export-${new Date().toISOString().split("T")[0]}.xlsx`);
    return res.send(buffer);
  }
);

router.post(
  "/import/excel/:entity",
  checkRole(["DEPUTY", "ADMIN"]),
  validate(importExcelSchema),
  async (req, res) => {
    const entity = req.params.entity as IntegrationEntity;
    const importer = entityImporters[entity];
    if (!importer) {
      return res.status(400).json({ message: "Unknown entity" });
    }

    const fileBase64 = sanitizeBase64(req.body.fileBase64);
    const buffer = Buffer.from(fileBase64, "base64");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const [firstSheetName] = workbook.SheetNames;
    if (!firstSheetName) {
      return res.status(400).json({ message: "Не удалось прочитать Excel-файл" });
    }

    const sheet = workbook.Sheets[firstSheetName];
    let rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });

    // If entity is children and standard headers not found, try to detect header row
    if (entity === "children" && rows.length > 0) {
      const firstRow = rows[0];
      const hasStandardHeaders = Object.keys(firstRow).some(
        (k) => k.includes("Ф.И.О.") || k.includes("ребенка") || k === "First Name" || k === "Класс"
      );
      if (!hasStandardHeaders) {
        // Find the header row by scanning raw data
        const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
        let headerRowIndex = -1;
        for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) {
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            if (cell && typeof cell.v === "string" && (cell.v.includes("Ф.И.О.") || cell.v.includes("ребенка"))) {
              headerRowIndex = r;
              break;
            }
          }
          if (headerRowIndex >= 0) break;
        }
        if (headerRowIndex >= 0) {
          rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "", range: headerRowIndex });
        }
      }
    }

    const stats = await importer(rows);
    return res.json({ entity, rows: rows.length, ...stats });
  }
);

router.post(
  "/import/google-sheets",
  checkRole(["DEPUTY", "ADMIN"]),
  validate(importGoogleSheetSchema),
  async (req, res) => {
    const { entity, sheetUrl } = req.body as { entity: IntegrationEntity; sheetUrl: string };
    const importer = entityImporters[entity];
    if (!importer) {
      return res.status(400).json({ message: "Unknown entity" });
    }

    const csvUrl = buildGoogleCsvUrl(sheetUrl);
    const csvText = await fetchCsv(csvUrl);
    let rows = csvTextToRecords<ImportRow>(csvText);

    // For children entity, try to detect header row in CSV with multi-row headers
    if (entity === "children" && rows.length > 0) {
      const firstRow = rows[0];
      const hasStandardHeaders = Object.keys(firstRow).some(
        (k) => k.includes("Ф.И.О.") || k.includes("ребенка") || k === "First Name" || k === "Класс"
      );
      if (!hasStandardHeaders) {
        // Find the row that contains the actual headers
        const headerIdx = rows.findIndex((r) =>
          Object.values(r).some((v) => typeof v === "string" && (v.includes("Ф.И.О.") || v.includes("ребенка")))
        );
        if (headerIdx >= 0) {
          const headerRow = rows[headerIdx];
          const headers = Object.values(headerRow).map((v) => String(v).trim());
          const dataRows = rows.slice(headerIdx + 1);
          rows = dataRows.map((r) => {
            const values = Object.values(r);
            const mapped: ImportRow = {};
            headers.forEach((h, i) => {
              if (h && values[i] !== undefined) mapped[h] = values[i];
            });
            return mapped;
          });
        }
      }
    }

    const stats = await importer(rows);
    return res.json({ entity, source: "google-sheets", rows: rows.length, ...stats });
  }
);

function getString(row: ImportRow, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null) {
      continue;
    }
    const str = String(value).trim();
    if (str.length) {
      return str;
    }
  }
  return undefined;
}

function getNumber(row: ImportRow, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, "."));
    if (!Number.isNaN(num)) {
      return num;
    }
  }
  return undefined;
}

function getInt(row: ImportRow, ...keys: string[]): number | undefined {
  const num = getNumber(row, ...keys);
  if (num === undefined) {
    return undefined;
  }
  const intVal = Math.trunc(num);
  return Number.isFinite(intVal) ? intVal : undefined;
}

function getDate(row: ImportRow, ...keys: string[]): Date | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }
  return undefined;
}

// Flexible date parser: handles "DD.MM.YYYY", "M/D/YYYY", ISO, and Excel serial numbers
function parseDateFlexible(row: ImportRow, ...keys: string[]): Date | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }
    // Excel serial date number
    if (typeof value === "number" && value > 10000 && value < 100000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      if (!Number.isNaN(date.getTime())) return date;
    }
    const str = String(value).trim();
    if (!str) continue;
    // DD.MM.YYYY
    const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotMatch) {
      const date = new Date(Number(dotMatch[3]), Number(dotMatch[2]) - 1, Number(dotMatch[1]));
      if (!Number.isNaN(date.getTime())) return date;
    }
    // M/D/YYYY or MM/DD/YYYY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const date = new Date(Number(slashMatch[3]), Number(slashMatch[1]) - 1, Number(slashMatch[2]));
      if (!Number.isNaN(date.getTime())) return date;
    }
    // Fallback to standard Date parse
    const date = new Date(str);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}

function getEnum<T extends string>(row: ImportRow, values: readonly T[], ...keys: string[]): T | undefined {
  const str = getString(row, ...keys);
  if (!str) {
    return undefined;
  }
  const normalized = str.replace(/\s+/g, "_").toUpperCase();
  return values.find((value) => value === normalized);
}

async function upsertByNumericId(
  id: number | undefined,
  updateFn: (id: number) => Promise<unknown>,
  createFn: (id?: number) => Promise<unknown>,
  stats: ImportStats
) {
  if (id) {
    try {
      await updateFn(id);
      stats.updated += 1;
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        await createFn(id);
        stats.created += 1;
        return;
      }
      throw error;
    }
  }
  await createFn(undefined);
  stats.created += 1;
}

function sanitizeBase64(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes(",")) {
    return trimmed.split(",").pop() as string;
  }
  return trimmed;
}

function buildGoogleCsvUrl(sheetUrl: string): string {
  try {
    const url = new URL(sheetUrl);
    if (url.pathname.includes("/export")) {
      url.searchParams.set("format", "csv");
      return url.toString();
    }
    if (url.pathname.includes("/edit")) {
      const gidParam = url.searchParams.get("gid") ?? "0";
      const basePath = url.pathname.replace(/\/edit.*/, "");
      url.pathname = `${basePath}/export`;
      url.search = `format=csv&gid=${gidParam}`;
      return url.toString();
    }
    url.searchParams.set("format", "csv");
    return url.toString();
  } catch (error) {
    return sheetUrl;
  }
}

function fetchCsv(targetUrl: string, redirectCount = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) {
      reject(new Error("Too many redirects while fetching Google Sheet"));
      return;
    }
    const client = targetUrl.startsWith("https") ? https : http;
    const req = client.request(targetUrl, { method: "GET", headers: { Accept: "text/csv" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, targetUrl).toString();
        req.destroy();
        fetchCsv(nextUrl, redirectCount + 1).then(resolve).catch(reject);
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`Failed to fetch Google Sheet (${res.statusCode ?? "unknown"})`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
    req.on("error", reject);
    req.end();
  });
}

export default router;
