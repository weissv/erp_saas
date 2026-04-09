import type { SyncContext, SyncResult } from "./sync-context";
import { parseAmount } from "./sync-context";
import { logger } from "../../../../utils/logger";

/**
 * CRITICAL: All documents use `Posted eq true` to exclude drafts.
 * Only posted, non-deleted documents are synced into the ERP.
 */
const DOCUMENT_FILTER = "DeletionMark eq false and Posted eq true";

async function syncGenericDocument(
  ctx: SyncContext,
  entity: string,
  docType: string,
  model: "oneCDocument" | "oneCHRDocument" | "oneCPayrollDocument",
  extractor: (row: any) => Record<string, any>,
): Promise<SyncResult> {
  const rows = await ctx.fetchAll(entity, DOCUMENT_FILTER);

  const { upserted, errors } = await ctx.processInChunks(
    rows as any[],
    `${docType} (${entity})`,
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
      await db[model].upsert({
        where: { externalId: r.Ref_Key },
        create: { externalId: r.Ref_Key, ...baseData },
        update: baseData,
      });
    },
  );

  return { entity, fetched: rows.length, upserted, errors };
}

// ── Extended Finance Documents ─────────────────────────────────

function syncAccountingEntries(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ОперацияБух", "ОперацияБух", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаОперации),
    operationType: r.Содержание ?? null,
    meta: { СпособЗаполнения: r.СпособЗаполнения },
  }));
}

function syncDebtCorrections(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_КорректировкаДолга", "КорректировкаДолга", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаКтЗадолженности) ?? parseAmount(r.СуммаДтЗадолженности),
    operationType: r.ВидОперации ?? null,
    contractorRefKey: r.КонтрагентДебитор_Key ?? r.КонтрагентКредитор_Key ?? null,
  }));
}

function syncReceivedInvoices(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_СчетФактураПолученный", "СчетФактураПолученный", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
    contractorRefKey: r.Контрагент_Key ?? null,
    operationType: r.ВидСчетаФактуры ?? null,
  }));
}

function syncIssuedInvoices(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_СчетФактураВыданный", "СчетФактураВыданный", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
    contractorRefKey: r.Контрагент_Key ?? null,
    operationType: r.ВидСчетаФактуры ?? null,
  }));
}

function syncAdvanceReports(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_АвансовыйОтчет", "АвансовыйОтчет", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
    personRefKey: r.ФизЛицо_Key ?? null,
  }));
}

function syncCustomerInvoices(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_СчетНаОплатуПокупателю", "СчетНаОплатуПокупателю", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
    contractorRefKey: r.Контрагент_Key ?? null,
  }));
}

function syncContractorSettlements(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ДокументРасчетовСКонтрагентом", "ДокументРасчетовСКонтрагентом", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
    contractorRefKey: r.Контрагент_Key ?? null,
  }));
}

function syncPenaltyCharges(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_НачислениеПеней", "НачислениеПеней", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
    contractorRefKey: r.Контрагент_Key ?? null,
    meta: { СтавкаПени: r.СтавкаПени, ПериодРасчета: r.ПериодРасчета },
  }));
}

function syncDividends(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_НачислениеДивидендов", "НачислениеДивидендов", "oneCDocument", (r) => ({
    operationType: r.ВидОперации ?? null,
  }));
}

function syncRegOperations(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_РегламентнаяОперация", "РегламентнаяОперация", "oneCDocument", (r) => ({
    operationType: r.ВидОперации ?? null,
    meta: { Состояние: r.Состояние },
  }));
}

function syncPaymentOrder(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ПлатежноеПоручение", "ПлатежноеПоручение", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
    contractorRefKey: r.Контрагент_Key ?? null,
    meta: { НазначениеПлатежа: r.НазначениеПлатежа },
  }));
}

function syncInitialBalances(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ВводНачальныхОстатков", "ВводНачальныхОстатков", "oneCDocument", (r) => ({
    operationType: r.РазделУчета ?? null,
  }));
}

function syncRegReports(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_РегламентированныйОтчет", "РегламентированныйОтчет", "oneCDocument", (r) => ({
    operationType: r.Вид ?? null,
    meta: { Период: r.Период, НаименованиеОтчета: r.НаименованиеОтчета },
  }));
}

