import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { listOneCDocuments } from "../api";
import { usePaginatedOneCResource } from "../hooks";
import type { OneCDocumentItem, OneCSummary } from "../types";
import { FilterChips, SearchInput, SectionTable, formatAmount, formatDate, type TableColumn } from "./shared";

export function DocumentsTab({ summary }: { summary: OneCSummary | null }) {
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const resource = usePaginatedOneCResource<OneCDocumentItem, { docType?: string; search?: string }>({
    loader: listOneCDocuments,
    initialFilters: {},
    initialPageSize: 50,
  });

  useEffect(() => {
    resource.setFilters({
      ...(selected ? { docType: selected } : {}),
      ...(deferredSearch ? { search: deferredSearch } : {}),
    });
  }, [deferredSearch, selected, resource.setFilters]);

  const columns = useMemo<TableColumn<OneCDocumentItem>[]>(
    () => [
      { key: "docType", header: "Тип", cellClassName: "text-xs", render: (item) => item.docType },
      {
        key: "documentNumber",
        header: "Номер",
        cellClassName: "font-mono text-xs",
        render: (item) => item.documentNumber || "—",
      },
      { key: "date", header: "Дата", cellClassName: "text-xs", render: (item) => formatDate(item.date) },
      {
        key: "amount",
        header: "Сумма",
        headerClassName: "text-right",
        cellClassName: "text-right text-xs tabular-nums",
        render: (item) => formatAmount(item.amount),
      },
      {
        key: "operationType",
        header: "Операция",
        cellClassName: "text-xs text-gray-500",
        render: (item) => item.operationType || "—",
      },
      {
        key: "posted",
        header: "Проведён",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (item) => (item.posted ? "✓" : "—"),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <FilterChips items={summary?.documents.byType ?? []} selected={selected} total={summary?.documents.total ?? 0} onSelect={setSelected} />
      <SearchInput placeholder="Поиск по номеру или комментарию..." value={search} onChange={setSearch} />
      <SectionTable
        columns={columns}
        items={resource.items}
        loading={resource.loading}
        error={resource.error}
        total={resource.total}
        page={resource.page}
        totalPages={resource.totalPages}
        emptyMessage="Нет документов"
        onPageChange={resource.setPage}
      />
    </div>
  );
}
