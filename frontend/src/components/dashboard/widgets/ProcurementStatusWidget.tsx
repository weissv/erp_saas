// src/components/dashboard/widgets/ProcurementStatusWidget.tsx
import { ShoppingCart, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';

interface ProcurementData {
  byStatus: { status: string; count: number }[];
  recentOrders: { id: string; supplier: string; status: string; total: number; date: string }[];
  totalActive: number;
}

const STATUS_CFG: Record<string, { icon: typeof Clock; color: string }> = {
  pending:   { icon: Clock,        color: '#D97706' },
  approved:  { icon: CheckCircle,  color: '#3B82F6' },
  ordered:   { icon: ShoppingCart, color: '#6366F1' },
  delivered: { icon: Truck,        color: '#10B981' },
  cancelled: { icon: XCircle,      color: '#EF4444' },
};

const STATUS_LABELS: Record<string, string> = {
  pending:   'Ожидание',
  approved:  'Одобрено',
  ordered:   'Заказано',
  delivered: 'Доставлено',
  cancelled: 'Отменено',
};

const formatCompact = (n: number) =>
  new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export default function ProcurementStatusWidget({ data }: { data: ProcurementData | undefined }) {
  if (!data) return null;

  const byStatus = data.byStatus ?? [];
  const recentOrders = data.recentOrders ?? [];

  return (
    <div className="bento-procurement">
      <div className="bento-procurement__statuses">
        {byStatus.map(s => {
          const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.pending;
          const Icon = cfg.icon;
          return (
            <div key={s.status} className="bento-procurement__status-item">
              <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cfg.color }} />
              <span>{STATUS_LABELS[s.status] ?? s.status}</span>
              <span className="bento-procurement__status-count">{s.count}</span>
            </div>
          );
        })}
      </div>

      <div className="bento-list" style={{ gap: '5px' }}>
        {recentOrders.slice(0, 4).map(order => (
          <div key={order.id} className="bento-list-item">
            <div className="bento-list-item__main">
              <p className="bento-list-item__title">{order.supplier}</p>
              <p className="bento-list-item__sub">{new Date(order.date).toLocaleDateString('ru-RU')}</p>
            </div>
            <span className="text-[11px] font-semibold text-secondary flex-shrink-0">{formatCompact(order.total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
