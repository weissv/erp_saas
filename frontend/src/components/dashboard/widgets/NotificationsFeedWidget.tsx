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
  info:    { icon: Info,          bg: '#EFF6FF', color: '#3B82F6' },
  warning: { icon: AlertTriangle, bg: '#FFFBEB', color: '#D97706' },
  success: { icon: CheckCircle,   bg: '#ECFDF5', color: '#10B981' },
  error:   { icon: XCircle,       bg: '#FEF2F2', color: '#EF4444' },
  default: { icon: Bell,          bg: '#F8FAFC', color: '#64748B' },
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
          <div key={n.id} className={`bento-list-item${!n.read ? ' ' : ''}`} style={!n.read ? { background: 'rgba(219,234,254,0.35)' } : undefined}>
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
