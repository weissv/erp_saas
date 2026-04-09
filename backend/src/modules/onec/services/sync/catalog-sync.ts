import type { SyncContext, SyncResult } from "./sync-context";
import { logger } from "../../../../utils/logger";

export async function syncCashFlowArticles(ctx: SyncContext): Promise<SyncResult> {
  const entity = "Catalog_СтатьиДвиженияДенежныхСредств";
  const filter = "DeletionMark eq false";
  const select = "Ref_Key,Code,Description,IsFolder,DeletionMark";

  const rows = await ctx.fetchAll(entity, filter, select);

  const { upserted, errors } = await ctx.processInChunks(
    rows as any[],
    entity,
    async (r: any) => {
      await ctx.db.cashFlowArticle.upsert({
        where: { externalId: r.Ref_Key },
        create: {
          externalId: r.Ref_Key,
          code: r.Code ?? null,
          name: r.Description ?? "—",
          isFolder: r.IsFolder ?? false,
        },
        update: {
          code: r.Code ?? null,
          name: r.Description ?? "—",
          isFolder: r.IsFolder ?? false,
        },
      });
    },
  );

  return { entity, fetched: rows.length, upserted, errors };
}

export async function syncContractors(ctx: SyncContext): Promise<SyncResult> {
  const entity = "Catalog_Контрагенты";
  const filter = "DeletionMark eq false";
  const select = "Ref_Key,Code,Description,НаименованиеПолное,ИНН,КПП,IsFolder,DeletionMark";

  const rows = await ctx.fetchAll(entity, filter, select);

  const { upserted, errors } = await ctx.processInChunks(
    rows as any[],
    entity,
    async (r: any) => {
      await ctx.db.contractor.upsert({
        where: { externalId: r.Ref_Key },
        create: {
          externalId: r.Ref_Key,
          code: r.Code ?? null,
          name: r.Description ?? "—",
          fullName: r.НаименованиеПолное ?? null,
          inn: r.ИНН ?? null,
          kpp: r.КПП ?? null,
          isFolder: r.IsFolder ?? false,
          isActive: !r.DeletionMark,
        },
        update: {
          code: r.Code ?? null,
          name: r.Description ?? "—",
          fullName: r.НаименованиеПолное ?? null,
          inn: r.ИНН ?? null,
          kpp: r.КПП ?? null,
          isFolder: r.IsFolder ?? false,
          isActive: !r.DeletionMark,
        },
      });
    },
  );

  return { entity, fetched: rows.length, upserted, errors };
}

export async function syncPersons(ctx: SyncContext): Promise<SyncResult> {
  const entity = "Catalog_ФизическиеЛица";
  const filter = "DeletionMark eq false";
  const select = "Ref_Key,Code,Description,DeletionMark";

  const rows = await ctx.fetchAll(entity, filter, select);

  const { upserted, errors } = await ctx.processInChunks(
    rows as any[],
    entity,
    async (r: any) => {
      await ctx.db.person.upsert({
        where: { externalId: r.Ref_Key },
        create: {
          externalId: r.Ref_Key,
          code: r.Code ?? null,
          name: r.Description ?? "—",
          isActive: !r.DeletionMark,
        },
        update: {
          code: r.Code ?? null,
          name: r.Description ?? "—",
          isActive: !r.DeletionMark,
        },
      });
    },
  );

  return { entity, fetched: rows.length, upserted, errors };
}

async function syncGenericCatalog(
  ctx: SyncContext,
  entity: string,
  model: string,
  fieldMap: Record<string, string>,
  selectFields?: string,
): Promise<SyncResult> {
  const filter = "DeletionMark eq false";
  const rows = await ctx.fetchAll(entity, filter, selectFields);

  const { upserted, errors } = await ctx.processInChunks(
    rows as any[],
    entity,
    async (r: any) => {
      const data: Record<string, any> = { isActive: true };
      for (const [oneCField, dbField] of Object.entries(fieldMap)) {
        data[dbField] = r[oneCField] ?? null;
      }
      data.name = data.name || r.Description || "—";
      const db = ctx.db as any;
      await db[model].upsert({
        where: { externalId: r.Ref_Key },
        create: { externalId: r.Ref_Key, ...data },
        update: data,
      });
    },
  );

  return { entity, fetched: rows.length, upserted, errors };
}

