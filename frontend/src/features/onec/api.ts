import { api } from "../../lib/api";
import type {
  ContractorRef,
  FinanceTransaction,
  Invoice,
  OneCBalancesResponse,
  OneCCatalogItem,
  OneCDebtorsResponse,
  OneCDocumentFilters,
  OneCDocumentItem,
  OneCHRDocumentItem,
  OneCInvoiceFilters,
  OneCPaginatedResponse,
  OneCPayrollDocumentItem,
  OneCRegisterFilters,
  OneCRegisterItem,
  OneCSummary,
  OneCSyncReport,
  OneCTransactionFilters,
  OneCUniversalCatalogFilters,
  OneCUniversalCatalogItem,
} from "./types";

type QueryPrimitive = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryPrimitive>;
type PaginatedQuery = { page?: number; pageSize?: number; limit?: number };

function buildQueryParams(params?: QueryParams) {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

function normalizePaginatedResponse<T>(response: OneCPaginatedResponse<T>): OneCPaginatedResponse<T> {
  const pageSize = response.pageSize || response.limit || response.items.length || 1;
  const totalPages = response.totalPages || response.pages || Math.max(1, Math.ceil(response.total / Math.max(1, pageSize)));

  return {
    ...response,
    pageSize,
    totalPages,
    limit: response.limit || pageSize,
    pages: response.pages || totalPages,
  };
}

export function getOneCSummary() {
  return api.get<OneCSummary>("/onec-data/summary");
}

export function triggerOneCSync() {
  return api.post<OneCSyncReport>("/integrations/1c/sync");
}

export function listOneCTransactions(params?: OneCTransactionFilters & PaginatedQuery) {
  return api
    .get<OneCPaginatedResponse<FinanceTransaction>>("/finance/transactions", buildQueryParams(params as QueryParams | undefined))
    .then(normalizePaginatedResponse);
}

export function listOneCContractors() {
  return api.get<ContractorRef[]>("/finance/contractors");
}

export function listOneCCatalog(type: string, params?: QueryParams) {
  return api
    .get<OneCPaginatedResponse<OneCCatalogItem>>(`/onec-data/catalogs/${type}`, buildQueryParams(params))
    .then(normalizePaginatedResponse);
}

export function listOneCDocuments(params?: OneCDocumentFilters & QueryParams) {
  return api
    .get<OneCPaginatedResponse<OneCDocumentItem>>("/onec-data/documents", buildQueryParams(params))
    .then(normalizePaginatedResponse);
}

export function listOneCHRDocuments(params?: OneCDocumentFilters & QueryParams) {
  return api
    .get<OneCPaginatedResponse<OneCHRDocumentItem>>("/onec-data/hr-documents", buildQueryParams(params))
    .then(normalizePaginatedResponse);
}

export function listOneCPayrollDocuments(params?: Omit<OneCDocumentFilters, "search"> & QueryParams) {
  return api
    .get<OneCPaginatedResponse<OneCPayrollDocumentItem>>("/onec-data/payroll-documents", buildQueryParams(params))
    .then(normalizePaginatedResponse);
}

export function listOneCUniversalCatalogs(params?: OneCUniversalCatalogFilters & QueryParams) {
  return api
    .get<OneCPaginatedResponse<OneCUniversalCatalogItem>>("/onec-data/universal-catalogs", buildQueryParams(params))
    .then(normalizePaginatedResponse);
}

export function listOneCRegisters(params?: OneCRegisterFilters & QueryParams) {
  return api
    .get<OneCPaginatedResponse<OneCRegisterItem>>("/onec-data/registers", buildQueryParams(params))
    .then(normalizePaginatedResponse);
}

export function listOneCInvoices(params?: OneCInvoiceFilters & PaginatedQuery) {
  return api
    .get<OneCPaginatedResponse<Invoice>>("/finance/invoices", buildQueryParams(params as QueryParams | undefined))
    .then(normalizePaginatedResponse);
}

export function getOneCBalances(params?: QueryParams) {
  return api.get<OneCBalancesResponse>("/finance/balances", buildQueryParams(params));
}

export function listOneCDebtors(params?: QueryParams) {
  return api.get<OneCDebtorsResponse>("/finance/debtors", buildQueryParams(params));
}

export function listOneCProcurementInvoices(params?: QueryParams) {
  return api
    .get<OneCPaginatedResponse<Invoice>>("/procurement/invoices", buildQueryParams(params))
    .then(normalizePaginatedResponse);
}
