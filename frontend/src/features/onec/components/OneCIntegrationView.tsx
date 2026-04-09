// src/features/onec/components/OneCIntegrationView.tsx
// Self-contained "Cockpit" view for the 1C Push Integration.
//
// Three states:
// 1. "No Key Generated" — empty state with a "Generate API Key" button.
// 2. "Key Generated (Show Once)" — displays the plain-text key once.
// 3. "Active" — masked key, Revoke button, Download Extension button.
//
// Below the key management section: a compact data table showing
// recent sync logs, updated in real-time via WebSocket events.

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/Badge";
import { EmptyState } from "../../../components/ui/EmptyState";
import { api } from "../../../lib/api";
import { cn } from "../../../lib/utils";
import { toast } from "sonner";
import {
  Key,
  Copy,
  Download,
  Trash2,
  Shield,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Headphones,
  RefreshCw,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import { io as socketIoClient, Socket } from "socket.io-client";

// ── Types ───────────────────────────────────────────────────────────────────

interface SyncLogEntry {
  id: number;
  jobId: string;
  status: string;
  totalRecords: number;
  errors: number;
  receivedAt: string;
  processedAt: string | null;
}

interface IntegrationSettings {
  hasApiKey: boolean;
  apiKeyHint: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  tier: string;
  recentSyncs: SyncLogEntry[];
}

interface GenerateKeyResponse {
  apiKey: string;
  apiKeyHint: string;
  message: string;
}

// ── Tier Constants ──────────────────────────────────────────────────────────

const TIER = {
  STARTER: "starter",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

// ── Component ───────────────────────────────────────────────────────────────

export function OneCIntegrationView() {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // ── Fetch settings on mount ─────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.get<IntegrationSettings>(
        "/integrations/1c/settings",
      );
      setSettings(data);
      setSyncLogs(data.recentSyncs ?? []);
    } catch {
      setSettings({ hasApiKey: false, apiKeyHint: null, isActive: false, lastSyncAt: null, tier: TIER.PRO, recentSyncs: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  // ── WebSocket: real-time sync updates ───────────────────────────────────
  useEffect(() => {
    const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const wsUrl = rawBaseUrl.replace(/\/+$/, "");

    const socket = socketIoClient(wsUrl, {
      path: "/ws",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socketRef.current = socket;

    // The sync_complete event carries the full job result
    socket.on("sync_complete", (data: {
      jobId: string;
      tenantId: string;
      processedAt: string;
      totalBatches: number;
      totalRecords: number;
      errors: number;
    }) => {
      setSyncLogs((prev) => {
        const exists = prev.find((l) => l.jobId === data.jobId);
        if (exists) {
          return prev.map((l) =>
            l.jobId === data.jobId
              ? { ...l, status: data.errors > 0 ? "failed" : "success", totalRecords: data.totalRecords, errors: data.errors, processedAt: data.processedAt }
              : l,
          );
        }
        return [
          {
            id: Date.now(),
            jobId: data.jobId,
            status: data.errors > 0 ? "failed" : "success",
            totalRecords: data.totalRecords,
            errors: data.errors,
            receivedAt: data.processedAt,
            processedAt: data.processedAt,
          },
          ...prev,
        ].slice(0, 50);
      });
    });

    socket.on("onec:push:complete", (data: {
      jobId: string;
      tenantId: string;
      processedAt: string;
      totalRecords: number;
      errors: number;
    }) => {
      setSyncLogs((prev) => {
        const updated = prev.map((l) =>
          l.jobId === data.jobId
            ? { ...l, status: data.errors > 0 ? "failed" : "success", totalRecords: data.totalRecords, errors: data.errors, processedAt: data.processedAt }
            : l,
        );
        const changed = updated.some((l, i) => l !== prev[i]);
        return changed ? updated : prev;
      });
    });

    socket.on("onec:push:error", (data: { jobId: string; error: string }) => {
      setSyncLogs((prev) =>
        prev.map((l) =>
          l.jobId === data.jobId
            ? { ...l, status: "failed" }
            : l,
        ),
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Generate API Key ────────────────────────────────────────────────────
  const handleGenerateKey = useCallback(async () => {
    setGenerating(true);
    try {
      const data = await api.post<GenerateKeyResponse>(
        "/integrations/1c/settings/generate-key",
      );
      setGeneratedKey(data.apiKey);
      setSettings((prev) =>
        prev
          ? { ...prev, hasApiKey: true, apiKeyHint: data.apiKeyHint, isActive: true }
          : prev,
      );
      toast.success("API-ключ создан", {
        description: "Скопируйте ключ — он больше не будет показан.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Не удалось создать ключ";
      toast.error("Ошибка", { description: message });
    } finally {
      setGenerating(false);
    }
  }, []);

  // ── Revoke API Key ──────────────────────────────────────────────────────
  const handleRevokeKey = useCallback(async () => {
    setRevoking(true);
    try {
      await api.delete("/integrations/1c/settings/revoke-key");
      setSettings((prev) =>
        prev
          ? { ...prev, hasApiKey: false, apiKeyHint: null, isActive: false }
          : prev,
      );
      setGeneratedKey(null);
      toast.success("API-ключ отозван");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Не удалось отозвать ключ";
      toast.error("Ошибка", { description: message });
    } finally {
      setRevoking(false);
    }
  }, []);

  // ── Copy to clipboard ───────────────────────────────────────────────────
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Скопировано в буфер обмена");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  }, []);

  // ── Derive state ────────────────────────────────────────────────────────
  const tier = settings?.tier ?? TIER.PRO;
  const isStarter = tier === TIER.STARTER;
  const isEnterprise = tier === TIER.ENTERPRISE;
  const hasApiKey = settings?.hasApiKey ?? false;
  const isActive = settings?.isActive ?? false;

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-fill-quaternary" />
          <div className="h-4 w-72 rounded bg-fill-quaternary" />
          <div className="h-32 rounded bg-fill-quaternary" />
        </div>
      </Card>
    );
  }

  // ── Starter Tier: Upsell Banner ─────────────────────────────────────────
  if (isStarter) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint-orange">
            <Sparkles className="h-6 w-6 text-macos-orange" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-text-primary">
              Автоматизация 1С: Бухгалтерия
            </h2>
            <p className="text-sm text-text-secondary">
              Обновитесь до тарифа{" "}
              <span className="font-semibold text-macos-blue">Pro</span>, чтобы
              автоматизировать синхронизацию данных из 1С.
            </p>
            <Button
              variant="default"
              size="md"
              className="mt-2"
              onClick={() =>
                toast.info("Свяжитесь с менеджером для обновления тарифа")
              }
            >
              <Sparkles className="h-4 w-4" />
              Обновить до Pro
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Enterprise Banner */}
      {isEnterprise && (
        <Card className="border-macos-blue/20 bg-tint-blue/50 p-5">
          <div className="flex items-start gap-3">
            <Headphones className="h-5 w-5 shrink-0 text-macos-blue mt-0.5" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                Нужна помощь с настройкой 1С?
              </p>
              <p className="text-sm text-text-secondary mt-0.5">
                Свяжитесь с вашим персональным менеджером по онбордингу.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Section 1: API Key Management ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint-blue">
                <Key className="h-5 w-5 text-macos-blue" />
              </div>
              <div>
                <CardTitle>API-ключ интеграции 1С</CardTitle>
                <CardDescription>
                  Используется расширением 1С для безопасной отправки данных
                </CardDescription>
              </div>
            </div>
            <Badge variant={hasApiKey && isActive ? "success" : "neutral"}>
              {hasApiKey && isActive ? "Активен" : "Не настроен"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* ── State 2: Key just generated (show once) ─────────────── */}
          {generatedKey && (
            <div className="mb-4 rounded-lg border border-macos-orange/30 bg-tint-orange/20 p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-macos-orange shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-text-primary">
                  Скопируйте ключ сейчас — он будет показан{" "}
                  <span className="font-bold">только один раз</span>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedKey}
                  className="flex-1 rounded-md bg-surface-primary border border-separator px-3 py-2 text-xs font-mono break-all select-all"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(generatedKey)}
                  title="Скопировать"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-macos-green" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ── State 3: Active — masked key ────────────────────────── */}
          {hasApiKey && !generatedKey && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-separator bg-fill-quaternary px-4 py-3">
              <Shield className="h-4 w-4 text-text-secondary shrink-0" />
              <code className="text-sm font-mono text-text-secondary tracking-wide">
                {settings?.apiKeyHint ?? "sk_live_...****"}
              </code>
              {settings?.lastSyncAt && (
                <span className="ml-auto text-xs text-text-secondary">
                  Последняя синхронизация:{" "}
                  {new Date(settings.lastSyncAt).toLocaleString("ru-RU")}
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {/* ── State 1: No key generated ─────────────────────────── */}
            {!hasApiKey && (
              <Button onClick={handleGenerateKey} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Key className="h-4 w-4" />
                )}
                {generating ? "Создание..." : "Создать API-ключ"}
              </Button>
            )}

            {/* ── State 3: Active — regenerate + revoke ─────────────── */}
            {hasApiKey && (
              <>
                <Button
                  variant="outline"
                  onClick={handleGenerateKey}
                  disabled={generating}
                >
                  <Key className="h-4 w-4" />
                  {generating ? "Создание..." : "Пересоздать ключ"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRevokeKey}
                  disabled={revoking}
                >
                  <Trash2 className="h-4 w-4" />
                  {revoking ? "Отзыв..." : "Отозвать ключ"}
                </Button>
              </>
            )}

            {/* Download Extension */}
            {hasApiKey && (
              <Button
                variant="secondary"
                onClick={() =>
                  toast.info(
                    "Скачивание .epf-файла будет доступно в ближайшем обновлении",
                  )
                }
              >
                <Download className="h-4 w-4" />
                Скачать расширение 1С (.epf)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Sync History ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fill-quaternary">
                <RefreshCw className="h-5 w-5 text-text-secondary" />
              </div>
              <div>
                <CardTitle>История синхронизации</CardTitle>
                <CardDescription>
                  Последние запросы от расширения 1С (обновляется в реальном времени)
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchSettings}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {syncLogs.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="Нет данных синхронизации"
              description="После первой отправки данных из 1С здесь появится история"
              size="sm"
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-separator">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-separator bg-fill-quaternary">
                    <th className="text-left p-2.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Дата
                    </th>
                    <th className="text-left p-2.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Статус
                    </th>
                    <th className="text-right p-2.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Записей
                    </th>
                    <th className="text-right p-2.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                      Ошибок
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((log) => (
                    <tr
                      key={log.jobId}
                      className="border-b border-separator last:border-0 hover:bg-fill-quaternary transition-colors"
                    >
                      <td className="p-2.5 text-[13px] text-text-primary tabular-nums whitespace-nowrap">
                        {new Date(log.receivedAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-2.5">
                        <SyncStatusBadge status={log.status} />
                      </td>
                      <td className="p-2.5 text-right text-[13px] text-text-primary tabular-nums font-medium">
                        {log.totalRecords.toLocaleString("ru-RU")}
                      </td>
                      <td className="p-2.5 text-right text-[13px] tabular-nums">
                        <span
                          className={cn(
                            "font-medium",
                            log.errors > 0
                              ? "text-macos-red"
                              : "text-text-secondary",
                          )}
                        >
                          {log.errors}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sub-component: Status Badge ───────────────────────────────────────────

function SyncStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "success":
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3" />
          Успешно
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="danger">
          <XCircle className="h-3 w-3" />
          Ошибка
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="default">
          <Loader2 className="h-3 w-3 animate-spin" />
          Обработка
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="neutral">
          <Clock className="h-3 w-3" />
          В очереди
        </Badge>
      );
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
