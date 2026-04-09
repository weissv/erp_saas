// src/hooks/useQuery.ts
// Улучшенный хук для запросов данных

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { api, getApiErrorMessage, ApiRequestError, PaginatedResponse } from '../lib/api';

export interface UseQueryOptions<TData> {
  /** URL эндпоинта */
  url: string;
  /** Параметры запроса */
  params?: Record<string, any>;
  /** Включить запрос */
  enabled?: boolean;
  /** Показывать toast при ошибке */
  showErrorToast?: boolean;
  /** Сообщение при ошибке */
  errorMessage?: string;
  /** Время кеширования (мс) */
  staleTime?: number;
  /** Интервал повторного запроса (мс) */
  refetchInterval?: number | false;
  /** Повторять запрос при изменении focus */
  refetchOnWindowFocus?: boolean;
  /** Callback при успехе */
  onSuccess?: (data: TData) => void;
  /** Callback при ошибке */
  onError?: (error: ApiRequestError) => void;
  /** Начальные данные */
  initialData?: TData;
  /** Трансформация данных */
  select?: (data: any) => TData;
}

export interface UseQueryReturn<TData> {
  /** Данные запроса */
  data: TData | undefined;
  /** Ошибка запроса */
  error: ApiRequestError | undefined;
  /** Флаг загрузки (первичной) */
  isLoading: boolean;
  /** Флаг загрузки (любой) */
  isFetching: boolean;
  /** Запрос успешен */
  isSuccess: boolean;
  /** Запрос завершился ошибкой */
  isError: boolean;
  /** Перезапустить запрос */
  refetch: () => Promise<void>;
  /** Сбросить состояние */
  reset: () => void;
}

export function useQuery<TData = any>(
  options: UseQueryOptions<TData>
): UseQueryReturn<TData> {
  const {
    url,
    params,
    enabled = true,
    showErrorToast = false,
    errorMessage,
    staleTime = 0,
    refetchInterval = false,
    refetchOnWindowFocus = false,
    onSuccess,
    onError,
    initialData,
    select,
  } = options;

  const [data, setData] = useState<TData | undefined>(initialData);
  const [error, setError] = useState<ApiRequestError | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(!initialData && enabled);
  const [isFetching, setIsFetching] = useState(false);
  const [isSuccess, setIsSuccess] = useState(!!initialData);
  const [isError, setIsError] = useState(false);

  const lastFetchTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);

  // Мемоизируем параметры для сравнения
  const paramsKey = useMemo(() => JSON.stringify(params), [params]);

  const fetchData = useCallback(async () => {
    // Проверяем staleTime
    const now = Date.now();
    if (staleTime > 0 && now - lastFetchTimeRef.current < staleTime && data) {
      return;
    }

    setIsFetching(true);

    try {
      const response = await api.get(url, params);
      
      if (!mountedRef.current) return;

      const transformedData = select ? select(response) : response;
      
      setData(transformedData);
      setIsSuccess(true);
      setIsError(false);
      setError(undefined);
      lastFetchTimeRef.current = Date.now();
      
      onSuccess?.(transformedData);
    } catch (err) {
      if (!mountedRef.current) return;

      const apiError = err instanceof ApiRequestError
        ? err
        : new ApiRequestError(getApiErrorMessage(err), 500);
      
      setError(apiError);
      setIsError(true);
      setIsSuccess(false);
      
      if (showErrorToast) {
        toast.error(errorMessage || 'Ошибка загрузки', {
          description: apiError.message,
        });
      }
      
      onError?.(apiError);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsFetching(false);
      }
    }
  }, [url, paramsKey, staleTime, data, select, showErrorToast, errorMessage, onSuccess, onError]);

  const refetch = useCallback(async () => {
    lastFetchTimeRef.current = 0; // Сбрасываем кеш
    await fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setData(initialData);
    setError(undefined);
    setIsLoading(false);
    setIsFetching(false);
    setIsSuccess(!!initialData);
    setIsError(false);
    lastFetchTimeRef.current = 0;
  }, [initialData]);

  // Запрос при монтировании и изменении зависимостей
  useEffect(() => {
    mountedRef.current = true;
    
    if (enabled) {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [enabled, url, paramsKey]);

  // Интервал повторных запросов
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const intervalId = setInterval(() => {
      fetchData();
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, fetchData]);

  // Повторный запрос при focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, fetchData]);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isSuccess,
    isError,
    refetch,
    reset,
  };
}

// ============================================================================
// СПЕЦИАЛИЗИРОВАННЫЕ ХУКИ
// ============================================================================

export interface UsePaginatedQueryOptions<TItem> extends Omit<UseQueryOptions<PaginatedResponse<TItem>>, 'params'> {
  /** Текущая страница */
  page?: number;
  /** Размер страницы */
  pageSize?: number;
  /** Поле сортировки */
  sortBy?: string;
  /** Порядок сортировки */
  sortOrder?: 'asc' | 'desc';
  /** Фильтры */
  filters?: Record<string, any>;
  /** Поисковый запрос */
  search?: string;
  /** Поля для поиска */
  searchFields?: string[];
}

export interface UsePaginatedQueryReturn<TItem> extends UseQueryReturn<PaginatedResponse<TItem>> {
  items: TItem[];
  total: number;
  totalPages: number;
}

/**
 * Хук для пагинированных запросов
 */
export function usePaginatedQuery<TItem = any>(
  options: UsePaginatedQueryOptions<TItem>
): UsePaginatedQueryReturn<TItem> {
  const {
    url,
    page = 1,
    pageSize = 10,
    sortBy,
    sortOrder = 'asc',
    filters = {},
    search,
    searchFields = [],
    ...restOptions
  } = options;

  const params = useMemo(() => {
    const result: Record<string, any> = {
      page,
      pageSize,
    };

    if (sortBy) {
      result.sortBy = sortBy;
      result.sortOrder = sortOrder;
    }

    // Добавляем фильтры
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value;
      }
    });

    // Добавляем поиск
    if (search && searchFields.length > 0) {
      searchFields.forEach((field) => {
        result[field] = search;
      });
    }

    return result;
  }, [page, pageSize, sortBy, sortOrder, filters, search, searchFields]);

  const query = useQuery<PaginatedResponse<TItem>>({
    ...restOptions,
    url,
    params,
  });

  return {
    ...query,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    totalPages: query.data?.totalPages ?? Math.ceil((query.data?.total ?? 0) / pageSize),
  };
}
