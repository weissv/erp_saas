export interface OneCSyncResult {
  entity: string;
  fetched: number;
  upserted: number;
  errors: number;
}

export interface OneCSyncReport {
  startedAt: Date;
  finishedAt: Date;
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

export interface OneCBalanceItem {
  type: string;
  amount: number;
  label?: string | null;
}

export interface OneCBalancesResponse {
  snapshotDate: Date | null;
  balances: OneCBalanceItem[];
}

export interface OneCDebtorItem {
  contractorId: number | null;
  contractorName: string;
  contractorInn?: string | null;
  amount: number;
}

export interface OneCDebtorsResponse extends OneCPaginatedResponse<OneCDebtorItem> {
  snapshotDate: Date | null;
}