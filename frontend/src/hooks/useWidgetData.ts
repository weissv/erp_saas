// src/hooks/useWidgetData.ts
// Хук для загрузки данных одного виджета с кэшем и авт-обновлением

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import type { WidgetDataState } from '../types/dashboard';

interface UseWidgetDataOptions {
  widgetId: string;
  enabled?: boolean;
  refreshInterval?: number;
  filters?: Record<string, unknown>;
}

export function useWidgetData<T = unknown>(options: UseWidgetDataOptions): WidgetDataState<T> & { refetch: () => void } {
  const { widgetId, enabled = true, refreshInterval = 0, filters } = options;
  const [state, setState] = useState<WidgetDataState<T>>({
    data: undefined,
    isLoading: true,
    error: undefined,
    lastUpdated: null,
  });
  const mountedRef = useRef(true);
  const filtersKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setState(prev => ({ ...prev, isLoading: !prev.data, error: undefined }));

    try {
      const params = filters ? `?${new URLSearchParams(
        Object.entries(filters).reduce<Record<string, string>>((acc, [k, v]) => {
          if (v !== undefined && v !== null) acc[k] = String(v);
          return acc;
        }, {})
      ).toString()}` : '';

      const data = await api.get(`/api/dashboard/widgets/${widgetId}${params}`);
      if (!mountedRef.current) return;

      setState({
        data: data as T,
        isLoading: false,
        error: undefined,
        lastUpdated: Date.now(),
      });
    } catch (err: any) {
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err?.message || 'Ошибка загрузки',
      }));
    }
  }, [widgetId, enabled, filtersKey]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) fetchData();
    return () => { mountedRef.current = false; };
  }, [fetchData, enabled]);

  // Авт-обновление
  useEffect(() => {
    if (!refreshInterval || !enabled) return;
    const id = setInterval(fetchData, refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, enabled, fetchData]);

  return { ...state, refetch: fetchData };
}
