import type { OneCSummary } from "../types";

export function OneCSummaryCards({ summary }: { summary: OneCSummary }) {
  const cards = [
    {
      label: "Справочники",
      total: Object.values(summary.catalogs).reduce((sum, value) => sum + value, 0),
      hint: `${Object.keys(summary.catalogs).length} типов`,
    },
    {
      label: "Доп. справочники",
      total: summary.universalCatalogs.total,
      hint: `${summary.universalCatalogs.byType.length} типов`,
    },
    {
      label: "Документы",
      total: summary.documents.total,
      hint: `${summary.documents.byType.length} типов`,
    },
    {
      label: "Кадры",
      total: summary.hrDocuments.total,
      hint: `${summary.hrDocuments.byType.length} типов`,
    },
    {
      label: "Зарплата",
      total: summary.payrollDocuments.total,
      hint: `${summary.payrollDocuments.byType.length} типов`,
    },
    {
      label: "Учётные данные",
      total: summary.registers.total,
      hint: `${summary.registers.byType.length} типов`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="rounded-lg border bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">{card.label}</div>
          <div className="mt-1 text-2xl font-bold">{card.total.toLocaleString("ru-RU")}</div>
          <div className="text-xs text-gray-400">{card.hint}</div>
        </div>
      ))}
    </div>
  );
}
