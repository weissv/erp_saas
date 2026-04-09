import cron from "node-cron";
import axios, { type AxiosInstance } from "axios";
import {
  type Prisma,
  PrismaClient,
  TransactionChannel,
  BalanceType,
} from "@prisma/client";

import { config } from "../../../config";
import { prisma } from "../../../prisma";
import { logger } from "../../../utils/logger";
import type {
  OneCSyncReport,
  OneCSyncResult,
} from "./contracts";
import { createOneCClient, isNetworkError } from "./onec-client";
import { resolveCashFlowArticleId, resolveContractorId, resolvePersonId } from "./sync/resolvers";
import { SyncContext } from "./sync/sync-context";
import { extendedCatalogSteps } from "./sync/catalog-sync";
import { extendedFinanceDocSteps, warehouseDocSteps } from "./sync/document-sync";
import { invoiceSyncSteps } from "./sync/invoice-sync";
import { hrSyncSteps } from "./sync/hr-sync";
import { payrollSyncSteps } from "./sync/payroll-sync";
import { universalCatalogSteps, chartEntitySteps, registerSteps, extraRegisterSteps } from "./sync/universal-sync";

type SyncResult = OneCSyncResult;
type SyncReport = OneCSyncReport;

const CATALOG_FILTER = "DeletionMark eq false";
const DOCUMENT_FILTER = "DeletionMark eq false and Posted eq true";

const CATALOG_ENDPOINTS = {
  cashFlowArticles: "Catalog_СтатьиДвиженияДенежныхСредств",
  contractors: "Catalog_Контрагенты",
  persons: "Catalog_ФизическиеЛица",
} as const;

const FINANCE_DOCUMENT_ENDPOINTS = [
  {
    entity: "Document_ПоступлениеНаРасчетныйСчет",
    label: "Bank In",
    channel: TransactionChannel.BANK,
    sign: 1 as const,
  },
  {
    entity: "Document_СписаниеСРасчетногоСчета",
    label: "Bank Out",
    channel: TransactionChannel.BANK,
    sign: -1 as const,
  },
  {
    entity: "Document_ПриходныйКассовыйОрдер",
    label: "Cash In",
    channel: TransactionChannel.CASH,
    sign: 1 as const,
  },
  {
    entity: "Document_РасходныйКассовыйОрдер",
    label: "Cash Out",
    channel: TransactionChannel.CASH,
    sign: -1 as const,
  },
] as const;

const REGISTER_ENDPOINTS = {
  contractorSettlements: "AccumulationRegister_ВзаиморасчетыСКонтрагентами_Balance",
  cashBalances: "AccumulationRegister_ДенежныеСредства_Balance",
} as const;

const CATALOG_SELECTS = {
  cashFlowArticles: "Ref_Key,Code,Description,IsFolder,DeletionMark",
  contractors: "Ref_Key,Code,Description,НаименованиеПолное,ИНН,КПП,IsFolder,DeletionMark",
  persons: "Ref_Key,Code,Description,DeletionMark",
} as const;

const BALANCE_AMOUNT_FIELDS = [
  "СуммаОстаток",
  "Остаток",
  "СуммаКонечныйОстаток",
  "КонечныйОстаток",
  "Сумма",
  "СуммаВзаиморасчетов",
  "Balance",
  "Amount",
] as const;

const CONTRACTOR_REF_FIELDS = [
  "Контрагент_Key",
  "Контрагент",
  "Покупатель_Key",
  "Покупатель",
  "Субконто1_Key",
  "Субконто1",
] as const;

interface SyncPhase {
  label: string;
  steps: Array<() => Promise<SyncResult>>;
}

interface CashFlowArticleRow {
  Ref_Key?: string | null;
  Code?: string | null;
  Description?: string | null;
  IsFolder?: boolean | null;
  DeletionMark?: boolean | null;
}

interface ContractorRow {
  Ref_Key?: string | null;
  Code?: string | null;
  Description?: string | null;
  НаименованиеПолное?: string | null;
  ИНН?: string | null;
  КПП?: string | null;
  IsFolder?: boolean | null;
  DeletionMark?: boolean | null;
}

interface PersonRow {
  Ref_Key?: string | null;
  Code?: string | null;
  Description?: string | null;
  DeletionMark?: boolean | null;
}