function syncWarrant(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_Доверенность", "Доверенность", "oneCDocument", (r) => ({
    contractorRefKey: r.Контрагент_Key ?? null,
    personRefKey: r.ФизЛицо_Key ?? null,
  }));
}

// ── Warehouse Documents ────────────────────────────────────────

function syncGoodsWriteOff(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_СписаниеТоваров", "СписаниеТоваров", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
    meta: { Основание: r.Основание },
  }));
}

function syncInventoryCheck(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ИнвентаризацияТоваровНаСкладе", "ИнвентаризацияТоваровНаСкладе", "oneCDocument", (r) => ({
    meta: { ДатаНачалаИнвентаризации: r.ДатаНачалаИнвентаризации, ДатаОкончанияИнвентаризации: r.ДатаОкончанияИнвентаризации },
  }));
}

function syncDemandInvoice(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ТребованиеНакладная", "ТребованиеНакладная", "oneCDocument", (r) => ({
    contractorRefKey: r.Контрагент_Key ?? null,
  }));
}

function syncGoodsTransfer(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ПеремещениеТоваров", "ПеремещениеТоваров", "oneCDocument", (r) => ({
    meta: { СкладОтправитель_Key: r.СкладОтправитель_Key, СкладПолучатель_Key: r.СкладПолучатель_Key },
  }));
}

function syncNomenclatureAssembly(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_КомплектацияНоменклатуры", "КомплектацияНоменклатуры", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
    operationType: r.ВидОперации ?? null,
  }));
}

function syncFixedAssetAcceptance(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ПринятиеКУчетуОС", "ПринятиеКУчетуОС", "oneCDocument", (r) => ({
    amount: parseAmount(r.СтоимостьБУ),
    operationType: r.ВидОперации ?? null,
  }));
}

function syncAdditionalExpenses(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ПоступлениеДопРасходов", "ПоступлениеДопРасходов", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
    contractorRefKey: r.Контрагент_Key ?? null,
  }));
}

function syncRetailSalesReport(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ОтчетОРозничныхПродажах", "ОтчетОРозничныхПродажах", "oneCDocument", (r) => ({
    amount: parseAmount(r.СуммаДокумента),
  }));
}

function syncMaterialTransfer(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ПередачаМатериаловВЭксплуатацию", "ПередачаМатериаловВЭксплуатацию", "oneCDocument", (_r) => ({}));
}

function syncMaterialWriteOff(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_СписаниеМатериаловИзЭксплуатации", "СписаниеМатериаловИзЭксплуатации", "oneCDocument", (_r) => ({}));
}

function syncWaybill(ctx: SyncContext) {
  return syncGenericDocument(ctx, "Document_ПутевойЛист", "ПутевойЛист", "oneCDocument", (r) => ({
    personRefKey: r.ФизЛицо_Key ?? null,
    meta: { ТранспортноеСредство_Key: r.ТранспортноеСредство_Key, НормаРасхода: r.НормаРасхода },
  }));
}

export function extendedFinanceDocSteps(ctx: SyncContext) {
  return [
    () => syncAccountingEntries(ctx),
    () => syncDebtCorrections(ctx),
    () => syncReceivedInvoices(ctx),
    () => syncIssuedInvoices(ctx),
    () => syncAdvanceReports(ctx),
    () => syncCustomerInvoices(ctx),
    () => syncContractorSettlements(ctx),
    () => syncPenaltyCharges(ctx),
    () => syncDividends(ctx),
    () => syncRegOperations(ctx),
    () => syncPaymentOrder(ctx),
    () => syncInitialBalances(ctx),
    () => syncRegReports(ctx),
    () => syncWarrant(ctx),
  ];
}

export function warehouseDocSteps(ctx: SyncContext) {
  return [
    () => syncGoodsWriteOff(ctx),
    () => syncInventoryCheck(ctx),
    () => syncDemandInvoice(ctx),
    () => syncGoodsTransfer(ctx),
    () => syncNomenclatureAssembly(ctx),
    () => syncFixedAssetAcceptance(ctx),
    () => syncAdditionalExpenses(ctx),
    () => syncRetailSalesReport(ctx),
    () => syncMaterialTransfer(ctx),
    () => syncMaterialWriteOff(ctx),
    () => syncWaybill(ctx),
  ];
}
