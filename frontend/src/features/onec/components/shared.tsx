import React from "react";
import { Loader2, Search } from "lucide-react";

export type TableColumn<T> = {
  key: string;
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (item: T) => React.ReactNode;
};

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatAmount(value: string | number | null | undefined) {
  if (value == null) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SearchInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={placeholder}
        className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Предыдущая страница"
        className="rounded border bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Назад
      </button>
      <span className="text-sm text-gray-600" aria-live="polite">
        {page} / {totalPages}
      </span>
      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Следующая страница"
        className="rounded border bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Вперёд
      </button>
    </div>
  );
}

export function FilterChips({
  items,
  selected,
  total,
  accent = "blue",
  onSelect,
}: {
  items: Array<{ type: string; count: number }>;
  selected: string;
  total: number;
  accent?: "blue" | "green";
  onSelect: (value: string) => void;
}) {
  const activeClass =
    accent === "green"
      ? "border-green-400 bg-green-100 text-green-700"
      : "border-blue-400 bg-blue-100 text-blue-700";

  return (
    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
      <button
        onClick={() => onSelect("")}
        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
          !selected ? activeClass : "border-gray-200 hover:border-gray-300"
        }`}
      >
        Все ({total})
      </button>
      {items.map((item) => (
        <button
          key={item.type}
          onClick={() => onSelect(item.type)}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            selected === item.type ? activeClass : "border-gray-200 hover:border-gray-300"
          }`}
        >
          {item.type} ({item.count})
        </button>
      ))}
    </div>
  );
}

export function SectionTable<T extends { id: number }>({
  columns,
  items,
  loading,
  error,
  total,
  page,
  totalPages,
  emptyMessage,
  onPageChange,
}: {
  columns: TableColumn<T>[];
  items: T[];
  loading: boolean;
  error: Error | null;
  total: number;
  page: number;
  totalPages: number;
  emptyMessage: string;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-lg border bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-500">{error.message}</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">{emptyMessage}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-3 py-2 text-left font-medium ${column.headerClassName ?? ""}`.trim()}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-3 py-2 ${column.cellClassName ?? ""}`.trim()}>
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
        <span>Всего: {total}</span>
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