interface FinanceDocumentRow {
  Ref_Key?: string | null;
  Date?: string | Date | null;
  Number?: string | null;
  Posted?: boolean | null;
  Комментарий?: string | null;
  СуммаДокумента?: number | string | null;
  ВидОперации?: string | null;
  Контрагент?: string | null;
  Контрагент_Key?: string | null;
  Контрагент_Type?: string | null;
  ФизическоеЛицо?: string | null;
  ФизическоеЛицо_Key?: string | null;
  СтатьяДвиженияДенежныхСредств_Key?: string | null;
  НазначениеПлатежа?: string | null;
  Основание?: string | null;
}

type RegisterRow = Record<string, unknown> & {
  Period?: string | Date | null;
  Контрагент_Key?: string | null;
  Контрагент?: string | null;
  Покупатель_Key?: string | null;
  Покупатель?: string | null;
  Субконто1_Key?: string | null;
  Субконто1?: string | null;
  Касса_Key?: string | null;
  Касса?: string | null;
  БанковскийСчет_Key?: string | null;
  БанковскийСчет?: string | null;
  БанковскийСчетОрганизации_Key?: string | null;
  БанковскийСчетОрганизации?: string | null;
  ВидДенежныхСредств?: string | null;
  ВидОперации?: string | null;
};

function toNullableString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function toNullableBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return null;
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/\s+/g, "").replace(",", ".").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toDateOrFallback(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
}

function firstString(row: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = toNullableString(row[key]);
    if (value) return value;
  }

  return null;
}

function firstNumber(row: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = toNullableNumber(row[key]);
    if (value !== null) return value;
  }

  return null;
}

function normalizeSnapshotDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setMilliseconds(0);
  return normalized;
}

