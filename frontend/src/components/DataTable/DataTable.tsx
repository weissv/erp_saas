// src/components/DataTable/DataTable.tsx
import Papa from "papaparse";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyListState } from "../ui/EmptyState";

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  page,
  pageSize,
  total,
  onPageChange,
  wrapCells = false,
}: {
  data: T[];
  columns: Column<T>[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  wrapCells?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const headerCellCls = wrapCells
    ? "text-left p-3 whitespace-normal break-words align-top text-[11px] font-bold uppercase tracking-[0.06em] text-tertiary"
    : "text-left p-3 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.06em] text-tertiary";

  const bodyCellCls = wrapCells
    ? "p-3 whitespace-normal break-words align-top text-[14px] text-primary"
    : "p-3 whitespace-nowrap text-[14px] text-primary";

  const tableCls = wrapCells ? "w-full table-fixed" : "w-full";

  const downloadCsv = () => {
    const rows = data.map((row) =>
      Object.fromEntries(
        columns.map((c) => [String(c.header), c.key in row ? row[c.key as keyof T] : ""])
      )
    );
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/80 shadow-[0_18px_42px_rgba(15,23,42,0.07)] backdrop-blur-xl">
      {/* Toolbar */}
      <div className="flex justify-end border-b border-white/70 px-4 py-3">
        <button
          className="rounded-full border border-white/80 bg-white/85 px-3.5 py-2 text-[12px] font-semibold text-secondary shadow-subtle backdrop-blur-xl macos-transition hover:-translate-y-0.5 hover:bg-white"
          onClick={downloadCsv}
          aria-label="Экспорт данных в CSV"
        >
          Экспорт CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={tableCls} role="table">
          <thead>
            <tr className="border-b border-white/70 bg-fill-quaternary">
              {columns.map((c) => (
                <th key={c.key} className={headerCellCls}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyListState
                    title="Нет данных"
                    description="Данные ещё не добавлены"
                  />
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-white/70 last:border-0 hover:bg-white/70 macos-transition ${
                    i % 2 === 1 ? 'bg-fill-quaternary' : ''
                  }`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={bodyCellCls}>
                      {c.render
                        ? c.render(row)
                        : c.key in row
                        ? String(row[c.key as keyof T] ?? "")
                        : ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-2 border-t border-white/70 px-4 py-4 text-[13px] sm:flex-row">
        <div className="text-tertiary">
          Всего: <span className="font-semibold text-primary">{total}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-3.5 py-2 font-semibold text-primary shadow-subtle backdrop-blur-xl macos-transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Предыдущая страница"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Назад
          </button>
          <span className="px-3 text-secondary tabular-nums font-semibold">
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-3.5 py-2 font-semibold text-primary shadow-subtle backdrop-blur-xl macos-transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Следующая страница"
          >
            Вперёд
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
