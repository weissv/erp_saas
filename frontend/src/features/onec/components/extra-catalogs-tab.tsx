import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { listOneCUniversalCatalogs } from "../api";
import { usePaginatedOneCResource } from "../hooks";
import type { OneCUniversalCatalogItem, OneCSummary } from "../types";
import { FilterChips, SearchInput, SectionTable, type TableColumn } from "./shared";

export function ExtraCatalogsTab({ summary }: { summary: OneCSummary | null }) {
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const resource = usePaginatedOneCResource<OneCUniversalCatalogItem, { catalogType?: string; search?: string }>({
    loader: listOneCUniversalCatalogs,
    initialFilters: {},
    initialPageSize: 50,
  });

  useEffect(() => {
    resource.setFilters({
      ...(selected ? { catalogType: selected } : {}),
      ...(deferredSearch ? { search: deferredSearch } : {}),
    });
  }, [deferredSearch, selected, resource.setFilters]);

  const columns = useMemo<TableColumn<OneCUniversalCatalogItem>[]>(
    () => [
      { key: "catalogType", header: "Тип", cellClassName: "text-xs text-blue-600", render: (item) => item.catalogType },
      {
        key: "code",
        header: "Код",
        cellClassName: "font-mono text-xs text-gray-500",
        render: (item) => item.code || "—",
      },
      { key: "name", header: "Наименование", render: (item) => item.name },
      {
        key: "isFolder",
        header: "Папка",
        headerClassName: "text-center",
        cellClassName: "text-center",
        render: (item) => (item.isFolder ? "Да" : "—"),
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <FilterChips items={summary?.universalCatalogs.byType ?? []} selected={selected} total={summary?.universalCatalogs.total ?? 0} onSelect={setSelected} />
      <SearchInput placeholder="Поиск по названию или коду..." value={search} onChange={setSearch} />
      <SectionTable
        columns={columns}
        items={resource.items}
        loading={resource.loading}
        error={resource.error}
        total={resource.total}
        page={resource.page}
        totalPages={resource.totalPages}
        emptyMessage="Нет универсальных справочников"
        onPageChange={resource.setPage}
      />
    </div>
  );
}
