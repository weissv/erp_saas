// src/hooks/useMutation.ts
// Хук для мутаций (создание, обновление, удаление)

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api, getApiErrorMessage, ApiRequestError } from '../lib/api';

export interface UseMutationOptions<TData, TVariables> {
  /** URL эндпоинта */
  url: string;
  /** HTTP метод */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Сообщение при успехе */
  successMessage?: string;
  /** Сообщение при ошибке */
  errorMessage?: string;
  /** Показывать toast при успехе */
  showSuccessToast?: boolean;
  /** Показывать toast при ошибке */
  showErrorToast?: boolean;
  /** Callback при успехе */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Callback при ошибке */
  onError?: (error: ApiRequestError, variables: TVariables) => void;
  /** Callback в любом случае (finally) */
  onSettled?: (data: TData | undefined, error: ApiRequestError | undefined, variables: TVariables) => void;
  /** Трансформация данных перед отправкой */
  transformVariables?: (variables: TVariables) => any;
}

export interface UseMutationReturn<TData, TVariables> {
  /** Выполнить мутацию */
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  /** Асинхронная версия мутации, которая возвращает Promise */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Данные последнего успешного запроса */
  data: TData | undefined;
  /** Ошибка последнего запроса */
  error: ApiRequestError | undefined;
  /** Флаг загрузки */
  isLoading: boolean;
  /** Мутация выполнена успешно */
  isSuccess: boolean;
  /** Мутация завершилась ошибкой */
  isError: boolean;
  /** Сбросить состояние */
  reset: () => void;
}

export function useMutation<TData = any, TVariables = any>(
  options: UseMutationOptions<TData, TVariables>
): UseMutationReturn<TData, TVariables> {
  const {
    url,
    method = 'POST',
    successMessage,
    errorMessage,
    showSuccessToast = true,
    showErrorToast = true,
    onSuccess,
    onError,
    onSettled,
    transformVariables,
  } = options;

  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<ApiRequestError | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setIsLoading(false);
    setIsSuccess(false);
    setIsError(false);
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setIsSuccess(false);
      setIsError(false);
      setError(undefined);

      try {
        const payload = transformVariables ? transformVariables(variables) : variables;
        
        let result: TData;
        switch (method) {
          case 'POST':
            result = await api.post<TData>(url, payload);
            break;
          case 'PUT':
            result = await api.put<TData>(url, payload);
            break;
          case 'PATCH':
            result = await api.patch<TData>(url, payload);
            break;
          case 'DELETE':
            result = await api.delete<TData>(url);
            break;
          default:
            result = await api.post<TData>(url, payload);
        }

        setData(result);
        setIsSuccess(true);
        
        if (showSuccessToast && successMessage) {
          toast.success(successMessage);
        }
        
        onSuccess?.(result, variables);
        onSettled?.(result, undefined, variables);

        return result;
      } catch (err) {
        const apiError = err instanceof ApiRequestError 
          ? err 
          : new ApiRequestError(getApiErrorMessage(err), 500);
        
        setError(apiError);
        setIsError(true);
        
        if (showErrorToast) {
          toast.error(errorMessage || 'Ошибка', {
            description: apiError.message,
          });
        }
        
        onError?.(apiError, variables);
        onSettled?.(undefined, apiError, variables);

        throw apiError;
      } finally {
        setIsLoading(false);
      }
    },
    [url, method, successMessage, errorMessage, showSuccessToast, showErrorToast, onSuccess, onError, onSettled, transformVariables]
  );

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | undefined> => {
      try {
        return await mutateAsync(variables);
      } catch {
        return undefined;
      }
    },
    [mutateAsync]
  );

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isLoading,
    isSuccess,
    isError,
    reset,
  };
}

// ============================================================================
// СПЕЦИАЛИЗИРОВАННЫЕ ХУКИ
// ============================================================================

/**
 * Хук для создания ресурса
 */
export function useCreate<TData = any, TVariables = any>(
  url: string,
  options?: Partial<UseMutationOptions<TData, TVariables>>
) {
  return useMutation<TData, TVariables>({
    url,
    method: 'POST',
    successMessage: 'Успешно создано',
    ...options,
  });
}

/**
 * Хук для обновления ресурса
 */
export function useUpdate<TData = any, TVariables = any>(
  url: string,
  options?: Partial<UseMutationOptions<TData, TVariables>>
) {
  return useMutation<TData, TVariables>({
    url,
    method: 'PUT',
    successMessage: 'Успешно обновлено',
    ...options,
  });
}

/**
 * Хук для удаления ресурса
 */
export function useDelete<TData = any, TVariables = void>(
  url: string,
  options?: Partial<UseMutationOptions<TData, TVariables>>
) {
  return useMutation<TData, TVariables>({
    url,
    method: 'DELETE',
    successMessage: 'Успешно удалено',
    ...options,
  });
}
