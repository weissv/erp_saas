// src/components/dashboard/widgets/HrAlertsWidget.tsx
import { UserCheck, Calendar, FileText, AlertTriangle } from 'lucide-react';

interface HrAlert {
  type: 'medical' | 'contract' | 'document';
  employeeName: string;
  detail: string;
  dueDate: string;
  overdue: boolean;
}

interface HrAlertsData {
  alerts: HrAlert[];
  medicalExpiring: number;
  contractsExpiring: number;
}

const ALERT_CONFIG: Record<string, { icon: typeof UserCheck; badgeCls: string; label: string }> = {
  medical:  { icon: UserCheck, badgeCls: 'bento-badge--red',   label: 'Мед. осмотр' },
  contract: { icon: FileText,  badgeCls: 'bento-badge--amber', label: 'Договор' },
  document: { icon: Calendar,  badgeCls: 'bento-badge--blue',  label: 'Документ' },
};

export default function HrAlertsWidget({ data }: { data: HrAlertsData | undefined }) {
  if (!data) return null;

  const alerts = data.alerts ?? [];

  return (
    <div className="bento-hr">
      <div className="bento-hr__counts">
        <div className="bento-hr__count-cell">
          <p className="bento-hr__count-num" style={{ color: '#DC2626' }}>{data.medicalExpiring ?? 0}</p>
          <p className="bento-hr__count-lbl">Мед. осмотры</p>
        </div>
        <div className="bento-hr__count-cell">
          <p className="bento-hr__count-num" style={{ color: '#D97706' }}>{data.contractsExpiring}</p>
          <p className="bento-hr__count-lbl">Договоры</p>
        </div>
      </div>

      <div className="bento-list">
        {alerts.slice(0, 5).map((alert, i) => {
          const cfg = ALERT_CONFIG[alert.type] ?? ALERT_CONFIG.document;
          const Icon = cfg.icon;
          return (
            <div key={i} className="bento-list-item">
              <div className="bento-list-icon" style={{ background: 'rgba(255,255,255,0.7)' }}>
                <Icon className="h-3.5 w-3.5 text-secondary" />
              </div>
              <div className="bento-list-item__main">
                <p className="bento-list-item__title">{alert.employeeName}</p>
                <p className="bento-list-item__sub">{alert.detail}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] whitespace-nowrap ${alert.overdue ? 'text-red-600 font-semibold' : 'text-tertiary'}`}>
                  {new Date(alert.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
                {alert.overdue && <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
