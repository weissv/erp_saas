// src/hooks/useChildren.ts
// Предметные hooks для модуля «Дети»

import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiRequestError } from '../lib/api';
import { toast } from 'sonner';
import type {
  Child,
  ChildDetail,
  ChildFilters,
  CreateChildInput,
  UpdateChildInput,
  TemporaryAbsence,
  CreateAbsenceInput,
  Group,
} from '../types/child';
import type { PaginatedResponse } from '../types/common';

// ===== Children List =====

interface UseChildrenOptions {
  initialPage?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  autoFetch?: boolean;
}

export function useChildren(options: UseChildrenOptions = {}) {
  const { initialPage = 1, pageSize = 10, sortBy, sortOrder = 'asc', autoFetch = true } = options;

  const [data, setData] = useState<Child[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [filters, setFilters] = useState<ChildFilters>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (sortBy) {
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.groupId) params.append('groupId', String(filters.groupId));
      if (filters.gender) params.append('gender', filters.gender);

      const response = await api.get(`/api/children?${params.toString()}`);
      if (!mountedRef.current) return;

      const items = Array.isArray(response?.items) ? response.items : [];
      const resolvedTotal = typeof response?.total === 'number' ? response.total : items.length;

      setData(items);
      setTotal(resolvedTotal);
    } catch (err) {
      if (!mountedRef.current) return;
      const apiError = err instanceof ApiRequestError ? err : new ApiRequestError(String(err), 500);
      setError(apiError);
      toast.error('Ошибка загрузки списка детей', { description: apiError.message });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, filters]);

  useEffect(() => {
    mountedRef.current = true;
    if (autoFetch) fetchData();
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (autoFetch) fetchData();
  }, [page, JSON.stringify(filters)]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return {
    data,
    total,
    totalPages,
    page,
    pageSize,
    filters,
    loading,
    error,
    setPage,
    setFilters,
    refresh: fetchData,
  };
}

// ===== Child Detail =====

export function useChild(id: number | null) {
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiRequestError | null>(null);

  const fetchChild = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/api/children/${id}`);
      setChild(data);
    } catch (err) {
      const apiError = err instanceof ApiRequestError ? err : new ApiRequestError(String(err), 500);
      setError(apiError);
      toast.error('Ошибка загрузки данных ребёнка', { description: apiError.message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChild();
  }, [id]);

  return { child, loading, error, refresh: fetchChild };
}

// ===== Child Mutations =====

export function useChildMutations() {
  const [saving, setSaving] = useState(false);

  const createChild = useCallback(async (data: CreateChildInput): Promise<ChildDetail> => {
    setSaving(true);
    try {
      const result = await api.post('/api/children', data);
      toast.success('Ребёнок успешно добавлен');
      return result;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateChild = useCallback(async (id: number, data: UpdateChildInput): Promise<ChildDetail> => {
    setSaving(true);
    try {
      const result = await api.put(`/api/children/${id}`, data);
      toast.success('Данные ребёнка обновлены');
      return result;
    } finally {
      setSaving(false);
    }
  }, []);

  const archiveChild = useCallback(async (id: number): Promise<void> => {
    setSaving(true);
    try {
      await api.put(`/api/children/${id}/archive`, {});
      toast.success('Ребёнок переведён в архив');
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteChild = useCallback(async (id: number): Promise<void> => {
    setSaving(true);
    try {
      await api.delete(`/api/children/${id}`);
      toast.success('Ученик удалён');
    } finally {
      setSaving(false);
    }
  }, []);

  return { saving, createChild, updateChild, archiveChild, deleteChild };
}

// ===== Absences =====

export function useAbsences(childId: number | null) {
  const [absences, setAbsences] = useState<TemporaryAbsence[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAbsences = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const data = await api.get(`/api/children/${childId}/absences`);
      setAbsences(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('Ошибка загрузки отсутствий', { description: err?.message });
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchAbsences();
  }, [childId]);

  const addAbsence = useCallback(async (data: CreateAbsenceInput) => {
    if (!childId) return;
    const absence = await api.post(`/api/children/${childId}/absences`, {
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      reason: data.reason,
    });
    toast.success('Отсутствие добавлено');
    await fetchAbsences();
    return absence;
  }, [childId, fetchAbsences]);

  const deleteAbsence = useCallback(async (absenceId: number) => {
    await api.delete(`/api/children/absences/${absenceId}`);
    toast.success('Отсутствие удалено');
    await fetchAbsences();
  }, [fetchAbsences]);

  return { absences, loading, refresh: fetchAbsences, addAbsence, deleteAbsence };
}

// ===== Groups for select =====

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get('/api/groups')
      .then((data) => {
        if (mounted) setGroups(Array.isArray(data) ? data : []);
      })
      .catch((err: any) => {
        toast.error('Ошибка загрузки классов', { description: err?.message });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  return { groups, loading };
}
