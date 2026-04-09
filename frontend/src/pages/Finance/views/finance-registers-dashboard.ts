import type { BadgeVariant } from "../../../components/ui/Badge";
import type { OneCRegisterItem } from "../../../features/onec/types";

export const BUSINESS_PAGE_SIZE = 200;

const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:[tT ][\d:.+-]+)?(?:Z|[+-]\d{2}:\d{2})?$/u;

const TECHNICAL_FIELD_NAMES = new Set([
  "Сторно",
  "Активно",
  "Строка",
  "Регистратор",
  "Record Type",
  "RecordType",
  "Recorder",
  "LineNumber",
  "Active",
  "RecordSet",
]);

const VAT_INPUT_REGISTER_HINTS = [
  "входящ",
  "предъявлен",
  "receipt",
  "покуп",
];

const VAT_OUTPUT_REGISTER_HINTS = [
  "исходящ",
  "продаж",
  "expense",
  "реализац",
];

const DIRECTION_HINTS = {
  incoming: ["receipt", "incoming", "вход", "приход", "поступ"],
  outgoing: ["expense", "outgoing", "исход", "расход", "реализац", "списан"],
};

const VAT_AMOUNT_HINTS = ["ндс", "vat", "налог"];
const DEPRECIATION_HINTS = ["амортиз", "depreciat"];
const INITIAL_VALUE_HINTS = ["первонач", "балансов", "стоим", "cost", "initial"];
const ASSET_NAME_HINTS = [
  "основноесредство",
  "ос",
  "asset",
  "нма",
  "наименование",
  "name",
];
const DOCUMENT_HINTS = ["документ", "invoice", "счет", "factur", "registr", "record"];
const COUNTERPARTY_HINTS = ["контрагент", "поставщик", "покупатель", "partner", "vendor", "customer"];
const STATUS_HINTS = ["состояни", "status"];
const CATEGORY_HINTS = ["группа", "категор", "вид"];

type BusinessDirection = "INCOMING" | "OUTGOING" | "UNKNOWN";

export type BusinessField = {
  key: string;
  label: string;
  value: string;
  numericValue?: number;
  direction?: BusinessDirection;
  badgeVariant?: BadgeVariant;
};

export type VatEntry = {
  id: number;
  documentLabel: string;
  counterpartyLabel: string;
  periodLabel: string;
  sortValue: number;
  direction: BusinessDirection;
  directionLabel: string;
  directionVariant: BadgeVariant;
  vatAmount: number;
  baseAmount: number;
  currencyLabel: string;
  details: BusinessField[];
};

export type VatDashboardData = {
  inputVat: number;
  outputVat: number;
  vatToPay: number;
  documents: number;
  entries: VatEntry[];
};

export type FixedAssetRow = {
  key: string;
  assetName: string;
  category: string;
  initialValue: number;
  depreciation: number;
  netValue: number;
  status: string;
  updatedAtLabel: string;
  details: BusinessField[];
};

export type FixedAssetsDashboardData = {
  totalInitialValue: number;
  totalDepreciation: number;
  totalNetValue: number;
  assetsCount: number;
  assets: FixedAssetRow[];
};

type RegisterRecord = {
  recordId: string;
  period: string | null;
  fields: BusinessField[];
  registerType: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[\s_.-]+/gu, "");
}

function humanizeKey(key: string) {
  const withoutSuffix = key.replace(/\s*(Key|Id)$/u, "").trim();
  const normalized = withoutSuffix
    .replace(/[_-]+/g, " ")
    .replace(/([A-ZА-ЯЁ])([A-ZА-ЯЁ][a-zа-яё])/gu, "$1 $2")
    .replace(/([a-zа-яё0-9])([A-ZА-ЯЁ])/gu, "$1 $2")
    .trim();

  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : "Поле";
}

function isTechnicalKey(key: string) {
  return TECHNICAL_FIELD_NAMES.has(key) || TECHNICAL_FIELD_NAMES.has(humanizeKey(key));
}

function matchesHints(key: string, hints: string[]) {
  const normalized = normalizeKey(key);
  return hints.some((hint) => normalized.includes(normalizeKey(hint)));
}

function isDateString(value: string) {
  return ISO_8601_PATTERN.test(value) && !Number.isNaN(new Date(value).getTime());
}

function formatScalarValue(value: unknown) {
  if (value == null || value === "") return "—";

  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }

  if (typeof value === "number") {
    return value.toLocaleString("ru-RU", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  }

  if (typeof value === "string") {
    if (isDateString(value)) {
      return new Date(value).toLocaleDateString("ru-RU");
    }

    return value.trim() || "—";
  }

  return String(value);
}

