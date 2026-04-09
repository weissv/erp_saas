// src/components/dashboard/widgets/CashForecastWidget.tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ForecastDay {
  date: string;
  income: number;
  expense: number;
  cumulative: number;
}

interface CashForecastData {
  days: ForecastDay[];
  totalIncome: number;
  totalExpense: number;
  netChange: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export default function CashForecastWidget({ data }: { data: CashForecastData | undefined }) {
  if (!data) return null;

  const days = data.days ?? [];
  const maxAbs = Math.max(...days.map(d => Math.abs(d.cumulative)), 1);

  return (
    <div className="bento-forecast">
      <div className="bento-forecast__net">
        <p className="bento-forecast__net-label">Прогноз нетто · 30 дн.</p>
        <p className={`bento-forecast__net-value ${data.netChange >= 0 ? 'bento-forecast__net-value--pos' : 'bento-forecast__net-value--neg'}`}>
          {data.netChange >= 0 ? '+' : ''}{fmt(data.netChange)}
        </p>
      </div>

      <div className="bento-forecast__bars">
        {days.map((d, i) => {
          const h = Math.round((Math.abs(d.cumulative) / maxAbs) * 100);
          return (
            <div
              key={i}
              className={`bento-forecast__bar ${d.cumulative >= 0 ? 'bento-forecast__bar--pos' : 'bento-forecast__bar--neg'}`}
              style={{ height: `${Math.max(h, 4)}%` }}
              title={`${d.date}: ${fmt(d.cumulative)}`}
            />
          );
        })}
      </div>

      <div className="bento-forecast__row">
        <div className="bento-forecast__cell">
          <TrendingUp className="h-3 w-3 text-emerald-600 mx-auto mb-1" />
          <p className="bento-forecast__cell-val">{fmt(data.totalIncome)}</p>
          <p className="bento-forecast__cell-lbl">Доход</p>
        </div>
        <div className="bento-forecast__cell">
          <TrendingDown className="h-3 w-3 text-red-500 mx-auto mb-1" />
          <p className="bento-forecast__cell-val">{fmt(data.totalExpense)}</p>
          <p className="bento-forecast__cell-lbl">Расход</p>
        </div>
        <div className="bento-forecast__cell">
          <Minus className="h-3 w-3 text-blue-500 mx-auto mb-1" />
          <p className="bento-forecast__cell-val">{fmt(data.netChange)}</p>
          <p className="bento-forecast__cell-lbl">Нетто</p>
        </div>
      </div>
    </div>
  );
}
