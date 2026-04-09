import { useCallback, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  Loader2,
  PiggyBank,
  WalletCards,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/Card";
import { Badge } from "../../../components/ui/Badge";
import {
  FINANCE_REGISTER_TYPES,
  FIXED_ASSETS_REGISTER_TYPES,
} from "../../../features/onec/register-groups";
import { listOneCRegisters, useOneCSummary, usePaginatedOneCResource } from "../../../features/onec";
import type { OneCRegisterFilters, OneCRegisterItem } from "../../../features/onec/types";
import { cn, formatCurrency } from "../../../lib/utils";
import {
  buildFixedAssetsDashboard,
  buildVatDashboard,
  BUSINESS_PAGE_SIZE,
  type FixedAssetRow,
  type VatEntry,
} from "./finance-registers-dashboard";

type FinanceRegSubTab = "vat-summary" | "fixed-assets";

type KpiCardProps = {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "positive" | "negative";
  icon: ComponentType<{ className?: string }>;
};

function formatMoney(value: number, currency = "UZS") {
  const normalized = /^[A-Z]{3}$/u.test(currency) ? currency : "UZS";
  return formatCurrency(value, normalized);
}

function KpiCard({ label, value, hint, tone = "default", icon: Icon }: KpiCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-start justify-between p-5">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-2xl font-semibold tracking-tight text-foreground",
              tone === "positive" && "text-macos-green",
              tone === "negative" && "text-destructive",
            )}
          >
            {formatMoney(value)}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="rounded-xl bg-muted p-3 text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceState({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: Error | null;
  empty: boolean;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-sm text-destructive">{error.message}</CardContent>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Нет данных для бизнес-представления.
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

function DirectionBadge({ entry }: { entry: VatEntry }) {
  return <Badge variant={entry.directionVariant}>{entry.directionLabel}</Badge>;
}

