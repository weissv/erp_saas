// src/components/DataTable/DataTable.tsx
import Papa from "papaparse";
import React from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { EmptyListState } from "../ui/EmptyState";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

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
  title,
  description,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
  toolbar,
}: {
  data: T[];
  columns: Column<T>[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  wrapCells?: boolean;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: () => void;
  className?: string;
  toolbar?: React.ReactNode;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const headerCellCls = wrapCells
    ? "px-4 py-3 text-left whitespace-normal break-words align-top text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
    : "px-4 py-3 text-left whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

  const bodyCellCls = wrapCells
    ? "px-4 py-3 whitespace-normal break-words align-top text-sm text-foreground"
    : "px-4 py-3 whitespace-nowrap text-sm text-foreground";

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
    <section className={cn("overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm", className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-border/50 bg-muted/20 px-4 py-4 sm:px-6">
        {(title || description || toolbar) && (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              {title ? <h3 className="text-sm font-semibold tracking-[-0.01em] text-foreground">{title}</h3> : null}
              {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Показано <span className="font-semibold text-foreground">{data.length}</span> из{" "}
            <span className="font-semibold text-foreground">{total}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadCsv}
            aria-label="Экспорт данных в CSV"
          >
            <Download className="h-4 w-4" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <table className={tableCls} role="table">
          <thead>
            <tr className="border-b border-border/50 bg-muted/50">
              {columns.map((c) => (
                <th key={c.key} className={cn(headerCellCls, "sticky top-0 z-10 bg-muted/80 backdrop-blur-sm")}>
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
                    title={emptyTitle ?? "Нет данных"}
                    description={emptyDescription ?? "Данные ещё не добавлены"}
                    onAction={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, i) => {
                const rowClassName = [
                  "border-b border-border/50 last:border-0 transition-colors duration-100 hover:bg-muted/30",
                  i % 2 === 1 ? "bg-muted/[0.18]" : "",
                ].join(" ");

                return (
                <tr
                  key={i}
                  className={rowClassName}
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
              )})
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-border/50 px-4 py-4 text-sm sm:flex-row sm:px-6">
        <div className="text-muted-foreground">
          Всего: <span className="font-semibold text-foreground">{total}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Предыдущая страница"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Назад
          </button>
          <span className="px-3 text-muted-foreground tabular-nums font-semibold">
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Следующая страница"
          >
            Вперёд
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
