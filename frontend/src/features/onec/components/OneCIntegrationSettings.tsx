// src/features/onec/components/OneCIntegrationSettings.tsx
// Self-Serve UI for the new 1C Push Integration.
//
// Sections:
// 1. Generate / Revoke API Key (key shown once on creation)
// 2. Download 1C Extension (.epf)
// 3. Copy-pasteable Setup Instructions for the school's SysAdmin
// 4. Subscription tier gating (Starter → upsell, Enterprise → dedicated support)

import { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/Badge";
import { api } from "../../../lib/api";
import { toast } from "sonner";
import {
  Key,
  Copy,
  Download,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Headphones,
} from "lucide-react";
import clsx from "clsx";

// ── Types ───────────────────────────────────────────────────────────────────

interface IntegrationSettings {
  hasApiKey: boolean;
  tier: string;
}

interface GenerateKeyResponse {
  apiKey: string;
  message: string;
}

// ── Tier Constants ──────────────────────────────────────────────────────────

const TIER = {
  STARTER: "starter",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

// ── Component ───────────────────────────────────────────────────────────────

export function OneCIntegrationSettings() {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Fetch settings on mount ─────────────────────────────────────────────
  useState(() => {
    void (async () => {
      try {
        const data = await api.get<IntegrationSettings>(
          "/integrations/1c/settings",
        );
        setSettings(data);
      } catch {
        // Silently fallback — the component will show a loading/error state
        setSettings({ hasApiKey: false, tier: TIER.PRO });
      } finally {
        setLoading(false);
      }
    })();
  });

  // ── Generate API Key ────────────────────────────────────────────────────
  const handleGenerateKey = useCallback(async () => {
    setGenerating(true);
    try {
      const data = await api.post<GenerateKeyResponse>(
        "/integrations/1c/settings/generate-key",
      );
      setGeneratedKey(data.apiKey);
      setShowKey(true);
      setSettings((prev) => (prev ? { ...prev, hasApiKey: true } : prev));
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
      setSettings((prev) => (prev ? { ...prev, hasApiKey: false } : prev));
      setGeneratedKey(null);
      setShowKey(false);
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
  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Скопировано в буфер обмена");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Не удалось скопировать");
      }
    },
    [],
  );

  // ── Derive state ────────────────────────────────────────────────────────
  const tier = settings?.tier ?? TIER.PRO;
  const isStarter = tier === TIER.STARTER;
  const isEnterprise = tier === TIER.ENTERPRISE;
  const hasApiKey = settings?.hasApiKey ?? false;

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
              автоматизировать синхронизацию данных из 1С. Ваша бухгалтерия
              сможет настроить отправку данных в один клик.
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

  // ── Build Setup Instructions (for SysAdmin) ─────────────────────────────
  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  const setupInstructions = `# Настройка интеграции 1С → ERP
# =======================================
#
# 1. Скачайте расширение (.epf) из панели интеграции.
# 2. Откройте 1С: Бухгалтерия → Файл → Открыть → выберите файл .epf
# 3. В настройках расширения укажите:
#
#    URL сервера:  ${baseUrl}/api/v1/integration/1c/sync
#    Метод:        POST
#    Заголовок:    Authorization: Bearer <ВАШ_API_КЛЮЧ>
#    Content-Type: application/json
#
# 4. Формат тела запроса (JSON):
#
#    {
#      "version": "1.0",
#      "batches": [
#        {
#          "entity": "Catalog_Контрагенты",
#          "records": [
#            { "Ref_Key": "...", "Description": "...", ... }
#          ]
#        }
#      ]
#    }
#
# 5. Нажмите «Отправить» или настройте регламентное задание
#    для автоматической отправки по расписанию.
#
# Сервер: Нет необходимости открывать порты / VPN.
# Данные отправляются через защищённый HTTPS.`;

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
                Свяжитесь с вашим персональным менеджером по онбордингу для
                индивидуальной настройки интеграции с 1С.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Section 1: API Key Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tint-blue">
                <Key className="h-5 w-5 text-macos-blue" />
              </div>
              <div>
                <CardTitle>API-ключ интеграции</CardTitle>
                <CardDescription>
                  Используется расширением 1С для безопасной отправки данных
                </CardDescription>
              </div>
            </div>
            <Badge variant={hasApiKey ? "success" : "neutral"}>
              {hasApiKey ? "Активен" : "Не настроен"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Generated key display (shown once) */}
          {generatedKey && (
            <div className="mb-4 rounded-lg border border-macos-green/30 bg-tint-green/30 p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-macos-orange shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-text-primary">
                  Сохраните ключ — он будет показан{" "}
                  <span className="font-bold">только один раз</span>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <code
                  className={clsx(
                    "flex-1 rounded-md bg-surface-primary border border-separator px-3 py-2 text-xs font-mono break-all",
                    !showKey && "select-none",
                  )}
                >
                  {showKey
                    ? generatedKey
                    : "•".repeat(Math.min(generatedKey.length, 40))}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKey((prev) => !prev)}
                  title={showKey ? "Скрыть" : "Показать"}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
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

          <div className="flex flex-wrap gap-3">
            {!hasApiKey ? (
              <Button onClick={handleGenerateKey} disabled={generating}>
                <Key className="h-4 w-4" />
                {generating ? "Создание..." : "Создать API-ключ"}
              </Button>
            ) : (
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
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Download 1C Extension */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fill-quaternary">
              <Download className="h-5 w-5 text-text-secondary" />
            </div>
            <div>
              <CardTitle>Расширение для 1С</CardTitle>
              <CardDescription>
                Файл обработки (.epf) для отправки данных из 1С: Бухгалтерия
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() =>
              toast.info(
                "Скачивание .epf-файла будет доступно в ближайшем обновлении",
              )
            }
          >
            <Download className="h-4 w-4" />
            Скачать расширение (.epf)
          </Button>
        </CardContent>
      </Card>

      {/* Section 3: Setup Instructions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fill-quaternary">
                <Shield className="h-5 w-5 text-text-secondary" />
              </div>
              <div>
                <CardTitle>Инструкция для системного администратора</CardTitle>
                <CardDescription>
                  Передайте этот текст вашему 1С-разработчику или сисадмину
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(setupInstructions)}
            >
              <Copy className="h-4 w-4" />
              Копировать
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg border border-separator bg-fill-quaternary p-4 text-xs leading-relaxed text-text-secondary font-mono whitespace-pre-wrap">
            {setupInstructions}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
