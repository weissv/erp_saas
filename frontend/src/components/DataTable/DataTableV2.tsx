// src/components/DataTable/DataTableV2.tsx
// ──────────────────────────────────────────────────────────────────────────────
// Highly Reusable Data Table Wrapper (TanStack Table v8)
// ──────────────────────────────────────────────────────────────────────────────
// Features:
//   • Compact high-density "Cockpit" styling (py-1, text-sm)
//   • Sticky headers
//   • Column sorting (click header)
//   • Column visibility toggles (dropdown)
//   • Bulk action checkboxes (select all / select row)
//   • Global search / filter input
//   • Robust pagination
//   • Beautiful empty state with CTA
// ──────────────────────────────────────────────────────────────────────────────

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type Table,
  type PaginationState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Inbox,
  Search,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Checkbox } from "../ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DataTableProps<TData> {
  /** TanStack column definitions */
  columns: ColumnDef<TData, any>[];
  /** Row data */
  data: TData[];
  /** Enable row-selection checkboxes */
  enableSelection?: boolean;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** The column ID to use for global filtering (default: first string column) */
  searchColumnId?: string;
  /** Render a custom toolbar above the table */
  toolbar?: (table: Table<TData>) => React.ReactNode;
  /** Empty-state heading */
  emptyHeading?: string;
  /** Empty-state description */
  emptyDescription?: string;
  /** Empty-state CTA node */
  emptyAction?: React.ReactNode;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Callback when selected rows change */
  onSelectionChange?: (rows: TData[]) => void;
}

// ─── Helper: Selection Column ────────────────────────────────────────────────

function getSelectColumn<TData>(): ColumnDef<TData, any> {
  return {
    id: "select",
    header: ({ table }) => {
      const checked = table.getIsAllPageRowsSelected()
        ? true
        : table.getIsSomePageRowsSelected()
          ? ("indeterminate" as const)
          : false;
      return (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Выбрать всё"
          className="translate-y-[2px]"
        />
      );
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Выбрать строку"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  };
}

// ─── Pagination Controls ─────────────────────────────────────────────────────

function PaginationControls<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
}: {
  table: Table<TData>;
  pageSizeOptions?: number[];
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Row count */}
      <p className="text-xs text-muted-foreground tabular-nums">
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <span className="mr-2 font-medium text-foreground">
            {table.getFilteredSelectedRowModel().rows.length} выбрано ·
          </span>
        )}
        Всего: <span className="font-semibold text-foreground">{table.getFilteredRowModel().rows.length}</span>
      </p>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Page size */}
        <div className="flex items-center gap-1.5">
          <span className="hidden text-xs text-muted-foreground sm:inline">Строк:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page number */}
        <span className="px-2 text-xs tabular-nums text-muted-foreground">
          {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </span>

        {/* Nav buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent transition-colors"
            aria-label="Первая страница"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent transition-colors"
            aria-label="Назад"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent transition-colors"
            aria-label="Вперёд"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent transition-colors"
            aria-label="Последняя страница"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  heading = "Данные не найдены",
  description = "Попробуйте изменить фильтры или добавить записи.",
  action,
  colSpan,
}: {
  heading?: string;
  description?: string;
  action?: React.ReactNode;
  colSpan: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">{heading}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
          {action && <div className="mt-4">{action}</div>}
        </div>
      </td>
    </tr>
  );
}

// ─── DataTableV2 ─────────────────────────────────────────────────────────────

export function DataTableV2<TData>({
  columns: userColumns,
  data,
  enableSelection = false,
  searchPlaceholder = "Поиск…",
  searchColumnId,
  toolbar,
  emptyHeading,
  emptyDescription,
  emptyAction,
  pageSizeOptions,
  onSelectionChange,
}: DataTableProps<TData>) {
  // ── Table state ──
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });

  // Prepend select column when selection is enabled
  const columns = useMemo(() => {
    if (!enableSelection) return userColumns;
    return [getSelectColumn<TData>(), ...userColumns];
  }, [userColumns, enableSelection]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectionChange) {
        const selectedIndices = Object.keys(next).filter((k) => next[k]);
        onSelectionChange(selectedIndices.map((i) => data[Number(i)]));
      }
    },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const visibleColumns = table.getAllColumns().filter((col) => col.getCanHide());

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Custom toolbar content */}
          {toolbar?.(table)}

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-card-foreground hover:bg-accent transition-colors">
                <Columns3 className="h-4 w-4" />
                <span className="hidden sm:inline">Колонки</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Видимые колонки</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {visibleColumns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  className="capitalize"
                >
                  {typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                      header.column.getCanSort() && "cursor-pointer select-none",
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <ArrowUpDown
                            className={cn(
                              "h-3 w-3 transition-colors",
                              header.column.getIsSorted()
                                ? "text-foreground"
                                : "text-muted-foreground/40",
                            )}
                          />
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <EmptyState
                heading={emptyHeading}
                description={emptyDescription}
                action={emptyAction}
                colSpan={columns.length}
              />
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors",
                    "hover:bg-muted/50",
                    row.getIsSelected() && "bg-primary/5",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="whitespace-nowrap px-3 py-1 text-sm text-foreground"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      <PaginationControls table={table} pageSizeOptions={pageSizeOptions} />
    </div>
  );
}

export default DataTableV2;
