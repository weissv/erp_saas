// src/components/dashboard/widgets/ActivityStreamWidget.tsx
import { Activity, User, FileEdit, Trash2, Plus, Settings } from 'lucide-react';

interface ActivityEntry {
  id: string;
  action: string;
  entity: string;
  entityName: string;
  userName: string;
  timestamp: string;
}

interface ActivityStreamData {
  entries: ActivityEntry[];
}

const ACTION_ICONS: Record<string, { icon: typeof Activity; bg: string; color: string }> = {
  create:   { icon: Plus,     bg: '#ECFDF5', color: '#059669' },
  update:   { icon: FileEdit, bg: '#EFF6FF', color: '#3B82F6' },
  delete:   { icon: Trash2,   bg: '#FEF2F2', color: '#DC2626' },
  settings: { icon: Settings, bg: '#F8FAFC', color: '#64748B' },
};

const ACTION_LABELS: Record<string, string> = {
  create:   'создал(а)',
  update:   'изменил(а)',
  delete:   'удалил(а)',
};

export default function ActivityStreamWidget({ data }: { data: ActivityStreamData | undefined }) {
  if (!data) return null;

  const entries = data.entries ?? [];

  return (
    <div className="bento-list">
      {entries.length === 0 && (
        <p className="text-xs text-tertiary text-center py-4">Нет активности</p>
      )}

      {entries.slice(0, 7).map(entry => {
        const cfg = ACTION_ICONS[entry.action] ?? ACTION_ICONS.update;
        const Icon = cfg.icon;
        return (
          <div key={entry.id} className="bento-list-item">
            <div className="bento-list-icon" style={{ background: cfg.bg }}>
              <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
            </div>
            <div className="bento-list-item__main">
              <p className="bento-list-item__title">
                <span>{entry.userName}</span>{' '}
                <span style={{ color: 'var(--text-tertiary)' }}>{ACTION_LABELS[entry.action] ?? entry.action}</span>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>{entry.entityName}</span>
              </p>
              <p className="bento-list-item__sub">
                <User className="h-2.5 w-2.5 inline mr-0.5" />
                {entry.entity}
              </p>
            </div>
            <span className="text-[10px] text-tertiary whitespace-nowrap flex-shrink-0">
              {new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
