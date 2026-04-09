export type TransactionChannel = "CASH" | "BANK";
export type InvoiceDirection = "INCOMING" | "OUTGOING";
export type BalanceType = "CASH" | "BANK" | "CONTRACTOR_DEBT";

export interface ContractorRef {
  id: number;
  name: string;
  inn?: string | null;
}

export interface PersonRef {
  id: number;
  name: string;
}

export interface CashFlowArticleRef {
  id: number;
  name: string;
}

export type FinanceType = "INCOME" | "EXPENSE";
export type FinanceCategory = "NUTRITION" | "CLUBS" | "MAINTENANCE" | "SALARY" | "OTHER";

export interface OneCSyncResult {
  entity: string;
  fetched: number;
  upserted: number;
  errors: number;
}

export interface OneCSyncReport {
  startedAt: string;
  finishedAt: string;
  results: OneCSyncResult[];
  aborted: boolean;
  error?: string;
}

export interface OneCGroupedCount {
  type: string;
  count: number;
}

export interface OneCSummarySection {
  total: number;
  byType: OneCGroupedCount[];
}

export interface OneCSummary {
  catalogs: Record<string, number>;
  documents: OneCSummarySection;
  hrDocuments: OneCSummarySection;
  payrollDocuments: OneCSummarySection;
  universalCatalogs: OneCSummarySection;
  registers: OneCSummarySection;
}

export interface OneCPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  limit?: number;
  pages?: number;
}

export interface Invoice {
  id: number;
  externalId: string;
  direction: InvoiceDirection;
  documentNumber?: string | null;
  date: string;
  posted: boolean;
  operationType?: string | null;
  totalAmount: number | string;
  comment?: string | null;
  contractor?: ContractorRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceTransaction {
  id: number;
  externalId?: string | null;
  type: FinanceType;
  category: FinanceCategory;
  channel?: TransactionChannel | null;
  source?: string | null;
  date: string;
  documentNumber?: string | null;
  amount: number | string;
  description?: string | null;
  purpose?: string | null;
  posted?: boolean | null;
  contractor?: ContractorRef | null;
  person?: PersonRef | null;
  cashFlowArticle?: CashFlowArticleRef | null;
  club?: { name: string } | null;
  createdAt: string;
}

export interface BalanceItem {
  type: BalanceType;
  amount: number;
  label?: string | null;
}

export interface OneCBalancesResponse {
  snapshotDate: string | null;
  balances: BalanceItem[];
}

export interface OneCDebtorItem {
  contractorId: number | null;
  contractorName: string;
  contractorInn?: string | null;
  amount: number;
}

export interface OneCDebtorsResponse extends OneCPaginatedResponse<OneCDebtorItem> {
  snapshotDate: string | null;
}

export interface OneCCatalogItem {
  id: number;
  code?: string | null;
  name: string;
  fullName?: string | null;
  accountNumber?: string | null;
  inn?: string | null;
  contractorRefKey?: string | null;
}

export interface OneCDocumentItem {
  id: number;
  docType: string;
  documentNumber?: string | null;
  date?: string | null;
  amount?: number | string | null;
  operationType?: string | null;
  posted?: boolean | null;
  comment?: string | null;
}

export interface OneCHRDocumentItem extends OneCDocumentItem {
  dateStart?: string | null;
  dateEnd?: string | null;
}

export interface OneCPayrollDocumentItem extends OneCDocumentItem {
  period?: string | null;
}

export interface OneCUniversalCatalogItem {
  id: number;
  catalogType: string;
  code?: string | null;
  name: string;
  isFolder?: boolean | null;
}

export interface OneCRegisterItem {
  id: number;
  registerType: string;
  registerKind: string;
  period?: string | null;
  recorder?: string | null;
  data?: unknown;
}

export interface OneCInvoiceFilters {
  direction?: InvoiceDirection | "";
  contractorId?: string;
  posted?: "true" | "false" | "";
  startDate?: string;
  endDate?: string;
}

export interface OneCTransactionFilters {
  channel?: TransactionChannel | "";
  type?: FinanceType | "";
  category?: FinanceCategory | "";
  search?: string;
  startDate?: string;
  endDate?: string;
  contractorId?: string;
  personId?: string;
  cashFlowArticleId?: string;
  posted?: "true" | "false" | "";
}

export interface OneCDocumentFilters {
  docType?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface OneCUniversalCatalogFilters {
  catalogType?: string;
  search?: string;
}

export interface OneCRegisterFilters {
  registerType?: string;
  registerTypes?: string;
  registerKind?: string;
}
