import { useCallback, useEffect, useState } from "react";
import {
  getOneCBalances,
  getOneCSummary,
  listOneCContractors,
  listOneCDebtors,
  listOneCInvoices,
  listOneCProcurementInvoices,
  listOneCTransactions,
  triggerOneCSync,
} from "./api";
import type {
  ContractorRef,
  FinanceTransaction,
  Invoice,
  OneCBalancesResponse,
  OneCDebtorItem,
  OneCDebtorsResponse,
  OneCInvoiceFilters,
  OneCPaginatedResponse,
  OneCSummary,
  OneCSyncReport,
  OneCTransactionFilters,
} from "./types";

interface AsyncValueState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<T | null>;
}

interface PaginatedResourceState<T, TFilters extends object> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  loading: boolean;
  error: Error | null;
  filters: TFilters;
  setPage: (page: number) => void;
  setFilters: (filters: TFilters) => void;
  refresh: () => Promise<OneCPaginatedResponse<T> | null>;
  response: OneCPaginatedResponse<T> | null;
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function useAsyncValue<T>(loader: () => Promise<T>): AsyncValueState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextData = await loader();
      setData(nextData);
      return nextData;
    } catch (nextError) {
      const resolvedError = toError(nextError);
      setError(resolvedError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

interface PaginatedOptions<T, TFilters extends object> {
  loader: (params: TFilters & { page: number; pageSize: number }) => Promise<OneCPaginatedResponse<T>>;
  initialFilters: TFilters;
  initialPageSize?: number;
  enabled?: boolean;
}

export function usePaginatedOneCResource<T, TFilters extends object>({
  loader,
  initialFilters,
  initialPageSize = 50,
  enabled = true,
}: PaginatedOptions<T, TFilters>): PaginatedResourceState<T, TFilters> {
  const [response, setResponse] = useState<OneCPaginatedResponse<T> | null>(null);
  const [filters, setFiltersState] = useState<TFilters>(initialFilters);
  const [page, setPageState] = useState(1);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return null;

    setLoading(true);
    setError(null);

    try {
      const nextResponse = await loader({ ...filters, page, pageSize: initialPageSize });
      setResponse(nextResponse);
      return nextResponse;
    } catch (nextError) {
      const resolvedError = toError(nextError);
      setError(resolvedError);
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, filters, initialPageSize, loader, page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setPage = useCallback((nextPage: number) => {
    setPageState(Math.max(1, nextPage));
  }, []);

  const setFilters = useCallback((nextFilters: TFilters) => {
    setPageState(1);
    setFiltersState(nextFilters);
  }, []);

  return {
    items: response?.items ?? [],
    total: response?.total ?? 0,
    page,
    pageSize: response?.pageSize ?? initialPageSize,
    totalPages: response?.totalPages ?? 1,
    loading,
    error,
    filters,
    setPage,
    setFilters,
    refresh,
    response,
  };
}

export function useOneCSummary() {
  return useAsyncValue<OneCSummary>(getOneCSummary);
}

export function useOneCContractors() {
  return useAsyncValue<ContractorRef[]>(listOneCContractors);
}

export function useOneCBalances() {
  return useAsyncValue<OneCBalancesResponse>(getOneCBalances);
}

export function useOneCTransactions(initialFilters: OneCTransactionFilters = {}, initialPageSize = 20) {
  const [stableFilters] = useState(() => initialFilters);
  const resource = usePaginatedOneCResource<FinanceTransaction, OneCTransactionFilters>({
    loader: listOneCTransactions,
    initialFilters: stableFilters,
    initialPageSize,
  });

  return resource;
}

export function useOneCInvoices(initialFilters: OneCInvoiceFilters = {}, initialPageSize = 20) {
  const [stableFilters] = useState(() => initialFilters);
  const resource = usePaginatedOneCResource<Invoice, OneCInvoiceFilters>({
    loader: listOneCInvoices,
    initialFilters: stableFilters,
    initialPageSize,
  });

  return resource;
}

export function useOneCDebtors(initialPageSize = 50) {
  const resource = usePaginatedOneCResource<OneCDebtorItem, Record<string, never>>({
    loader: listOneCDebtors,
    initialFilters: {},
    initialPageSize,
  });

  return {
    ...resource,
    snapshotDate: (resource.response as OneCDebtorsResponse | null)?.snapshotDate ?? null,
  };
}

export function useOneCSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastReport, setLastReport] = useState<OneCSyncReport | null>(null);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const report = await triggerOneCSync();
      setLastReport(report);
      return report;
    } finally {
      setSyncing(false);
    }
  }, []);

  return {
    syncing,
    lastReport,
    sync,
  };
}

export function useOneCProcurementInvoices(initialPageSize = 20) {
  return usePaginatedOneCResource<Invoice, Record<string, never>>({
    loader: listOneCProcurementInvoices,
    initialFilters: {},
    initialPageSize,
  });
}
