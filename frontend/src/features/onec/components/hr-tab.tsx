import { useEffect, useMemo, useState } from "react";
import { HR_REGISTER_TYPES } from "../register-groups";
import { listOneCHRDocuments } from "../api";
import { usePaginatedOneCResource } from "../hooks";
import type { OneCHRDocumentItem, OneCSummary } from "../types";
import { FilterChips, SectionTable, formatAmount, formatDate, type TableColumn } from "./shared";
import { ScopedRegistersTab } from "./scoped-registers-tab";

function HRDocumentsSection({ summary }: { summary: OneCSummary | null }) {
  const [selected, setSelected] = useState("");
  const resource = usePaginatedOneCResource<OneCHRDocumentItem, { docType?: string }>({
    loader: listOneCHRDocuments,
    initialFilters: {},
    initialPageSize: 50,
  });

  useEffect(() => {
    resource.setFilters(selected ? { docType: selected } : {});
  }, [selected, resource.setFilters]);

  const columns = useMemo<TableColumn<OneCHRDocumentItem>[]>(
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
        key: "period",
        header: "Период",
        cellClassName: "text-xs",
        render: (item) => {
          const start = formatDate(item.dateStart);
          const end = item.dateEnd ? formatDate(item.dateEnd) : "";
          return end ? `${start} — ${end}` : start;
        },
      },
      {
        key: "amount",
        header: "Сумма",
        headerClassName: "text-right",
        cellClassName: "text-right text-xs tabular-nums",
        render: (item) => formatAmount(item.amount),
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
      <FilterChips
        items={summary?.hrDocuments.byType ?? []}
        selected={selected}
        total={summary?.hrDocuments.total ?? 0}
        onSelect={setSelected}
      />
      <SectionTable
        columns={columns}
        items={resource.items}
        loading={resource.loading}
        error={resource.error}
        total={resource.total}
        page={resource.page}
        totalPages={resource.totalPages}
        emptyMessage="Нет кадровых документов"
        onPageChange={resource.setPage}
      />
    </div>
  );
}

export function HRTab({ summary }: { summary: OneCSummary | null }) {
  return (
    <div className="space-y-4">
      <HRDocumentsSection summary={summary} />
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Данные учета 1С</h3>
          <p className="text-sm text-gray-500">
            Графики, неявки, отработанное время и другие кадровые записи показаны в читаемом виде.
          </p>
        </div>
        <ScopedRegistersTab registerTypes={HR_REGISTER_TYPES} summary={summary} />
      </section>
    </div>
  );
}
