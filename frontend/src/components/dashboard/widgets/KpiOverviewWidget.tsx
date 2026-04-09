// src/components/dashboard/widgets/KpiOverviewWidget.tsx
import { Users, Briefcase, School, TrendingUp, TrendingDown } from 'lucide-react';

interface KpiData {
  childrenCount: number;
  employeesCount: number;
  activeClubs: number;
  income: number;
  expense: number;
}

function formatCompact(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

const ITEMS = (data: KpiData) => [
  { label: 'Дети', value: data.childrenCount, icon: Users, bg: '#EEF2FF', color: '#6366F1' },
  { label: 'Сотрудники', value: data.employeesCount, icon: Briefcase, bg: '#FFFBEB', color: '#D97706' },
  { label: 'Кружки', value: data.activeClubs, icon: School, bg: '#F5F3FF', color: '#7C3AED' },
  { label: 'Доход / 30д', value: formatCompact(data.income), icon: TrendingUp, bg: '#ECFDF5', color: '#059669' },
  { label: 'Расход / 30д', value: formatCompact(data.expense), icon: TrendingDown, bg: '#FEF2F2', color: '#DC2626' },
];

export default function KpiOverviewWidget({ data }: { data: KpiData | undefined }) {
  if (!data) return null;

  return (
    <div className="bento-kpi-grid">
      {ITEMS(data).map(item => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="bento-kpi-item">
            <div className="bento-kpi-item__icon" style={{ background: item.bg }}>
              <Icon className="h-4 w-4" style={{ color: item.color }} />
            </div>
            <p className="bento-kpi-item__value">{item.value}</p>
            <p className="bento-kpi-item__label">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}
