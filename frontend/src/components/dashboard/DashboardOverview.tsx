// src/components/dashboard/DashboardOverview.tsx
// Bento-style overview strip: metrics, alerts, summary

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Clock3, LayoutGrid, Zap } from 'lucide-react';
import type { DashboardOverview as OverviewData } from '../../types/dashboard';

interface DashboardOverviewProps {
  overview: OverviewData;
}

const generatedAtFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export default function DashboardOverview({ overview }: DashboardOverviewProps) {
  const navigate = useNavigate();

  if (!overview.metrics.length && !overview.alerts.length) return null;

  const activeAlerts = overview.alerts.filter(a => a.value > 0);

  const summaryItems = [
    { id: 'widgets', label: 'Виджетов', value: overview.visibleWidgetCount, icon: LayoutGrid },
    { id: 'actions', label: 'Действий', value: overview.quickActionCount, icon: Zap },
    {
      id: 'updated',
      label: 'Обновлено',
      value: generatedAtFormatter.format(new Date(overview.generatedAt)),
      icon: Clock3,
    },
  ];

  return (
    <div className="bento-overview">
      {/* Metrics */}
      {overview.metrics.length > 0 && (
        <div className="bento-overview__metrics">
          {overview.metrics.map(metric => (
            <div
              key={metric.id}
              className={`bento-overview__metric bento-overview__metric--${metric.tone}`}
            >
              <p className="bento-overview__metric-value">
                {typeof metric.value === 'number'
                  ? metric.value.toLocaleString('ru-RU')
                  : metric.value}
              </p>
              <p className="bento-overview__metric-label">{metric.label}</p>
              {metric.hint && (
                <p className="bento-overview__metric-hint">{metric.hint}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary row + alerts */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="bento-overview__summary">
          {summaryItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="bento-overview__summary-item">
                <div className="bento-overview__summary-icon">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="bento-overview__summary-value">{item.value}</div>
                  <div className="bento-overview__summary-label">{item.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {activeAlerts.length > 0 && (
          <div className="bento-overview__alerts">
            {activeAlerts.map(alert => (
              <button
                key={alert.id}
                className={`bento-overview__alert bento-overview__alert--${alert.tone}`}
                onClick={() => navigate(alert.path)}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{alert.label}</span>
                <span className="bento-overview__alert-value">{alert.value}</span>
                <ChevronRight className="h-3 w-3 opacity-60" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
