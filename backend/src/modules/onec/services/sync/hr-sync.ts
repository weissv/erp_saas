import type { SyncContext, SyncResult } from "./sync-context";
import { parseAmount } from "./sync-context";
import { logger } from "../../../../utils/logger";

/**
 * HR Documents also use `Posted eq true` — only finalized HR actions should
 * appear in the ERP. Draft hiring/dismissal orders are excluded.
 */
const DOCUMENT_FILTER = "DeletionMark eq false and Posted eq true";


async function syncGenericHRDocument(
  ctx: SyncContext,
  entity: string,
  docType: string,
  extractor: (row: any) => Record<string, any>,
): Promise<SyncResult> {
  const rows = await ctx.fetchAll(entity, DOCUMENT_FILTER);

  const { upserted, errors } = await ctx.processInChunks(
    rows as any[],
    `HR ${docType} (${entity})`,
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
      await db.oneCHRDocument.upsert({
        where: { externalId: r.Ref_Key },
        create: { externalId: r.Ref_Key, ...baseData },
        update: baseData,
      });
    },
  );

  return { entity, fetched: rows.length, upserted, errors };
}

function syncHiring(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_ПриемНаРаботу", "ПриемНаРаботу", (r) => ({
    employeeRefKey: r.Сотрудник_Key ?? null,
    employeeName: null,
    personRefKey: r.ФизическоеЛицо_Key ?? null,
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
    positionRefKey: r.Должность_Key ?? null,
    dateStart: r.ДатаПриема ? new Date(r.ДатаПриема) : null,
    meta: { ВидЗанятости: r.ВидЗанятости, КоличествоСтавок: r.КоличествоСтавок },
  }));
}

function syncDismissal(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_Увольнение", "Увольнение", (r) => ({
    employeeRefKey: r.Сотрудник_Key ?? null,
    personRefKey: r.ФизическоеЛицо_Key ?? null,
    orgRefKey: r.Организация_Key ?? null,
    dateStart: r.ДатаУвольнения ? new Date(r.ДатаУвольнения) : null,
    meta: { ОснованиеУвольнения: r.ОснованиеУвольнения },
  }));
}

function syncTransfer(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_КадровыйПеревод", "КадровыйПеревод", (r) => ({
    employeeRefKey: r.Сотрудник_Key ?? null,
    personRefKey: r.ФизическоеЛицо_Key ?? null,
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
    positionRefKey: r.Должность_Key ?? null,
    dateStart: r.ДатаНачала ? new Date(r.ДатаНачала) : null,
  }));
}

function syncVacation(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_Отпуск", "Отпуск", (r) => ({
    employeeRefKey: r.Сотрудник_Key ?? null,
    personRefKey: r.ФизическоеЛицо_Key ?? null,
    orgRefKey: r.Организация_Key ?? null,
    dateStart: r.ДатаНачалаОсновногоОтпуска ? new Date(r.ДатаНачалаОсновногоОтпуска) : null,
    dateEnd: r.ДатаОкончанияОсновногоОтпуска ? new Date(r.ДатаОкончанияОсновногоОтпуска) : null,
    amount: parseAmount(r.Начислено),
    meta: { КоличествоДнейОсновногоОтпуска: r.КоличествоДнейОсновногоОтпуска },
  }));
}

function syncSickLeave(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_БольничныйЛист", "БольничныйЛист", (r) => ({
    employeeRefKey: r.Сотрудник_Key ?? null,
    personRefKey: r.ФизическоеЛицо_Key ?? null,
    orgRefKey: r.Организация_Key ?? null,
    dateStart: r.ДатаНачала ? new Date(r.ДатаНачала) : null,
    dateEnd: r.ДатаОкончания ? new Date(r.ДатаОкончания) : null,
    amount: parseAmount(r.Начислено),
    meta: { ПричинаНетрудоспособности: r.ПричинаНетрудоспособности },
  }));
}

function syncAbsence(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_ОтсутствиеНаРаботе", "ОтсутствиеНаРаботе", (r) => ({
    orgRefKey: r.Организация_Key ?? null,
  }));
}

function syncBusinessTrip(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_Командировка", "Командировка", (r) => ({
    employeeRefKey: r.Сотрудник_Key ?? null,
    orgRefKey: r.Организация_Key ?? null,
    dateStart: r.ДатаНачала ? new Date(r.ДатаНачала) : null,
    dateEnd: r.ДатаОкончания ? new Date(r.ДатаОкончания) : null,
    meta: { СтранаНазначения: r.СтранаНазначения, Цель: r.Цель },
  }));
}

function syncGPHContract(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_ДоговорГПХ", "ДоговорГПХ", (r) => ({
    employeeRefKey: r.Сотрудник_Key ?? null,
    personRefKey: r.ФизическоеЛицо_Key ?? null,
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
    positionRefKey: r.Должность_Key ?? null,
    dateStart: r.ДатаНачала ? new Date(r.ДатаНачала) : null,
    dateEnd: r.ДатаОкончания ? new Date(r.ДатаОкончания) : null,
    amount: parseAmount(r.Размер),
  }));
}

function syncGPHAct(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_АктВыполненныхРаботПоДоговоруПодряда", "АктВыполненныхРабот", (r) => ({
    employeeRefKey: r.Сотрудник_Key ?? null,
    personRefKey: r.ФизическоеЛицо_Key ?? null,
    orgRefKey: r.Организация_Key ?? null,
    dateStart: r.ДатаНачала ? new Date(r.ДатаНачала) : null,
    dateEnd: r.ДатаОкончания ? new Date(r.ДатаОкончания) : null,
    amount: parseAmount(r.Размер),
  }));
}

function syncExecutionList(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_ИсполнительныйЛист", "ИсполнительныйЛист", (r) => ({
    personRefKey: r.ФизическоеЛицо_Key ?? null,
    orgRefKey: r.Организация_Key ?? null,
    dateEnd: r.ДатаОкончания ? new Date(r.ДатаОкончания) : null,
    amount: parseAmount(r.Сумма),
  }));
}

function syncTimesheet(ctx: SyncContext) {
  return syncGenericHRDocument(ctx, "Document_ТабельУчетаРабочегоВремени", "ТабельУчетаРабочегоВремени", (r) => ({
    orgRefKey: r.Организация_Key ?? null,
    departmentRefKey: r.Подразделение_Key ?? null,
    dateStart: r.ДатаНачалаПериода ? new Date(r.ДатаНачалаПериода) : null,
    dateEnd: r.ДатаОкончанияПериода ? new Date(r.ДатаОкончанияПериода) : null,
  }));
}

export function hrSyncSteps(ctx: SyncContext) {
  return [
    () => syncHiring(ctx),
    () => syncDismissal(ctx),
    () => syncTransfer(ctx),
    () => syncVacation(ctx),
    () => syncSickLeave(ctx),
    () => syncAbsence(ctx),
    () => syncBusinessTrip(ctx),
    () => syncGPHContract(ctx),
    () => syncGPHAct(ctx),
    () => syncExecutionList(ctx),
    () => syncTimesheet(ctx),
  ];
}