function classifyMoneyBalanceType(row: RegisterRow): BalanceType | null {
  if (toNullableString(row.БанковскийСчет_Key) || toNullableString(row.БанковскийСчет)) {
    return BalanceType.BANK;
  }

  if (
    toNullableString(row.БанковскийСчетОрганизации_Key) ||
    toNullableString(row.БанковскийСчетОрганизации)
  ) {
    return BalanceType.BANK;
  }

  if (toNullableString(row.Касса_Key) || toNullableString(row.Касса)) {
    return BalanceType.CASH;
  }

  const classifierText = [
    toNullableString(row.ВидДенежныхСредств),
    toNullableString(row.ВидОперации),
    firstString(row, ["СчетДенежныхСредств_Type", "МестоХраненияДенежныхСредств_Type"]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (classifierText.includes("касс")) {
    return BalanceType.CASH;
  }

  if (classifierText.includes("банк") || classifierText.includes("расчет")) {
    return BalanceType.BANK;
  }

  return null;
}

function requireExternalId(entity: string, refKey: string | null | undefined): string {
  const normalized = toNullableString(refKey);
  if (!normalized) {
    throw new Error(`${entity}: missing Ref_Key`);
  }

  return normalized;
}

export class OneCSyncService {
  private readonly ctx: SyncContext;
  private readonly missingOneCEntityWarnings = new Set<string>();
  private running = false;
  private currentSnapshotDate: Date | null = null;

  constructor(client?: AxiosInstance, db?: PrismaClient) {
    this.ctx = new SyncContext(
      client ?? createOneCClient(),
      db ?? prisma,
    );
  }

  async syncAll(): Promise<SyncReport> {
    if (this.running) {
      logger.warn("[1C-Sync] Sync already in progress — skipping");
      return {
        startedAt: new Date(),
        finishedAt: new Date(),
        results: [],
        aborted: true,
        error: "Sync already in progress",
      };
    }

    const configError = this.getOneCConfigurationError();
    if (configError) {
      logger.warn(`[1C-Sync] ${configError} — aborting sync cycle before requests`);
      return {
        startedAt: new Date(),
        finishedAt: new Date(),
        results: [],
        aborted: true,
        error: configError,
      };
    }

    this.running = true;
    this.currentSnapshotDate = normalizeSnapshotDate(new Date());

    try {
      return await this.executeSyncPhases();
    } finally {
      this.running = false;
      this.currentSnapshotDate = null;
    }
  }

  startSchedule(): void {
    const schedule = config.oneCCronSchedule;
    logger.info(`[1C-Sync] Starting cron schedule: ${schedule}`);

    cron.schedule(schedule, async () => {
      logger.info(`[1C-Sync] Cron triggered at ${new Date().toISOString()}`);
      try {
        await this.syncAll();
      } catch (error) {
        logger.error("[1C-Sync] Top-level sync error:", error instanceof Error ? error.message : String(error));
      }
    });
  }

  async runOnce(): Promise<SyncReport> {
    logger.info("[1C-Sync] Running one-shot sync...");
    return this.syncAll();
  }

  private buildSyncPhases(): SyncPhase[] {
    return [
      {
        label: "Phase 1: Required Catalogs",
        steps: [
          () => this.syncCashFlowArticles(),
          () => this.syncContractors(),
          () => this.syncPersons(),
        ],
      },
      {
        label: "Phase 2: Required Finance Documents",
        steps: FINANCE_DOCUMENT_ENDPOINTS.map((definition) => () => this.syncFinanceDocument(definition)),
      },
      {
        label: "Phase 3: Required Balance Registers",
        steps: [
          () => this.syncMoneyBalances(),
          () => this.syncContractorBalances(),
        ],
      },
      {
        label: "Phase 4: Extended Catalogs",
        steps: extendedCatalogSteps(this.ctx),
      },
      {
        label: "Phase 5: Extended Finance Documents",
        steps: extendedFinanceDocSteps(this.ctx),
      },
      {
        label: "Phase 5b: Invoice Documents",
        steps: invoiceSyncSteps(this.ctx),
      },
      {
        label: "Phase 6: Warehouse Documents",
        steps: warehouseDocSteps(this.ctx),
      },
      {
        label: "Phase 7: HR Documents",
        steps: hrSyncSteps(this.ctx),
      },
      {
        label: "Phase 8: Payroll Documents",
        steps: payrollSyncSteps(this.ctx),
      },
      {
        label: "Phase 9: Universal Catalogs",
        steps: universalCatalogSteps(this.ctx),
      },
      {
        label: "Phase 10: Chart Entities",
        steps: chartEntitySteps(this.ctx),
      },
      {
        label: "Phase 11: Registers",
        steps: registerSteps(this.ctx),
      },
      {
        label: "Phase 12: Extra Registers",
        steps: extraRegisterSteps(this.ctx),
      },
    ];
  }

  private async executeSyncPhases(): Promise<SyncReport> {
    const startedAt = new Date();
    const results: SyncResult[] = [];
    let aborted = false;
    let abortReason: string | undefined;

    const run = async (fn: () => Promise<SyncResult>): Promise<void> => {
      if (aborted) return;

      try {
        const result = await fn();
        results.push(result);
        logger.info(
          `[1C-Sync] ${result.entity}: fetched=${result.fetched} upserted=${result.upserted} errors=${result.errors}`,
        );
      } catch (error: unknown) {
        if (isNetworkError(error)) {
          abortReason = error instanceof Error ? error.message : String(error);
          aborted = true;
          logger.warn(`[1C-Sync] Network error — aborting sync cycle: ${abortReason}`);
          return;
        }

        if (this.isOneCAuthorizationError(error)) {
          abortReason = "1C authorization failed (401). Check ONEC_USER and ONEC_PASSWORD.";
          aborted = true;
          logger.warn(`[1C-Sync] ${abortReason}`);
          return;
        }

        logger.error("[1C-Sync] Unexpected error:", error instanceof Error ? error.message : String(error));
        results.push({ entity: "unknown", fetched: 0, upserted: 0, errors: 1 });
      }
    };

    for (const phase of this.buildSyncPhases()) {
      if (aborted) break;

      logger.info(`[1C-Sync] ═══ ${phase.label} ═══`);
      for (const step of phase.steps) {
        await run(step);
        if (aborted) break;
      }
    }

    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    logger.info(
      `[1C-Sync] ═══ Completed in ${(durationMs / 1000).toFixed(1)}s — ${results.length} stages, aborted=${aborted} ═══`,
    );

    return {
      startedAt,
      finishedAt,
      results,
      aborted,
      error: abortReason,
    };
  }

  private getSnapshotDate(): Date {
    return this.currentSnapshotDate ?? normalizeSnapshotDate(new Date());
  }

  private getOneCConfigurationError(): string | null {
    if (!config.oneCPassword.trim()) {
      return "ONEC_PASSWORD is not configured";
    }

    return null;
  }

  private async syncCashFlowArticles(): Promise<SyncResult> {
    const entity = CATALOG_ENDPOINTS.cashFlowArticles;

    try {
      const rows = await this.ctx.fetchAll<CashFlowArticleRow>(
        entity,
        CATALOG_FILTER,
        CATALOG_SELECTS.cashFlowArticles,
      );

      const { upserted, errors } = await this.ctx.processInChunks(rows, entity, async (row) => {
        const externalId = requireExternalId(entity, row.Ref_Key);

        await this.ctx.db.cashFlowArticle.upsert({
          where: { externalId },
          create: {
            externalId,
            code: toNullableString(row.Code),
            name: toNullableString(row.Description) ?? "—",
            isFolder: row.IsFolder ?? false,
          },
          update: {
            code: toNullableString(row.Code),
            name: toNullableString(row.Description) ?? "—",
            isFolder: row.IsFolder ?? false,
          },
        });
      });

      return { entity, fetched: rows.length, upserted, errors };
    } catch (error) {
      return this.handleStepError(entity, error);
    }
  }

  private async syncContractors(): Promise<SyncResult> {
    const entity = CATALOG_ENDPOINTS.contractors;

    try {
      const rows = await this.ctx.fetchAll<ContractorRow>(
        entity,
        undefined,
        CATALOG_SELECTS.contractors,
      );

      const { upserted, errors } = await this.ctx.processInChunks(rows, entity, async (row) => {
        const externalId = requireExternalId(entity, row.Ref_Key);

        await this.ctx.db.contractor.upsert({
          where: { externalId },
          create: {
            externalId,
            code: toNullableString(row.Code),
            name: toNullableString(row.Description) ?? "—",
            fullName: toNullableString(row.НаименованиеПолное),
            inn: toNullableString(row.ИНН),
            kpp: toNullableString(row.КПП),
            isFolder: row.IsFolder ?? false,
            isActive: !(row.DeletionMark ?? false),
          },
          update: {
            code: toNullableString(row.Code),
            name: toNullableString(row.Description) ?? "—",
            fullName: toNullableString(row.НаименованиеПолное),
            inn: toNullableString(row.ИНН),
            kpp: toNullableString(row.КПП),
            isFolder: row.IsFolder ?? false,
            isActive: !(row.DeletionMark ?? false),
          },
        });
      });

      return { entity, fetched: rows.length, upserted, errors };
    } catch (error) {
      return this.handleStepError(entity, error);
    }
  }

  private async syncPersons(): Promise<SyncResult> {
    const entity = CATALOG_ENDPOINTS.persons;

    try {
      const rows = await this.ctx.fetchAll<PersonRow>(
        entity,
        undefined,
        CATALOG_SELECTS.persons,
      );

      const { upserted, errors } = await this.ctx.processInChunks(rows, entity, async (row) => {
        const externalId = requireExternalId(entity, row.Ref_Key);

        await this.ctx.db.person.upsert({
          where: { externalId },
          create: {
            externalId,
            code: toNullableString(row.Code),
            name: toNullableString(row.Description) ?? "—",
            isActive: !(row.DeletionMark ?? false),
          },
          update: {
            code: toNullableString(row.Code),
            name: toNullableString(row.Description) ?? "—",
            isActive: !(row.DeletionMark ?? false),
          },
        });
      });

      return { entity, fetched: rows.length, upserted, errors };
    } catch (error) {
      return this.handleStepError(entity, error);
    }
  }

  private async syncFinanceDocument(definition: (typeof FINANCE_DOCUMENT_ENDPOINTS)[number]): Promise<SyncResult> {
    const entity = definition.entity;

    try {
      const rows = await this.ctx.fetchAll<FinanceDocumentRow>(entity, DOCUMENT_FILTER);

      const { upserted, errors } = await this.ctx.processInChunks(rows, entity, async (row) => {
        const externalId = requireExternalId(entity, row.Ref_Key);
        const rawAmount = toNullableNumber(row.СуммаДокумента) ?? 0;
        const amount = rawAmount * definition.sign;
        const date = toDateOrFallback(row.Date, this.getSnapshotDate());
        const contractorRefKey = toNullableString(row.Контрагент_Key);
        const personRefKey = toNullableString(row.ФизическоеЛицо_Key);
        const counterpartyRefKey = contractorRefKey ?? personRefKey;
        const counterpartyType = toNullableString(row.Контрагент_Type);
        const contractorId = await resolveContractorId(this.ctx, contractorRefKey);
        const personId = await resolvePersonId(this.ctx, personRefKey);
        const cashFlowArticleId = await resolveCashFlowArticleId(
          this.ctx,
          toNullableString(row.СтатьяДвиженияДенежныхСредств_Key),
        );
        const purpose =
          toNullableString(row.НазначениеПлатежа) ??
          toNullableString(row.Основание) ??
          toNullableString(row.Комментарий);
        const posted = toNullableBoolean(row.Posted) ?? false;

        await this.ctx.db.financeTransaction.upsert({
          where: { externalId },
          create: {
            externalId,
            amount,
            type: definition.sign > 0 ? "INCOME" : "EXPENSE",
            category: "OTHER",
            source: "BUDGET",
            description: toNullableString(row.Комментарий) ?? definition.label,
            date,
            channel: definition.channel,
            documentNumber: toNullableString(row.Number),
            operationType: toNullableString(row.ВидОперации),
            posted,
            counterpartyType,
            counterpartyRefKey,
            contractorId,
            personId,
            cashFlowArticleId,
            purpose,
          },
          update: {
            amount,
            type: definition.sign > 0 ? "INCOME" : "EXPENSE",
            category: "OTHER",
            source: "BUDGET",
            description: toNullableString(row.Комментарий) ?? definition.label,
            date,
            channel: definition.channel,
            documentNumber: toNullableString(row.Number),
            operationType: toNullableString(row.ВидОперации),
            posted,
            counterpartyType,
            counterpartyRefKey,
            contractorId,
            personId,
            cashFlowArticleId,
            purpose,
          },
        });
      });

      return { entity, fetched: rows.length, upserted, errors };
    } catch (error) {
      return this.handleStepError(entity, error);
    }
  }

  private async syncMoneyBalances(): Promise<SyncResult> {
    const entity = REGISTER_ENDPOINTS.cashBalances;

    try {
      const rows = await this.ctx.fetchAll<RegisterRow>(entity);
      let errors = 0;

      const totals = rows.reduce<Record<BalanceType, number>>(
        (accumulator, row) => {
          const balanceType = classifyMoneyBalanceType(row);
          const amount = firstNumber(row, BALANCE_AMOUNT_FIELDS);

          if (!balanceType || amount === null) {
            errors++;
            logger.warn(`[1C-Sync] ${entity}: skipped row without balance classifier or amount`);
            return accumulator;
          }

          accumulator[balanceType] += amount;
          return accumulator;
        },
        {
          [BalanceType.CASH]: 0,
          [BalanceType.BANK]: 0,
          [BalanceType.CONTRACTOR_DEBT]: 0,
        },
      );

      await this.upsertBalanceSnapshot({
        snapshotDate: this.getSnapshotDate(),
        balanceType: BalanceType.CASH,
        amount: totals[BalanceType.CASH],
        contractorId: null,
        label: "Касса",
      });

      await this.upsertBalanceSnapshot({
        snapshotDate: this.getSnapshotDate(),
        balanceType: BalanceType.BANK,
        amount: totals[BalanceType.BANK],
        contractorId: null,
        label: "Расчетный счет",
      });

      return { entity, fetched: rows.length, upserted: 2, errors };
    } catch (error) {
      if (this.isMissingOneCEntityError(error)) {
        this.logMissingOneCEntityFallback(entity);

        try {
          return await this.syncMoneyBalancesFromTransactions(entity);
        } catch (fallbackError) {
          return this.handleStepError(entity, fallbackError);
        }
      }

      return this.handleStepError(entity, error);
    }
  }

  private async syncContractorBalances(): Promise<SyncResult> {
    const entity = REGISTER_ENDPOINTS.contractorSettlements;

    try {
      const rows = await this.ctx.fetchAll<RegisterRow>(entity);
      let errors = 0;
      const totals = new Map<string, number>();

      for (const row of rows) {
        const contractorRefKey = firstString(row, CONTRACTOR_REF_FIELDS);
        const amount = firstNumber(row, BALANCE_AMOUNT_FIELDS);

        if (!contractorRefKey || amount === null) {
          errors++;
          logger.warn(`[1C-Sync] ${entity}: skipped row without contractor ref or amount`);
          continue;
        }

        totals.set(contractorRefKey, (totals.get(contractorRefKey) ?? 0) + amount);
      }

      let upserted = 0;
      for (const [contractorRefKey, amount] of totals.entries()) {
        const contractorId = await resolveContractorId(this.ctx, contractorRefKey);

        if (!contractorId) {
          errors++;
          logger.warn(`[1C-Sync] ${entity}: contractor not found for ${contractorRefKey}`);
          continue;
        }

        const contractor = await this.ctx.db.contractor.findUnique({
          where: { id: contractorId },
          select: { name: true },
        });

        await this.upsertBalanceSnapshot({
          snapshotDate: this.getSnapshotDate(),
          balanceType: BalanceType.CONTRACTOR_DEBT,
          amount,
          contractorId,
          label: contractor?.name ?? contractorRefKey,
        });

        upserted++;
      }

      return { entity, fetched: rows.length, upserted, errors };
    } catch (error) {
      if (this.isMissingOneCEntityError(error)) {
        this.logMissingOneCEntityFallback(entity);

        try {
          return await this.syncContractorBalancesFromTransactions(entity);
        } catch (fallbackError) {
          return this.handleStepError(entity, fallbackError);
        }
      }

      return this.handleStepError(entity, error);
    }
  }

  private isMissingOneCEntityError(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 404;
  }

  private isOneCAuthorizationError(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.status === 401;
  }

  private logMissingOneCEntityFallback(entity: string): void {
    if (this.missingOneCEntityWarnings.has(entity)) {
      return;
    }

    this.missingOneCEntityWarnings.add(entity);
    logger.warn(
      `[1C-Sync] ${entity}: endpoint not available in current 1C OData, using calculated fallback from synced finance documents`,
    );
  }

  private async syncMoneyBalancesFromTransactions(entity: string): Promise<SyncResult> {
    const snapshotDate = this.getSnapshotDate();
    const [cashAgg, bankAgg] = await Promise.all([
      this.ctx.db.financeTransaction.aggregate({
        where: { channel: TransactionChannel.CASH },
        _sum: { amount: true },
      }),
      this.ctx.db.financeTransaction.aggregate({
        where: { channel: TransactionChannel.BANK },
        _sum: { amount: true },
      }),
    ]);

    await this.upsertBalanceSnapshot({
      snapshotDate,
      balanceType: BalanceType.CASH,
      amount: Number(cashAgg._sum.amount ?? 0),
      contractorId: null,
      label: "Касса",
    });

    await this.upsertBalanceSnapshot({
      snapshotDate,
      balanceType: BalanceType.BANK,
      amount: Number(bankAgg._sum.amount ?? 0),
      contractorId: null,
      label: "Расчетный счет",
    });

    return { entity, fetched: 0, upserted: 2, errors: 0 };
  }

  private async syncContractorBalancesFromTransactions(entity: string): Promise<SyncResult> {
    const snapshotDate = this.getSnapshotDate();
    const transactions = await this.ctx.db.financeTransaction.findMany({
      where: { contractorId: { not: null } },
      select: { contractorId: true, amount: true },
    });

    const contractorDebts = new Map<number, number>();

    for (const transaction of transactions) {
      if (!transaction.contractorId) {
        continue;
      }

      contractorDebts.set(
        transaction.contractorId,
        (contractorDebts.get(transaction.contractorId) ?? 0) + Number(transaction.amount ?? 0),
      );
    }

    let upserted = 0;
    let errors = 0;

    for (const [contractorId, amount] of contractorDebts.entries()) {
      try {
        const contractor = await this.ctx.db.contractor.findUnique({
          where: { id: contractorId },
          select: { name: true },
        });

        await this.upsertBalanceSnapshot({
          snapshotDate,
          balanceType: BalanceType.CONTRACTOR_DEBT,
          amount,
          contractorId,
          label: contractor?.name ?? `Контрагент #${contractorId}`,
        });

        upserted++;
      } catch (fallbackError) {
        errors++;
        logger.error(
          `[1C-Sync] ${entity} calculated fallback error:`,
          fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        );
      }
    }

    return { entity, fetched: 0, upserted, errors };
  }

  private async upsertBalanceSnapshot(data: Prisma.BalanceSnapshotUncheckedCreateInput): Promise<void> {
    const where: Prisma.BalanceSnapshotWhereInput = {
      snapshotDate: data.snapshotDate as Date,
      balanceType: data.balanceType as BalanceType,
      contractorId: data.contractorId ?? null,
    };

    await this.ctx.db.$transaction(async (tx) => {
      await tx.balanceSnapshot.deleteMany({ where });
      await tx.balanceSnapshot.create({ data });
    });
  }

  private handleStepError(entity: string, error: unknown): SyncResult {
    if (isNetworkError(error) || this.isOneCAuthorizationError(error)) {
      throw error;
    }

    logger.error(`[1C-Sync] ${entity} error:`, error instanceof Error ? error.message : String(error));
    return {
      entity,
      fetched: 0,
      upserted: 0,
      errors: 1,
    };
  }
}

export const oneCSyncService = new OneCSyncService();