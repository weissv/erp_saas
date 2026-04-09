// src/lib/api.ts
// Централизованный API клиент с улучшенной обработкой ошибок и типизацией

const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
const normalizedHost = rawBaseUrl.replace(/\/+$/, "");
const apiBase = normalizedHost.endsWith("/api") ? normalizedHost : `${normalizedHost}/api`;

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const buildUrl = (path: string) => {
  if (isAbsoluteUrl(path)) return path;
  const trimmed = path.replace(/^\/+/, "");
  if (!trimmed) return apiBase;
  const withoutApiPrefix = trimmed.startsWith("api/") ? trimmed.slice(4) : trimmed;
  return `${apiBase}/${withoutApiPrefix}`;
};

// ============================================================================
// ТИПЫ
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export class ApiRequestError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static fromResponse(response: Response, body?: any): ApiRequestError {
    const message = body?.error?.message || body?.message || `Request failed with status ${response.status}`;
    const code = body?.error?.code || 'API_ERROR';
    const details = body?.error?.details || body?.issues;
    
    return new ApiRequestError(message, response.status, code, details);
  }

  isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  isForbidden(): boolean {
    return this.statusCode === 403;
  }

  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  isValidationError(): boolean {
    return this.statusCode === 400 || this.code === 'VALIDATION_ERROR';
  }
}

// ============================================================================
// API КЛИЕНТ
// ============================================================================

type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
type ErrorInterceptor = (error: ApiRequestError) => ApiRequestError | Promise<ApiRequestError>;

class API {
  private token: string | null = null;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private onUnauthorized?: () => void;

  /**
   * Установить токен авторизации
   */
  setToken(token: string | null) {
    this.token = token;
  }

  /**
   * Установить callback для обработки 401 ошибок
   */
  setOnUnauthorized(callback: () => void) {
    this.onUnauthorized = callback;
  }

  /**
   * Добавить перехватчик запросов
   */
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) this.requestInterceptors.splice(index, 1);
    };
  }

  /**
   * Добавить перехватчик ответов
   */
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index > -1) this.responseInterceptors.splice(index, 1);
    };
  }

  /**
   * Добавить перехватчик ошибок
   */
  addErrorInterceptor(interceptor: ErrorInterceptor) {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index > -1) this.errorInterceptors.splice(index, 1);
    };
  }

  private normalizeHeaders(headers?: HeadersInit) {
    if (!headers) return {} as Record<string, string>;
    if (headers instanceof Headers) {
      const acc: Record<string, string> = {};
      headers.forEach((value, key) => {
        acc[key] = value;
      });
      return acc;
    }
    if (Array.isArray(headers)) {
      return headers.reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);
    }
    return { ...headers } as Record<string, string>;
  }

  private async request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = this.normalizeHeaders(options.headers);
    
    // Устанавливаем Content-Type только если не FormData
    if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    let config: RequestInit = {
      ...options,
      headers,
      credentials: "include",
    };

    // Применяем перехватчики запросов
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    const target = buildUrl(path);
    let res = await fetch(target, config);

    // Применяем перехватчики ответов
    for (const interceptor of this.responseInterceptors) {
      res = await interceptor(res);
    }

    const data = await res.json().catch(() => null);
    
    if (!res.ok) {
      let error = ApiRequestError.fromResponse(res, data);
      
      // Применяем перехватчики ошибок
      for (const interceptor of this.errorInterceptors) {
        error = await interceptor(error);
      }
      
      // Обрабатываем 401 ошибки
      if (error.isUnauthorized() && this.onUnauthorized) {
        this.onUnauthorized();
      }
      
      throw error;
    }
    
    // Поддерживаем как новый формат (success/data), так и старый
    if (data && typeof data === 'object' && 'success' in data && data.success && 'data' in data) {
      return data.data;
    }
    
    return data;
  }

  /**
   * GET запрос
   */
  get<T = any>(path: string, params?: Record<string, any>): Promise<T> {
    let url = path;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (path.includes('?') ? '&' : '?') + queryString;
      }
    }
    return this.request<T>(url);
  }

  /**
   * POST запрос
   */
  post<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { 
      method: "POST", 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    });
  }

  /**
   * PUT запрос
   */
  put<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { 
      method: "PUT", 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    });
  }

  /**
   * PATCH запрос
   */
  patch<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { 
      method: "PATCH", 
      body: body instanceof FormData ? body : JSON.stringify(body) 
    });
  }

  /**
   * DELETE запрос
   */
  delete<T = any>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  /**
   * Скачивание файла
   */
  async download(path: string, options: RequestInit = {}): Promise<Blob> {
    const headers = this.normalizeHeaders(options.headers);
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const target = buildUrl(path);
    const res = await fetch(target, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new ApiRequestError(text || `Request failed with status ${res.status}`, res.status);
    }

    return res.blob();
  }

  /**
   * Загрузка файла
   */
  async upload<T = any>(path: string, file: File, fieldName: string = 'file'): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    return this.post<T>(path, formData);
  }
}

export const api = new API();

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Безопасное извлечение сообщения об ошибке
 */
export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Произошла неизвестная ошибка';
};

/**
 * Проверка, является ли ошибка API ошибкой
 */
export const isApiError = (error: unknown): error is ApiRequestError => {
  return error instanceof ApiRequestError;
};

/**
 * Построение query string из объекта
 */
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  return searchParams.toString();
};

// ============================================================================
// KNOWLEDGE BASE (БАЗА ЗНАНИЙ)
// ============================================================================

import type {
  KnowledgeBaseArticle,
  ArticleListResponse,
  ArticleSearchParams,
  CreateArticleInput,
  UpdateArticleInput,
} from "../types/knowledge-base";

export const knowledgeBaseApi = {
  /** Поиск / листинг статей */
  search(params?: ArticleSearchParams): Promise<ArticleListResponse> {
    return api.get<ArticleListResponse>("knowledge-base", params);
  },

  /** Получение статьи по slug */
  getBySlug(slug: string): Promise<KnowledgeBaseArticle> {
    return api.get<KnowledgeBaseArticle>(`knowledge-base/${slug}`);
  },

  /** Похожие статьи */
  getRelated(id: number, limit?: number): Promise<KnowledgeBaseArticle[]> {
    return api.get<KnowledgeBaseArticle[]>(`knowledge-base/${id}/related`, { limit });
  },

  /** Создать статью */
  create(data: CreateArticleInput): Promise<KnowledgeBaseArticle> {
    return api.post<KnowledgeBaseArticle>("knowledge-base", data);
  },

  /** Обновить статью */
  update(id: number, data: UpdateArticleInput): Promise<KnowledgeBaseArticle> {
    return api.put<KnowledgeBaseArticle>(`knowledge-base/${id}`, data);
  },

  /** Удалить статью */
  delete(id: number): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`knowledge-base/${id}`);
  },
};
