// src/components/dashboard/widgets/UnitEconomicsWidget.tsx
import { Calculator, Users } from 'lucide-react';

interface UnitEcon {
  totalCost: number;
  childCount: number;
  costPerChild: number;
  breakdown: { label: string; amount: number; pct: number }[];
}

const formatCompact = (n: number) =>
  new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

const BAR_COLORS = ['#EC4899', '#3B82F6', '#F59E0B', '#6366F1', '#10B981', '#F43F5E'];

export default function UnitEconomicsWidget({ data }: { data: UnitEcon | undefined }) {
  if (!data) return null;

  const breakdown = data.breakdown ?? [];

  return (
    <div className="bento-economics">
      <div className="bento-economics__hero">
        <div className="flex items-center gap-8">
          <div>
            <p className="bento-economics__label">Стоимость / ребёнок</p>
            <p className="bento-economics__value">{formatCompact(data.costPerChild ?? 0)}</p>
            <p className="bento-economics__sub">в месяц</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end text-xs text-secondary">
              <Users className="h-3.5 w-3.5" />
              <span>{data.childCount}</span>
            </div>
            <p className="text-[10px] text-tertiary mt-0.5">детей</p>
          </div>
        </div>
      </div>

      <div className="bento-economics__bars">
        {breakdown.map((item, i) => (
          <div key={i} className="bento-economics__bar-row">
            <span className="bento-economics__bar-label">{item.label}</span>
            <div className="bento-economics__bar-track">
              <div
                className="bento-economics__bar-fill"
                style={{ width: `${item.pct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
              />
            </div>
            <span className="bento-economics__bar-pct">{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
