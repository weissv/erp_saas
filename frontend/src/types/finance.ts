// src/types/finance.ts
// Финансовые типы, синхронизированные с новой 1С-моделью

import type {
  BalanceItem,
  BalanceType,
  CashFlowArticleRef,
  ContractorRef,
  Invoice,
  InvoiceDirection,
  OneCBalancesResponse,
  OneCDebtorItem,
  OneCDebtorsResponse,
  PersonRef,
  TransactionChannel,
} from "../features/onec/types";

export type FinanceType = 'INCOME' | 'EXPENSE';
export type FinanceCategory = 'NUTRITION' | 'CLUBS' | 'MAINTENANCE' | 'SALARY' | 'OTHER';

export type FinanceTransaction = {
  id: number;
  externalId?: string | null;
  amount: number | string;
  type: FinanceType;
  category: FinanceCategory;
  source: 'BUDGET' | 'EXTRA_BUDGET';
  description?: string | null;
  date: string;
  documentUrl?: string | null;
  channel?: TransactionChannel | null;
  documentNumber?: string | null;
  operationType?: string | null;
  posted?: boolean | null;
  counterpartyType?: string | null;
  purpose?: string | null;
  contractor?: ContractorRef | null;
  person?: PersonRef | null;
  cashFlowArticle?: CashFlowArticleRef | null;
  club?: { name: string } | null;
  createdAt: string;
};

export type BalancesResponse = OneCBalancesResponse;
export type DebtorItem = OneCDebtorItem;
export type DebtorsResponse = OneCDebtorsResponse;

export type {
  BalanceItem,
  BalanceType,
  CashFlowArticleRef,
  ContractorRef,
  Invoice,
  InvoiceDirection,
  PersonRef,
  TransactionChannel,
};

/** @deprecated Use FinanceTransaction */
export type Transaction = {
  id: number;
  amount: number;
  type: string;
  category: string;
  description?: string;
  date: string;
};
