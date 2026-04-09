// src/components/dashboard/widgets/NotificationsFeedWidget.tsx
import { Bell, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  body?: string;
  type: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsFeedData {
  notifications: Notification[];
  unreadCount: number;
}

const TYPE_CFG: Record<string, { icon: typeof Bell; bg: string; color: string }> = {
  info:    { icon: Info,          bg: 'var(--tint-blue)',   color: 'var(--color-blue)' },
  warning: { icon: AlertTriangle, bg: 'var(--tint-orange)', color: 'var(--color-orange)' },
  success: { icon: CheckCircle,   bg: 'var(--tint-green)',  color: 'var(--color-green)' },
  error:   { icon: XCircle,       bg: 'var(--tint-red)',    color: 'var(--color-red)' },
  default: { icon: Bell,          bg: 'var(--fill-quaternary)', color: 'var(--text-secondary)' },
};

export default function NotificationsFeedWidget({ data }: { data: NotificationsFeedData | undefined }) {
  if (!data) return null;

  const notifications = data.notifications ?? [];

  return (
    <div className="bento-list">
      {(data.unreadCount ?? 0) > 0 && (
        <div className="bento-notif-unread">
          <Bell className="h-3.5 w-3.5" />
          {data.unreadCount} непрочитанных
        </div>
      )}

      {notifications.length === 0 && (
        <p className="text-xs text-tertiary text-center py-4">Нет уведомлений</p>
      )}

      {notifications.slice(0, 6).map(n => {
        const cfg = TYPE_CFG[n.type] ?? TYPE_CFG.default;
        const Icon = cfg.icon;
        return (
          <div key={n.id} className={`bento-list-item${!n.read ? ' ' : ''}`} style={!n.read ? { background: 'var(--tint-blue)' } : undefined}>
            <div className="bento-list-icon" style={{ background: cfg.bg }}>
              <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
            </div>
            <div className="bento-list-item__main">
              <p className={`bento-list-item__title${!n.read ? ' font-semibold' : ''}`}>{n.title}</p>
              {n.body && <p className="bento-list-item__sub">{n.body}</p>}
            </div>
            <span className="text-[10px] text-tertiary whitespace-nowrap flex-shrink-0">
              {new Date(n.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
