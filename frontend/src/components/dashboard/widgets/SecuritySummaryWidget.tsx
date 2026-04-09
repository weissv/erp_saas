// src/components/dashboard/widgets/SecuritySummaryWidget.tsx
import { Shield, Eye, AlertTriangle, DoorOpen } from 'lucide-react';

interface SecurityEvent {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface SecuritySummaryData {
  last30Days: { type: string; count: number }[];
  recentEvents: SecurityEvent[];
  todayCount: number;
}

const EVENT_CFG: Record<string, { icon: typeof Eye; bg: string; color: string }> = {
  entry:   { icon: DoorOpen,       bg: '#ECFDF5', color: '#10B981' },
  exit:    { icon: DoorOpen,       bg: '#EFF6FF', color: '#3B82F6' },
  alert:   { icon: AlertTriangle,  bg: '#FEF2F2', color: '#EF4444' },
  visitor: { icon: Eye,            bg: '#FFFBEB', color: '#D97706' },
};

export default function SecuritySummaryWidget({ data }: { data: SecuritySummaryData | undefined }) {
  if (!data) return null;

  const last30Days = data.last30Days ?? [];
  const recentEvents = data.recentEvents ?? [];

  return (
    <div className="bento-security">
      <div className="bento-security__today">
        <Shield className="h-5 w-5 text-blue-500 flex-shrink-0 self-center" />
        <div>
          <span className="bento-security__today-num">{data.todayCount ?? 0}</span>
          <span className="bento-security__today-lbl"> событий сегодня</span>
        </div>
      </div>

      <div className="bento-security__type-chips">
        {last30Days.map(s => (
          <span key={s.type} className="bento-security__type-chip">
            {s.type} <strong>{s.count}</strong>
          </span>
        ))}
      </div>

      <div className="bento-list" style={{ gap: '5px' }}>
        {recentEvents.slice(0, 5).map(ev => {
          const cfg = EVENT_CFG[ev.type] ?? EVENT_CFG.entry;
          const Icon = cfg.icon;
          return (
            <div key={ev.id} className="bento-list-item">
              <div className="bento-list-icon" style={{ background: cfg.bg }}>
                <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
              </div>
              <div className="bento-list-item__main">
                <p className="bento-list-item__title">{ev.description}</p>
              </div>
              <span className="text-[10px] text-tertiary whitespace-nowrap flex-shrink-0">
                {new Date(ev.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
