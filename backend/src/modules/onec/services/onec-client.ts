// src/services/onec/onec-client.ts
// Базовый HTTP-клиент для 1С OData с правильной кодировкой Basic Auth (UTF-8)

import axios, { AxiosInstance, AxiosError } from "axios";
import { config } from "../../../config";
import type { TenantCredentials } from "../../../services/TenantIntegrationsService";

/**
 * Собирает Basic Auth заголовок с поддержкой кириллицы.
 * Node.js Buffer.from(string) по умолчанию работает с UTF-8,
 * что корректно кодирует кириллический логин.
 */
function buildBasicAuth(user: string, password: string): string {
  const credentials = `${user}:${password}`;
  const encoded = Buffer.from(credentials, "utf-8").toString("base64");
  return `Basic ${encoded}`;
}

export function getOneCApplicationBaseUrl(): string {
  return config.oneCBaseUrl.replace(/\/odata\/[^/]+\/?$/, "");
}

/**
 * Creates a 1C OData client using .env / config values (legacy single-tenant).
 */
export function createOneCClient(): AxiosInstance {
  const client = axios.create({
    baseURL: config.oneCBaseUrl,
    timeout: config.oneCTimeoutMs,
    headers: {
      Authorization: buildBasicAuth(config.oneCUser, config.oneCPassword),
      Accept: "application/json",
    },
  });

  return client;
}

/**
 * Creates a 1C OData client using per-tenant credentials from the DB.
 */
export function createOneCClientForTenant(creds: TenantCredentials): AxiosInstance {
  return axios.create({
    baseURL: creds.oneCBaseUrl,
    timeout: creds.oneCTimeoutMs,
    headers: {
      Authorization: buildBasicAuth(creds.oneCUser, creds.oneCPassword),
      Accept: "application/json",
    },
  });
}

export function createOneCApplicationClient(): AxiosInstance {
  return axios.create({
    baseURL: getOneCApplicationBaseUrl(),
    timeout: config.oneCTimeoutMs,
    headers: {
      Authorization: buildBasicAuth(config.oneCUser, config.oneCPassword),
      Accept: "*/*",
    },
  });
}

/**
 * Проверяет, является ли ошибка сетевой (1С-сервер недоступен).
 * Используется для graceful handling без краша основного процесса.
 */
export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const axErr = error as AxiosError;
  const code = axErr.code;
  return (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ECONNABORTED" ||
    code === "ENOTFOUND" ||
    code === "ERR_NETWORK"
  );
}
