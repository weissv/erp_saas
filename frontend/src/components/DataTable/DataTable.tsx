// src/components/DataTable/DataTable.tsx
import Papa from "papaparse";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    <div className="rounded-[var(--radius-xl)] border border-[var(--border-card)] bg-[var(--surface-primary)] overflow-hidden shadow-[var(--shadow-card)]">
      {/* Toolbar */}
      <div className="flex justify-end px-4 py-2.5 border-b border-[var(--separator)]">
        <button
          className="text-[12px] font-medium px-3 py-1.5 rounded-[var(--radius-md)] bg-fill-quaternary hover:bg-fill-tertiary text-secondary macos-transition"
          onClick={downloadCsv}
        >
          Экспорт CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={tableCls}>
          <thead>
            <tr className="border-b border-[var(--separator)] bg-[var(--bg-inset)]">
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
                <td
                  className="p-10 text-center text-tertiary text-[14px]"
                  colSpan={columns.length}
                >
                  Нет данных
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-[var(--separator)] last:border-0 hover:bg-fill-quaternary macos-transition ${
                    i % 2 === 1 ? 'bg-[var(--bg-inset)]' : ''
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
      <div className="flex flex-col sm:flex-row justify-between items-center px-4 py-3 text-[13px] gap-2 border-t border-[var(--separator)]">
        <div className="text-tertiary">
          Всего: <span className="font-semibold text-primary">{total}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-fill-quaternary text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-fill-tertiary macos-transition font-medium"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-fill-quaternary text-primary disabled:opacity-30 disabled:cursor-not-allowed hover:bg-fill-tertiary macos-transition font-medium"
          >
            Вперёд
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
