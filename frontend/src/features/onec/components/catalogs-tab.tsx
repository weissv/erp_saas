import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { listOneCCatalog } from "../api";
import { usePaginatedOneCResource } from "../hooks";
import type { OneCCatalogItem, OneCSummary } from "../types";
import { SearchInput, SectionTable, type TableColumn } from "./shared";

export const catalogTypes: { key: string; label: string }[] = [
  { key: "organizations", label: "Организации" },
  { key: "nomenclature", label: "Номенклатура" },
  { key: "bank-accounts", label: "Банковские счета" },
  { key: "contracts", label: "Договоры" },
  { key: "employees", label: "Сотрудники" },
  { key: "positions", label: "Должности" },
  { key: "fixed-assets", label: "Основные средства" },
  { key: "warehouses", label: "Склады" },
  { key: "currencies", label: "Валюты" },
  { key: "departments", label: "Подразделения" },
];

type CatalogFilters = { type: string; search?: string };

function catalogLoader(params: CatalogFilters & { page: number; pageSize: number }) {
  const { type, ...rest } = params;
  return listOneCCatalog(type, rest);
}

export function CatalogsTab({ summary }: { summary: OneCSummary | null }) {
  const [selected, setSelected] = useState(catalogTypes[0].key);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const resource = usePaginatedOneCResource<OneCCatalogItem, CatalogFilters>({
    loader: catalogLoader,
    initialFilters: { type: catalogTypes[0].key },
    initialPageSize: 50,
  });

  useEffect(() => {
    resource.setFilters({
      type: selected,
      ...(deferredSearch ? { search: deferredSearch } : {}),
    });
  }, [deferredSearch, selected, resource.setFilters]);

  const columns = useMemo<TableColumn<OneCCatalogItem>[]>(
    () => [
      {
        key: "code",
        header: "Код",
        cellClassName: "font-mono text-xs text-gray-500",
        render: (item) => item.code || "—",
      },
      { key: "name", header: "Наименование", render: (item) => item.name },
      {
        key: "extra",
        header: "Доп. информация",
        cellClassName: "text-xs text-gray-500",
        render: (item) => item.fullName || item.accountNumber || item.inn || item.contractorRefKey || "—",
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {catalogTypes.map((catalog) => (
          <button
            key={catalog.key}
            onClick={() => setSelected(catalog.key)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              selected === catalog.key ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-xs text-gray-500">{catalog.label}</div>
            <div className="text-lg font-semibold">{summary?.catalogs[catalog.key] ?? 0}</div>
          </button>
        ))}
      </div>

      <SearchInput placeholder="Поиск по справочнику..." value={search} onChange={setSearch} />

      <SectionTable
        columns={columns}
        items={resource.items}
        loading={resource.loading}
        error={resource.error}
        total={resource.total}
        page={resource.page}
        totalPages={resource.totalPages}
        emptyMessage="Нет данных"
        onPageChange={resource.setPage}
      />
    </div>
  );
}
