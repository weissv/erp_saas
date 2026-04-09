import { EMPTY_GUID, type SyncContext, type SyncResult } from "./sync-context";
import { MISSING_CATALOGS, CHART_ENTITIES, ALL_REGISTERS, EXTRA_REGISTERS } from "./entity-registry";
import { logger } from "../../../../utils/logger";

export async function syncUniversalCatalog(ctx: SyncContext, entityName: string): Promise<SyncResult> {
  const catalogType = entityName
    .replace(/^Catalog_/, "")
    .replace(/^ChartOfAccounts_/, "ПланСчетов_")
    .replace(/^ChartOfCalculationTypes_/, "ВидыРасчета_")
    .replace(/^ChartOfCharacteristicTypes_/, "ВидыХарактеристик_");
  const filter = "DeletionMark eq false";
  const rows = await ctx.fetchAll(entityName, filter);

  const { upserted, errors } = await ctx.processInChunks(
    rows as any[],
    `Catalog ${catalogType}`,
    async (r: any) => {
      const data: Record<string, any> = {
        catalogType,
        code: r.Code ?? null,
        name: r.Description || "—",
        fullName: r.НаименованиеПолное ?? null,
        isFolder: r.IsFolder ?? false,
        parentRefKey: r.Parent_Key && r.Parent_Key !== EMPTY_GUID ? r.Parent_Key : null,
        ownerRefKey: r.Owner_Key && r.Owner_Key !== EMPTY_GUID ? r.Owner_Key : null,
        isActive: true,
        meta: (() => {
          const m: Record<string, any> = {};
          for (const [k, v] of Object.entries(r)) {
            if (!["Ref_Key", "Code", "Description", "НаименованиеПолное", "IsFolder", "DeletionMark", "Parent_Key", "Owner_Key", "Predefined", "PredefinedDataName", "DataVersion"].includes(k)) {
              m[k] = v;
            }
          }
          return Object.keys(m).length > 0 ? m : null;
        })(),
      };
      const db = ctx.db as any;
      await db.oneCCatalog.upsert({
        where: { catalogType_externalId: { catalogType, externalId: r.Ref_Key } },
        create: { externalId: r.Ref_Key, ...data },
        update: data,
      });
    },
  );

  return { entity: entityName, fetched: rows.length, upserted, errors };
}

export async function syncUniversalRegister(ctx: SyncContext, entityName: string): Promise<SyncResult> {
  const registerType = entityName.replace(/^(InformationRegister_|AccumulationRegister_|AccountingRegister_|CalculationRegister_)/, "");
  const registerKind = entityName.startsWith("AccumulationRegister_")
    ? "Accumulation"
    : entityName.startsWith("AccountingRegister_")
      ? "Accounting"
      : entityName.startsWith("CalculationRegister_")
        ? "Calculation"
        : "Information";
  const rows = await ctx.fetchAll(entityName);

  const { upserted, errors } = await ctx.processInChunks(
    rows as any[],
    `Register ${registerType}`,
    async (r: any) => {
      const refKey = ctx.buildRegisterExternalId(registerType, r);
      const data: Record<string, any> = {
        registerType,
        registerKind,
        period: r.Period ? new Date(r.Period) : null,
        recorder: r.Recorder_Key && r.Recorder_Key !== EMPTY_GUID ? r.Recorder_Key : null,
        recorderType: r.Recorder_Type ?? null,
        lineNumber: r.LineNumber ?? null,
        active: r.Active !== false,
        data: (() => {
          const m: Record<string, any> = {};
          for (const [k, v] of Object.entries(r)) {
            if (!["Ref_Key", "Period", "Recorder_Key", "Recorder_Type", "Recorder", "LineNumber", "Active", "DeletionMark", "DataVersion"].includes(k)) {
              m[k] = v;
            }
          }
          return m;
        })(),
      };
      const db = ctx.db as any;
      await db.oneCRegister.upsert({
        where: { registerType_externalId: { registerType, externalId: refKey } },
        create: { externalId: refKey, ...data },
        update: data,
      });
    },
  );

  return { entity: entityName, fetched: rows.length, upserted, errors };
}

export function universalCatalogSteps(ctx: SyncContext) {
  return MISSING_CATALOGS.map((catalog) => () => syncUniversalCatalog(ctx, catalog));
}

export function chartEntitySteps(ctx: SyncContext) {
  return CHART_ENTITIES.map((chart) => () => syncUniversalCatalog(ctx, chart));
}

export function registerSteps(ctx: SyncContext) {
  return ALL_REGISTERS.map((register) => () => syncUniversalRegister(ctx, register));
}

export function extraRegisterSteps(ctx: SyncContext) {
  return EXTRA_REGISTERS.map((register) => () => syncUniversalRegister(ctx, register));
}
