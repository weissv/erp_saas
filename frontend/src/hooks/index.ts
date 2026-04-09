// src/hooks/index.ts
// Экспорт всех кастомных хуков

// API hooks
export { useApi } from './useApi';
export { useQuery, usePaginatedQuery } from './useQuery';
export type { UseQueryOptions, UseQueryReturn, UsePaginatedQueryOptions, UsePaginatedQueryReturn } from './useQuery';
export { useMutation, useCreate, useUpdate, useDelete } from './useMutation';
export type { UseMutationOptions, UseMutationReturn } from './useMutation';

// Pagination
export { usePagination } from './usePagination';
export type { UsePaginationOptions, UsePaginationReturn } from './usePagination';

// Auth
export { useAuth } from './useAuth';

// Utils
export { useKonamiCode } from './useKonamiCode';

// Re-export types
export type { ApiRequestError } from '../lib/api';
