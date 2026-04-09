import { useState } from "react";
import { FINANCE_REGISTER_TYPES, FIXED_ASSETS_REGISTER_TYPES } from "../../../features/onec/register-groups";
import { ScopedRegistersTab } from "../../../features/onec/components/scoped-registers-tab";
import type { OneCSummary } from "../../../features/onec/types";
import { useOneCSummary } from "../../../features/onec";

type FinanceRegSubTab = "finance" | "fixed-assets";

export default function FinanceRegistersView() {
  const { data: summary } = useOneCSummary();
  const [subTab, setSubTab] = useState<FinanceRegSubTab>("finance");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        {(["finance", "fixed-assets"] as FinanceRegSubTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              subTab === tab
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "finance" ? "НДС и доходы" : "Основные средства"}
          </button>
        ))}
      </div>

      {subTab === "finance" ? (
        <ScopedRegistersTab
          registerTypes={FINANCE_REGISTER_TYPES}
          summary={summary as OneCSummary | null}
        />
      ) : (
        <ScopedRegistersTab
          registerTypes={FIXED_ASSETS_REGISTER_TYPES}
          summary={summary as OneCSummary | null}
        />
      )}
    </div>
  );
}
