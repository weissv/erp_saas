// src/components/dashboard/widgets/MaintenanceQueueWidget.tsx
import { Wrench, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MaintRequest {
  id: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
}

interface MaintenanceQueueData {
  byStatus: { status: string; count: number }[];
  recent: MaintRequest[];
  totalOpen: number;
}

const PRIORITY_CLS: Record<string, string> = {
  urgent: 'bento-badge--red',
  high:   'bento-badge--amber',
  medium: 'bento-badge--amber',
  low:    'bento-badge--gray',
};

const STATUS_ICONS: Record<string, typeof Clock> = {
  pending:     Clock,
  in_progress: Wrench,
  completed:   CheckCircle2,
};

export default function MaintenanceQueueWidget({ data }: { data: MaintenanceQueueData | undefined }) {
  if (!data) return null;

  const byStatus = data.byStatus ?? [];
  const recent = data.recent ?? [];

  return (
    <div className="bento-maintenance">
      <div className="bento-maintenance__hero">
        <span className="bento-maintenance__big">{data.totalOpen ?? 0}</span>
        <span className="bento-maintenance__label">открытых заявок</span>
      </div>

      <div className="bento-maintenance__statuses">
        {byStatus.map(s => (
          <span key={s.status} className="bento-maintenance__status-chip">
            {s.status.replace('_', ' ')}: <strong>{s.count}</strong>
          </span>
        ))}
      </div>

      <div className="bento-list" style={{ gap: '5px' }}>
        {recent.slice(0, 4).map(req => {
          const Icon = STATUS_ICONS[req.status] ?? Clock;
          return (
            <div key={req.id} className="bento-list-item">
              <div className="bento-list-icon" style={{ background: 'rgba(255,255,255,0.7)' }}>
                <Icon className="h-3.5 w-3.5 text-secondary" />
              </div>
              <div className="bento-list-item__main">
                <p className="bento-list-item__title">{req.title}</p>
              </div>
              <span className={`bento-badge ${PRIORITY_CLS[req.priority] ?? 'bento-badge--gray'}`}>
                {req.priority}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
