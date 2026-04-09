// src/hooks/useApi.ts
// Улучшенный хук для загрузки данных с пагинацией
// Обратно совместим со старым API

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, getApiErrorMessage, ApiRequestError } from '../lib/api';
import { toast } from 'sonner';

interface UseApiOptions<T> {
  url: string;
  initialPage?: number;
  initialPageSize?: number;
  initialSearch?: string;
  searchFields?: (keyof T)[];
  /** Автоматически загружать данные при монтировании */
  autoFetch?: boolean;
  /** Показывать toast при ошибке */
  showErrorToast?: boolean;
  /** Дополнительные фильтры */
  filters?: Record<string, any>;
  /** Поле сортировки */
  sortBy?: string;
  /** Порядок сортировки */
  sortOrder?: 'asc' | 'desc';
  /** Включить запрос */
  enabled?: boolean;
}

interface UseApiReturn<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  loading: boolean;
  error: ApiRequestError | null;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setFilters: (filters: Record<string, any>) => void;
  fetchData: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useApi<T>({
  url,
  initialPage = 1,
  initialPageSize = 10,
  initialSearch = '',
  searchFields = [],
  autoFetch = true,
  showErrorToast = true,
  filters: initialFilters = {},
  sortBy,
  sortOrder = 'asc',
  enabled = true,
}: UseApiOptions<T>): UseApiReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);
  
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(initialPageSize),
      });

      // Добавляем сортировку
      if (sortBy) {
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
      }

      // Добавляем поиск
      if (search && searchFields.length > 0) {
        searchFields.forEach((field) => {
          params.append(field as string, search);
        });
      }

      // Добавляем фильтры
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await api.get(`${url}?${params.toString()}`);

      if (!mountedRef.current) return;

      // Поддерживаем разные форматы ответа
      const resolvedItems = Array.isArray(response)
        ? response
        : Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.data?.items)
            ? response.data.items
            : Array.isArray(response?.data)
              ? response.data
              : [];

      const resolvedTotal = typeof response?.total === 'number'
        ? response.total
        : typeof response?.data?.total === 'number'
          ? response.data.total
          : typeof response?.count === 'number'
            ? response.count
            : resolvedItems.length;

      setData(resolvedItems);
      setTotal(resolvedTotal);
    } catch (err) {
      if (!mountedRef.current) return;
      
      // Игнорируем ошибки отмены
      if (err instanceof Error && err.name === 'AbortError') return;
      
      const apiError = err instanceof ApiRequestError
        ? err
        : new ApiRequestError(getApiErrorMessage(err), 500);
      
      setError(apiError);
      
      if (showErrorToast) {
        toast.error('Ошибка загрузки данных', {
          description: apiError.message,
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, page, initialPageSize, search, searchFields, filters, sortBy, sortOrder, enabled, showErrorToast]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Начальная загрузка
  useEffect(() => {
    mountedRef.current = true;
    
    if (autoFetch && enabled) {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Перезагрузка при изменении параметров
  useEffect(() => {
    if (autoFetch && enabled) {
      fetchData();
    }
  }, [page, search, JSON.stringify(filters)]);

  const totalPages = Math.ceil(total / initialPageSize) || 1;

  return {
    data,
    total,
    page,
    pageSize: initialPageSize,
    totalPages,
    search,
    loading,
    error,
    setPage,
    setSearch,
    setFilters,
    fetchData,
    refresh,
  };
}