function VatSummaryPanel({
  data,
  loadedCount,
  totalCount,
  loading,
  error,
}: {
  data: ReturnType<typeof buildVatDashboard>;
  loadedCount: number;
  totalCount: number;
  loading: boolean;
  error: Error | null;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="НДС к уплате"
          value={data.vatToPay}
          hint="Выходной НДС минус входной"
          tone={data.vatToPay >= 0 ? "negative" : "positive"}
          icon={WalletCards}
        />
        <KpiCard
          label="Входной НДС"
          value={data.inputVat}
          hint="Заявлено к вычету"
          tone="positive"
          icon={ArrowDownRight}
        />
        <KpiCard
          label="Выходной НДС"
          value={data.outputVat}
          hint="Начислено по продажам"
          tone="negative"
          icon={ArrowUpRight}
        />
        <KpiCard
          label="Документы"
          value={data.documents}
          hint="Бизнес-события на текущей странице"
          icon={Landmark}
        />
      </div>

      <ResourceState loading={loading} error={error} empty={data.entries.length === 0}>
        <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Сводка по НДС</CardTitle>
              <CardDescription>
                Без технических регистров и GUID — только входной/выходной НДС, документы и контрагенты.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Баланс</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {data.vatToPay >= 0 ? "К оплате" : "К возмещению"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatMoney(Math.abs(data.vatToPay))}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Загружено</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{loadedCount}</p>
                  <p className="mt-1 text-sm text-muted-foreground">записей на странице</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Доступно</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{totalCount}</p>
                  <p className="mt-1 text-sm text-muted-foreground">записей в контуре НДС</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Документ</th>
                      <th className="px-4 py-3 text-left font-medium">Контрагент</th>
                      <th className="px-4 py-3 text-left font-medium">Период</th>
                      <th className="px-4 py-3 text-left font-medium">НДС</th>
                      <th className="px-4 py-3 text-left font-medium">База</th>
                      <th className="px-4 py-3 text-left font-medium">Движение</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.entries.slice(0, 12).map((entry) => (
                      <tr key={`${entry.id}-${entry.documentLabel}`} className="bg-card">
                        <td className="px-4 py-3 font-medium text-foreground">{entry.documentLabel}</td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.counterpartyLabel}</td>
                        <td className="px-4 py-3 text-muted-foreground">{entry.periodLabel}</td>
                        <td className="px-4 py-3 text-foreground">
                          {formatMoney(entry.vatAmount, entry.currencyLabel)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {entry.baseAmount > 0 ? formatMoney(entry.baseAmount, entry.currencyLabel) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <DirectionBadge entry={entry} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Ключевые сигналы</CardTitle>
              <CardDescription>Быстрый обзор бизнес-событий без полей 1C вроде Сторно, Строка и Record Type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.entries.slice(0, 6).map((entry) => (
                <div key={`signal-${entry.id}-${entry.periodLabel}`} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{entry.documentLabel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.counterpartyLabel}</p>
                    </div>
                    <DirectionBadge entry={entry} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{entry.periodLabel}</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(entry.vatAmount, entry.currencyLabel)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </ResourceState>
    </div>
  );
}

function AssetDetails({ asset }: { asset: FixedAssetRow }) {
  return (
    <div className="flex flex-wrap gap-2">
      {asset.details.slice(0, 3).map((field) => (
        <div key={`${asset.key}-${field.key}`} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{field.label}:</span> {field.value}
        </div>
      ))}
    </div>
  );
}

function FixedAssetsPanel({
  data,
  loadedCount,
  totalCount,
  loading,
  error,
}: {
  data: ReturnType<typeof buildFixedAssetsDashboard>;
  loadedCount: number;
  totalCount: number;
  loading: boolean;
  error: Error | null;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Стоимость активов"
          value={data.totalInitialValue}
          hint="Первоначальная стоимость"
          icon={PiggyBank}
        />
        <KpiCard
          label="Амортизация"
          value={data.totalDepreciation}
          hint="Накопленный износ"
          tone="negative"
          icon={ArrowDownRight}
        />
        <KpiCard
          label="Остаточная стоимость"
          value={data.totalNetValue}
          hint="Чистая стоимость активов"
          tone="positive"
          icon={WalletCards}
        />
        <KpiCard
          label="Активы"
          value={data.assetsCount}
          hint="Уникальные карточки активов"
          icon={Landmark}
        />
      </div>

      <ResourceState loading={loading} error={error} empty={data.assets.length === 0}>
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>Основные средства</CardTitle>
            <CardDescription>
              Единый список активов с первоначальной стоимостью и амортизацией без показа названий регистров 1C.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Загружено</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{loadedCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">записей на странице</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Доступно</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{totalCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">записей в контуре активов</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Покрытие</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{data.assetsCount}</p>
                <p className="mt-1 text-sm text-muted-foreground">бизнес-карточек активов</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Актив</th>
                    <th className="px-4 py-3 text-left font-medium">Категория</th>
                    <th className="px-4 py-3 text-left font-medium">Первоначальная стоимость</th>
                    <th className="px-4 py-3 text-left font-medium">Амортизация</th>
                    <th className="px-4 py-3 text-left font-medium">Остаточная стоимость</th>
                    <th className="px-4 py-3 text-left font-medium">Статус</th>
                    <th className="px-4 py-3 text-left font-medium">Обновлено</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.assets.slice(0, 12).map((asset) => (
                    <tr key={asset.key} className="bg-card align-top">
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">{asset.assetName}</p>
                          <AssetDetails asset={asset} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{asset.category}</td>
                      <td className="px-4 py-3 text-foreground">{formatMoney(asset.initialValue)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatMoney(asset.depreciation)}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{formatMoney(asset.netValue)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{asset.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{asset.updatedAtLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </ResourceState>
    </div>
  );
}

export default function FinanceRegistersView() {
  const [subTab, setSubTab] = useState<FinanceRegSubTab>("vat-summary");
  const { data: summary } = useOneCSummary();
  const loadRegisterPage = useCallback(
    (params: OneCRegisterFilters & { page: number; pageSize: number }) =>
      listOneCRegisters(
        params as unknown as OneCRegisterFilters &
          Record<string, string | number | boolean | undefined>,
      ),
    [],
  );

  const vatResource = usePaginatedOneCResource<OneCRegisterItem, OneCRegisterFilters>({
    loader: loadRegisterPage,
    initialFilters: { registerTypes: FINANCE_REGISTER_TYPES.join(",") },
    initialPageSize: BUSINESS_PAGE_SIZE,
  });

  const fixedAssetsResource = usePaginatedOneCResource<OneCRegisterItem, OneCRegisterFilters>({
    loader: loadRegisterPage,
    initialFilters: { registerTypes: FIXED_ASSETS_REGISTER_TYPES.join(",") },
    initialPageSize: BUSINESS_PAGE_SIZE,
  });

  const vatDashboard = useMemo(() => buildVatDashboard(vatResource.items), [vatResource.items]);
  const fixedAssetsDashboard = useMemo(
    () => buildFixedAssetsDashboard(fixedAssetsResource.items),
    [fixedAssetsResource.items],
  );

  const vatRegisterCount = useMemo(
    () =>
      (summary?.registers.byType ?? [])
        .filter((item) => FINANCE_REGISTER_TYPES.includes(item.type))
        .reduce((sum, item) => sum + item.count, 0),
    [summary],
  );

  const fixedAssetsRegisterCount = useMemo(
    () =>
      (summary?.registers.byType ?? [])
        .filter((item) => FIXED_ASSETS_REGISTER_TYPES.includes(item.type))
        .reduce((sum, item) => sum + item.count, 0),
    [summary],
  );

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Business Dashboard</Badge>
              <Badge variant="neutral">1C abstractions enabled</Badge>
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">НДС и Активы</h2>
              <p className="text-sm text-muted-foreground">
                Управленческая панель по данным 1C: без UUID, без служебных полей и без названий внутренних регистров.
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit gap-1 rounded-xl border border-border bg-muted/60 p-1">
            {([
              { id: "vat-summary", label: "Сводка по НДС" },
              { id: "fixed-assets", label: "Основные средства" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-colors",
                  subTab === tab.id
                    ? "bg-card text-foreground shadow-subtle"
                    : "text-muted-foreground hover:bg-card/70 hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {subTab === "vat-summary" ? (
        <VatSummaryPanel
          data={vatDashboard}
          loadedCount={vatResource.items.length}
          totalCount={vatRegisterCount || vatResource.total}
          loading={vatResource.loading}
          error={vatResource.error}
        />
      ) : (
        <FixedAssetsPanel
          data={fixedAssetsDashboard}
          loadedCount={fixedAssetsResource.items.length}
          totalCount={fixedAssetsRegisterCount || fixedAssetsResource.total}
          loading={fixedAssetsResource.loading}
          error={fixedAssetsResource.error}
        />
      )}
    </div>
  );
}
