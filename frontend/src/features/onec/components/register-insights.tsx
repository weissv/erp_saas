import { useMemo, useState } from "react";
import { Database, Eye, Layers3, Loader2 } from "lucide-react";
import { Modal, ModalActions, ModalGrid, ModalSection, ModalStat } from "../../../components/Modal";
import type { OneCRegisterItem } from "../types";
import { Pagination, formatDate } from "./shared";

type DisplayField = {
  key: string;
  label: string;
  value: string;
};

type NormalizedRegisterData = {
  preview: DisplayField[];
  details: DisplayField[];
  rows: DisplayField[][];
};

const MAX_VISIBLE_ROWS = 20;
const ISO_8601_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/u;

const FIELD_LABELS: Record<string, string> = {
  active: "Активно",
  lineNumber: "Строка",
  period: "Период",
  recorder: "Регистратор",
  recordSet: "Набор строк",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toWords(value: string) {
  const normalized = value
    .replace(/[_-]+/g, " ")
    .replace(/([A-ZА-ЯЁ]{2,})([A-ZА-ЯЁ][a-zа-яё])/gu, "$1 $2")
    .replace(/([a-zа-яё0-9])([A-ZА-ЯЁ])/gu, "$1 $2")
    .trim();

  if (!normalized) return "Поле";

  const compactKey = normalized.replace(/\s+/g, "");
  const mapped = FIELD_LABELS[compactKey.charAt(0).toLowerCase() + compactKey.slice(1)];
  if (mapped) return mapped;

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatPrimitive(value: unknown): string {
  if (value == null || value === "") return "—";

  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }

  if (typeof value === "number") {
    return value.toLocaleString("ru-RU");
  }

  if (typeof value === "string") {
    const parsedDate = new Date(value);
    if (
      !Number.isNaN(parsedDate.getTime()) &&
      ISO_8601_PATTERN.test(value)
    ) {
      return parsedDate.toLocaleString("ru-RU");
    }

    return value.trim() || "—";
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : `${value.length} знач.`;
  }

  if (isPlainObject(value)) {
    return `${Object.keys(value).length} полей`;
  }

  return String(value);
}

function toDisplayFields(source: Record<string, unknown>, limit?: number): DisplayField[] {
  const entries = Object.entries(source)
    .filter(([key, value]) => key !== "RecordSet" && value !== null && value !== undefined && value !== "")
    .map(([key, value]) => ({
      key,
      label: toWords(key),
      value: formatPrimitive(value),
    }));

  return typeof limit === "number" ? entries.slice(0, limit) : entries;
}

function normalizeRegisterData(data: unknown): NormalizedRegisterData {
  if (!isPlainObject(data)) {
    return { preview: [], details: [], rows: [] };
  }

  const recordSet = Array.isArray(data.RecordSet)
    ? data.RecordSet.filter(isPlainObject)
    : [];

  const details = toDisplayFields(data);

  if (recordSet.length === 0) {
    return {
      preview: details.slice(0, 6),
      details,
      rows: [],
    };
  }

  const firstRow = recordSet[0];

  return {
    preview: toDisplayFields(firstRow, 6),
    details,
    rows: recordSet.map((row) => toDisplayFields(row, 10)),
  };
}

function summaryLabel(normalized: NormalizedRegisterData) {
  if (normalized.rows.length > 0) {
    return normalized.rows.length === 1
      ? "1 строка данных"
      : `${normalized.rows.length.toLocaleString("ru-RU")} строк данных`;
  }

  if (normalized.details.length > 0) {
    return `${normalized.details.length} полей`;
  }

  return "Без дополнительных данных";
}

function kindLabel(kind: string) {
  return kind === "Accumulation" ? "Накопления" : "Сведения";
}

export function RegisterInsights({
  items,
  loading,
  error,
  total,
  page,
  totalPages,
  emptyMessage,
  onPageChange,
}: {
  items: OneCRegisterItem[];
  loading: boolean;
  error: Error | null;
  total: number;
  page: number;
  totalPages: number;
  emptyMessage: string;
  onPageChange: (page: number) => void;
}) {
  const [selected, setSelected] = useState<OneCRegisterItem | null>(null);

  const selectedData = useMemo(
    () => (selected ? normalizeRegisterData(selected.data) : null),
    [selected],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Всего записей</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{total.toLocaleString("ru-RU")}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">На странице</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{items.length.toLocaleString("ru-RU")}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Формат</p>
          <p className="mt-2 text-sm font-medium text-gray-700">Карточки с ключевыми полями и подробностями</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-500">{error.message}</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">{emptyMessage}</div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => {
              const normalized = normalizeRegisterData(item.data);

              return (
                <article key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs ${
                            item.registerKind === "Accumulation"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-sky-100 text-sky-700"
                          }`}
                        >
                          {kindLabel(item.registerKind)}
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-500">
                          {summaryLabel(normalized)}
                        </span>
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">{toWords(item.registerType)}</p>
                        <p className="text-xs text-gray-500">{item.registerType}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-blue-300 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                      Подробнее
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400">Период</p>
                      <p className="mt-1 text-sm font-medium text-gray-800">{formatDate(item.period)}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400">Регистратор</p>
                      <p className="mt-1 break-words text-sm font-medium text-gray-800">{item.recorder || "—"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-white p-3">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                      <Database className="h-4 w-4" />
                      Ключевые данные
                    </div>

                    {normalized.preview.length > 0 ? (
                      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                        {normalized.preview.map((field) => (
                          <div key={`${item.id}-${field.key}`} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                            <dt className="text-xs text-gray-500">{field.label}</dt>
                            <dd className="mt-1 break-words text-sm font-medium text-gray-800">{field.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">
                        Для этой записи пока нет структурированных полей для предварительного просмотра.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
        <span>Всего: {total}</span>
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? toWords(selected.registerType) : "Детали"}
        eyebrow="Данные 1С"
        description={selected ? "Читаемое представление полей и строк набора данных." : undefined}
        size="xl"
        icon={<Layers3 className="h-5 w-5" />}
      >
        {selected && selectedData ? (
          <div className="space-y-6">
            <ModalGrid>
              <ModalStat label="Вид" value={kindLabel(selected.registerKind)} />
              <ModalStat label="Период" value={formatDate(selected.period)} />
              <ModalStat
                label="Строк набора"
                value={selectedData.rows.length.toLocaleString("ru-RU")}
                meta={selectedData.rows.length > 0 ? "Показаны в карточках ниже" : "Набор строк не найден"}
              />
            </ModalGrid>

            <ModalSection title="Основные реквизиты" description="Поля, которые чаще всего нужны пользователю сразу.">
              {selectedData.preview.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedData.preview.map((field) => (
                    <div key={`modal-preview-${field.key}`} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs text-gray-500">{field.label}</div>
                      <div className="mt-1 break-words text-sm font-medium text-gray-900">{field.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Основные реквизиты не найдены.</p>
              )}
            </ModalSection>

            {selectedData.details.length > 0 ? (
              <ModalSection title="Дополнительные поля" description="Служебные и дополнительные атрибуты записи.">
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedData.details.map((field) => (
                    <div key={`modal-detail-${field.key}`} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="text-xs text-gray-500">{field.label}</div>
                      <div className="mt-1 break-words text-sm font-medium text-gray-900">{field.value}</div>
                    </div>
                  ))}
                </div>
              </ModalSection>
            ) : null}

            {selected.recorder ? (
              <ModalSection title="Регистратор">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-800">
                  {selected.recorder}
                </div>
              </ModalSection>
            ) : null}

            {selectedData.rows.length > 0 ? (
              <ModalSection
                title="Строки набора"
                description="Каждая строка представлена отдельной карточкой вместо сырого JSON."
              >
                <div className="space-y-3">
                  {selectedData.rows.slice(0, MAX_VISIBLE_ROWS).map((row, index) => {
                    const rowSignature = row.map((field) => `${field.key}:${field.value}`).join("|");

                    return (
                    <div key={`${selected.id}-${rowSignature}`} className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                        Строка {index + 1}
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {row.map((field) => (
                          <div key={`${selected.id}-${rowSignature}-${field.key}`} className="rounded-xl bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">{field.label}</div>
                            <div className="mt-1 break-words text-sm font-medium text-gray-900">{field.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    );
                  })}
                  {selectedData.rows.length > MAX_VISIBLE_ROWS ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                      Ещё {selectedData.rows.length - MAX_VISIBLE_ROWS} строк скрыто, чтобы не перегружать интерфейс.
                    </div>
                  ) : null}
                </div>
              </ModalSection>
            ) : null}

            <ModalActions>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Закрыть
              </button>
            </ModalActions>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
