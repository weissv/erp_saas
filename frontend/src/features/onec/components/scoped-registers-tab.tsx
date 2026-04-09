import { useEffect, useMemo, useState } from "react";
import { listOneCRegisters } from "../api";
import { usePaginatedOneCResource } from "../hooks";
import type { OneCRegisterItem, OneCSummary } from "../types";
import { FilterChips } from "./shared";
import { RegisterInsights } from "./register-insights";

type RegisterFilters = {
  registerType?: string;
  registerTypes?: string;
  registerKind?: string;
};

interface ScopedRegistersTabProps {
  registerTypes: string[];
  summary: OneCSummary | null;
}

export function ScopedRegistersTab({ registerTypes, summary }: ScopedRegistersTabProps) {
  const [selected, setSelected] = useState("");
  const [registerKind, setRegisterKind] = useState("");

  const initialRegisterTypes = useMemo(() => registerTypes.join(","), [registerTypes]);

  const resource = usePaginatedOneCResource<OneCRegisterItem, RegisterFilters>({
    loader: listOneCRegisters,
    initialFilters: { registerTypes: initialRegisterTypes },
    initialPageSize: 50,
  });

  useEffect(() => {
    resource.setFilters({
      ...(selected ? { registerType: selected } : { registerTypes: initialRegisterTypes }),
      ...(registerKind ? { registerKind } : {}),
    });
  }, [registerKind, selected, resource.setFilters, initialRegisterTypes]);

  const filteredByType = useMemo(
    () => (summary?.registers.byType ?? []).filter((item) => registerTypes.includes(item.type)),
    [summary, registerTypes],
  );

  const scopedTotal = useMemo(
    () => filteredByType.reduce((sum, item) => sum + item.count, 0),
    [filteredByType],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["", "Information", "Accumulation"].map((kind) => (
          <button
            key={kind || "all"}
            onClick={() => setRegisterKind(kind)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              registerKind === kind
                ? "border-blue-400 bg-blue-100 text-blue-700"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {kind === "" ? "Все" : kind === "Information" ? "Сведения" : "Накопления"}
          </button>
        ))}
      </div>

      <FilterChips
        items={filteredByType}
        selected={selected}
        total={scopedTotal}
        accent="green"
        onSelect={setSelected}
      />

      <RegisterInsights
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
