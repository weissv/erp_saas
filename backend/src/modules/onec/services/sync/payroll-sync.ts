import type { SyncContext, SyncResult } from "./sync-context";
import { parseAmount } from "./sync-context";
import { logger } from "../../../../utils/logger";

/**
 * Payroll Documents: only posted, non-deleted documents are synced.
 */
const DOCUMENT_FILTER = "DeletionMark eq false and Posted eq true";


async function syncGenericPayrollDocument(
  ctx: SyncContext,
  entity: string,
  docType: string,
  extractor: (row: any) => Record<string, any>,
): Promise<SyncResult> {
  const rows = await ctx.fetchAll(entity, DOCUMENT_FILTER);

  const { upserted, errors } = await ctx.processInChunks(
    rows as any[],
    `Payroll ${docType} (${entity})`,
    async (r: any) => {
      const extra = extractor(r);
      const baseData = {
        docType,
        documentNumber: r.Number ?? null,
        date: r.Date ? new Date(r.Date) : new Date(),
        posted: r.Posted ?? false,
        comment: r.Комментарий ?? null,
        isActive: true,
        ...extra,
      };
      const db = ctx.db as any;
      await db.oneCPayrollDocument.upsert({
        where: { externalId: r.Ref_Key },
        create: { externalId: r.Ref_Key, ...baseData },
        update: baseData,
      });
    },
  );

  return { entity, fetched: rows.length, upserted, errors };
}

function syncPayrollAccrual(ctx: SyncContext) {
  return syncGenericPayrollDocument(ctx, "Document_НачислениеЗарплаты", "НачислениеЗарплаты", (r) => ({
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
    period: r.МесяцНачисления ? new Date(r.МесяцНачисления) : null,
    amount: parseAmount(r.Начислено),
  }));
}

function syncPayrollBankStatement(ctx: SyncContext) {
  return syncGenericPayrollDocument(ctx, "Document_ВедомостьНаВыплатуЗарплатыВБанк", "ВедомостьЗарплатыБанк", (r) => ({
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
    period: r.ПериодРегистрации ? new Date(r.ПериодРегистрации) : null,
    amount: parseAmount(r.СуммаПоДокументу),
  }));
}

function syncPayrollCashStatement(ctx: SyncContext) {
  return syncGenericPayrollDocument(ctx, "Document_ВедомостьНаВыплатуЗарплатыВКассу", "ВедомостьЗарплатыКасса", (r) => ({
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
    period: r.ПериодРегистрации ? new Date(r.ПериодРегистрации) : null,
    amount: parseAmount(r.СуммаПоДокументу),
  }));
}

function syncNDFLWithholding(ctx: SyncContext) {
  return syncGenericPayrollDocument(ctx, "Document_УдержаниеУИсточникаВыплатыНДФЛ", "УдержаниеНДФЛ", (r) => ({
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
  }));
}

function syncPlannedAccrual(ctx: SyncContext) {
  return syncGenericPayrollDocument(ctx, "Document_НазначениеПлановогоНачисления", "НазначениеПлановогоНачисления", (r) => ({
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
  }));
}

function syncPlannedDeduction(ctx: SyncContext) {
  return syncGenericPayrollDocument(ctx, "Document_НазначениеПлановогоУдержания", "НазначениеПлановогоУдержания", (r) => ({
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
  }));
}

function syncPlannedAccrualCancellation(ctx: SyncContext) {
  return syncGenericPayrollDocument(ctx, "Document_ПрекращениеПлановогоНачисления", "ПрекращениеПлановогоНачисления", (r) => ({
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
  }));
}

export function payrollSyncSteps(ctx: SyncContext) {
  return [
    () => syncPayrollAccrual(ctx),
    () => syncPayrollBankStatement(ctx),
    () => syncPayrollCashStatement(ctx),
    () => syncNDFLWithholding(ctx),
    () => syncPlannedAccrual(ctx),
    () => syncPlannedDeduction(ctx),
    () => syncPlannedAccrualCancellation(ctx),
  ];
}