function parseNumberish(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.replace(/\s+/gu, "").replace(",", ".");
  if (!normalized || /[a-zа-яё]/iu.test(normalized)) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function shortReference(value: string | number) {
  const raw = String(value).trim();
  const tail = raw.slice(-6).toUpperCase();
  return tail ? `#${tail}` : "#—";
}

function resolveReferenceValue(key: string, value: string | number) {
  if (matchesHints(key, ["валют", "currency"])) {
    return "UZS";
  }

  if (matchesHints(key, DOCUMENT_HINTS)) {
    return `Документ ${shortReference(value)}`;
  }

  if (matchesHints(key, ASSET_NAME_HINTS)) {
    return `Актив ${shortReference(value)}`;
  }

  if (matchesHints(key, COUNTERPARTY_HINTS)) {
    return `Контрагент ${shortReference(value)}`;
  }

  return `Ссылка ${shortReference(value)}`;
}

function resolveDirection(
  key: string,
  value: unknown,
): Pick<BusinessField, "value" | "direction" | "badgeVariant"> | null {
  if (typeof value !== "string") return null;
  if (!matchesHints(key, ["record type", "recordtype", "direction", "движение", "type"])) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (DIRECTION_HINTS.incoming.some((hint) => normalized.includes(hint))) {
    return {
      value: "+ Incoming",
      direction: "INCOMING",
      badgeVariant: "success",
    };
  }

  if (DIRECTION_HINTS.outgoing.some((hint) => normalized.includes(hint))) {
    return {
      value: "- Outgoing",
      direction: "OUTGOING",
      badgeVariant: "danger",
    };
  }

  return null;
}

function createBusinessField(key: string, value: unknown): BusinessField | null {
  if (value == null || value === "") {
    return null;
  }

  const direction = resolveDirection(key, value);
  if (direction) {
    return {
      key,
      label: "Движение",
      value: direction.value,
      direction: direction.direction,
      badgeVariant: direction.badgeVariant,
    };
  }

  if (isTechnicalKey(key)) {
    return null;
  }

  const label = humanizeKey(key);
  const numericValue = parseNumberish(value);

  if (/(Key|Id)$/u.test(key) && (typeof value === "string" || typeof value === "number")) {
    return {
      key,
      label,
      value: resolveReferenceValue(key, value),
    };
  }

  if (Array.isArray(value)) {
    const preview = value
      .slice(0, 3)
      .map((entry) => formatScalarValue(entry))
      .join(", ");

    return {
      key,
      label,
      value: preview || `${value.length} значений`,
    };
  }

  if (isPlainObject(value)) {
    return null;
  }

  return {
    key,
    label,
    value: formatScalarValue(value),
    numericValue,
  };
}

function extractObjectFields(record: Record<string, unknown>) {
  return Object.entries(record)
    .map(([key, value]) => createBusinessField(key, value))
    .filter((field): field is BusinessField => Boolean(field));
}

function collectRegisterRecords(item: OneCRegisterItem): RegisterRecord[] {
  if (!isPlainObject(item.data)) {
    return [];
  }

  const topLevelFields = extractObjectFields(item.data);
  const recordSet = Array.isArray(item.data.RecordSet)
    ? item.data.RecordSet.filter(isPlainObject)
    : [];

  if (recordSet.length === 0) {
    return [
      {
        recordId: `${item.id}-0`,
        period: item.period ?? null,
        fields: topLevelFields,
        registerType: item.registerType,
      },
    ];
  }

  return recordSet.map((row, index) => ({
    recordId: `${item.id}-${index}`,
    period: item.period ?? null,
    fields: [...topLevelFields, ...extractObjectFields(row)],
    registerType: item.registerType,
  }));
}

function findField(fields: BusinessField[], hints: string[]) {
  return fields.find((field) => matchesHints(field.key, hints) || matchesHints(field.label, hints));
}

function findStringValue(fields: BusinessField[], hints: string[]) {
  return findField(fields, hints)?.value;
}

function sumNumericFields(fields: BusinessField[], hints: string[], exclude: string[] = []) {
  return fields.reduce((sum, field) => {
    if (typeof field.numericValue !== "number") {
      return sum;
    }

    const matches = matchesHints(field.key, hints) || matchesHints(field.label, hints);
    const excluded = exclude.some((hint) => matchesHints(field.key, [hint]) || matchesHints(field.label, [hint]));

    return matches && !excluded ? sum + field.numericValue : sum;
  }, 0);
}

function inferRegisterDirection(registerType: string) {
  const normalized = normalizeKey(registerType);

  if (VAT_INPUT_REGISTER_HINTS.some((hint) => normalized.includes(normalizeKey(hint)))) {
    return "INCOMING" as const;
  }

  if (VAT_OUTPUT_REGISTER_HINTS.some((hint) => normalized.includes(normalizeKey(hint)))) {
    return "OUTGOING" as const;
  }

  return "UNKNOWN" as const;
}

function formatPeriod(period: string | null) {
  if (!period) return "—";

  const parsed = new Date(period);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("ru-RU");
}

export function buildVatDashboard(items: OneCRegisterItem[]): VatDashboardData {
  const entries: VatEntry[] = [];

  for (const item of items) {
    const records = collectRegisterRecords(item);

    for (const record of records) {
      const directionField = findField(record.fields, ["direction", "type"]);
      const direction = directionField?.direction ?? inferRegisterDirection(record.registerType);
      const vatAmount = Math.abs(sumNumericFields(record.fields, VAT_AMOUNT_HINTS, ["ставка", "rate", "percent"]));
      const baseAmount = Math.abs(
        sumNumericFields(record.fields, ["сумма", "amount", "итог", "стоим", "total"], [
          ...VAT_AMOUNT_HINTS,
          ...DEPRECIATION_HINTS,
        ]),
      );
      const documentLabel =
        findStringValue(record.fields, DOCUMENT_HINTS) ?? `Документ ${shortReference(record.recordId)}`;
      const counterpartyLabel =
        findStringValue(record.fields, COUNTERPARTY_HINTS) ??
        findStringValue(record.fields, ["организац", "company"]) ??
        "Без контрагента";
      const currencyLabel = findStringValue(record.fields, ["валют", "currency"]) ?? "UZS";

      entries.push({
        id: Number(record.recordId.replace(/[^\d]/gu, "")) || item.id,
        documentLabel,
        counterpartyLabel,
        periodLabel: formatPeriod(record.period),
        sortValue: record.period ? new Date(record.period).getTime() || 0 : 0,
        direction,
        directionLabel:
          direction === "INCOMING" ? "+ Incoming" : direction === "OUTGOING" ? "- Outgoing" : "Без движения",
        directionVariant:
          direction === "INCOMING" ? "success" : direction === "OUTGOING" ? "danger" : "neutral",
        vatAmount,
        baseAmount,
        currencyLabel,
        details: record.fields.slice(0, 4),
      });
    }
  }

  const inputVat = entries
    .filter((entry) => entry.direction === "INCOMING")
    .reduce((sum, entry) => sum + entry.vatAmount, 0);
  const outputVat = entries
    .filter((entry) => entry.direction === "OUTGOING")
    .reduce((sum, entry) => sum + entry.vatAmount, 0);

  return {
    inputVat,
    outputVat,
    vatToPay: outputVat - inputVat,
    documents: entries.length,
    entries: entries.sort((left, right) => right.sortValue - left.sortValue),
  };
}

export function buildFixedAssetsDashboard(items: OneCRegisterItem[]): FixedAssetsDashboardData {
  const assets = new Map<string, FixedAssetRow>();

  for (const item of items) {
    const records = collectRegisterRecords(item);

    for (const record of records) {
      const assetName =
        findStringValue(record.fields, ASSET_NAME_HINTS) ?? `Актив ${shortReference(record.recordId)}`;
      const category =
        findStringValue(record.fields, CATEGORY_HINTS) ??
        (normalizeKey(record.registerType).includes("нма") ? "Нематериальный актив" : "Основное средство");
      const status = findStringValue(record.fields, STATUS_HINTS) ?? "Активен";
      const depreciation = Math.abs(sumNumericFields(record.fields, DEPRECIATION_HINTS));
      const initialValue = Math.abs(sumNumericFields(record.fields, INITIAL_VALUE_HINTS, DEPRECIATION_HINTS));

      const existing = assets.get(assetName);
      const mergedInitial = Math.max(existing?.initialValue ?? 0, initialValue);
      const mergedDepreciation = (existing?.depreciation ?? 0) + depreciation;
      const updatedAtLabel = formatPeriod(record.period);

      assets.set(assetName, {
        key: assetName,
        assetName,
        category,
        initialValue: mergedInitial,
        depreciation: mergedDepreciation,
        netValue: Math.max(mergedInitial - mergedDepreciation, 0),
        status,
        updatedAtLabel:
          updatedAtLabel !== "—"
            ? updatedAtLabel
            : existing?.updatedAtLabel ?? "—",
        details: (existing?.details ?? record.fields).slice(0, 4),
      });
    }
  }

  const assetRows = Array.from(assets.values()).sort((left, right) => right.netValue - left.netValue);

  return {
    totalInitialValue: assetRows.reduce((sum, asset) => sum + asset.initialValue, 0),
    totalDepreciation: assetRows.reduce((sum, asset) => sum + asset.depreciation, 0),
    totalNetValue: assetRows.reduce((sum, asset) => sum + asset.netValue, 0),
    assetsCount: assetRows.length,
    assets: assetRows,
  };
}