export async function syncOrganizations(ctx: SyncContext): Promise<SyncResult> {
  return syncGenericCatalog(ctx, "Catalog_Организации", "oneCOrganization", {
    Code: "code", Description: "name", НаименованиеПолное: "fullName", ИНН: "inn", КПП: "kpp", ОГРН: "ogrn",
  });
}

export async function syncNomenclature(ctx: SyncContext): Promise<SyncResult> {
  return syncGenericCatalog(ctx, "Catalog_Номенклатура", "oneCNomenclature", {
    Code: "code", Description: "name", НаименованиеПолное: "fullName", IsFolder: "isFolder",
  });
}

export async function syncBankAccounts(ctx: SyncContext): Promise<SyncResult> {
  return syncGenericCatalog(ctx, "Catalog_БанковскиеСчета", "oneCBankAccount", {
    Code: "code", Description: "name", НомерСчета: "accountNumber",
  });
}

export async function syncContracts(ctx: SyncContext): Promise<SyncResult> {
  return syncGenericCatalog(ctx, "Catalog_ДоговорыКонтрагентов", "oneCContract", {
    Code: "code", Description: "name", Owner_Key: "contractorRefKey",
  });
}

export async function syncOneCEmployees(ctx: SyncContext): Promise<SyncResult> {
  return syncGenericCatalog(ctx, "Catalog_Сотрудники", "oneCEmployee", {
    Code: "code", Description: "name", ФизическоеЛицо_Key: "personRefKey", Должность_Key: "positionRefKey", Организация_Key: "orgRefKey",
  });
}

export async function syncPositions(ctx: SyncContext): Promise<SyncResult> {
  return syncGenericCatalog(ctx, "Catalog_Должности", "oneCPosition", {
    Code: "code", Description: "name",
  });
}

export async function syncFixedAssets(ctx: SyncContext): Promise<SyncResult> {
  return syncGenericCatalog(ctx, "Catalog_ОсновныеСредства", "oneCFixedAsset", {
    Code: "code", Description: "name", НаименованиеПолное: "fullName", IsFolder: "isFolder",
  });
}

export async function syncWarehouses(ctx: SyncContext): Promise<SyncResult> {
  return syncGenericCatalog(ctx, "Catalog_Склады", "oneCWarehouse", {
    Code: "code", Description: "name",
  });
}

export async function syncCurrencies(ctx: SyncContext): Promise<SyncResult> {
  return syncGenericCatalog(ctx, "Catalog_Валюты", "oneCCurrency", {
    Code: "code", Description: "name",
  });
}

export async function syncDepartments(ctx: SyncContext): Promise<SyncResult> {
  return syncGenericCatalog(ctx, "Catalog_ПодразделенияОрганизаций", "oneCDepartment", {
    Code: "code", Description: "name", Parent_Key: "parentRefKey", Owner_Key: "orgRefKey",
  });
}

/**
 * Step 1: CashFlowArticles MUST be synced first — finance documents
 * resolve cashFlowArticleId via FK lookup.
 */
export function coreCatalogSteps(ctx: SyncContext) {
  return [
    () => syncCashFlowArticles(ctx),
    () => syncContractors(ctx),
    () => syncPersons(ctx),
  ];
}

export function extendedCatalogSteps(ctx: SyncContext) {
  return [
    () => syncOrganizations(ctx),
    () => syncNomenclature(ctx),
    () => syncBankAccounts(ctx),
    () => syncContracts(ctx),
    () => syncOneCEmployees(ctx),
    () => syncPositions(ctx),
    () => syncFixedAssets(ctx),
    () => syncWarehouses(ctx),
    () => syncCurrencies(ctx),
    () => syncDepartments(ctx),
  ];
}
