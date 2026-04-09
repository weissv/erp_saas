// src/components/dashboard/widgets/QuickActionsWidget.tsx
import { useNavigate } from 'react-router-dom';
import {
  Plus, FileText, UserPlus, ShoppingCart, ClipboardList,
  DollarSign, Package, UtensilsCrossed, Wrench, Calendar, CheckSquare, Bot,
  type LucideIcon,
} from 'lucide-react';
import type { QuickAction } from '../../../types/dashboard';

const ICON_MAP: Record<string, LucideIcon> = {
  Plus, FileText, UserPlus, ShoppingCart, ClipboardList,
  DollarSign, Package, UtensilsCrossed, Wrench, Calendar, CheckSquare, Bot,
};

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
  'add-child':          { bg: '#EFF6FF', color: '#2563EB' },
  'add-employee':       { bg: '#ECFDF5', color: '#059669' },
  'add-finance':        { bg: '#F0FDF4', color: '#16A34A' },
  'mark-attendance':    { bg: '#F5F3FF', color: '#7C3AED' },
  'create-order':       { bg: '#FFF7ED', color: '#EA580C' },
  'create-maintenance': { bg: '#FEF2F2', color: '#DC2626' },
  'view-menu':          { bg: '#FFFBEB', color: '#D97706' },
  'view-schedule':      { bg: '#ECFEFF', color: '#0891B2' },
  'view-inventory':     { bg: '#EEF2FF', color: '#4F46E5' },
  'ai-assistant':       { bg: '#FDF4FF', color: '#A21CAF' },
};

const DEFAULT_COLOR = { bg: '#F8FAFC', color: '#64748B' };

export default function QuickActionsWidget({ data }: { data: { actions: QuickAction[]; pinnedActions?: string[] } | undefined }) {
  const navigate = useNavigate();
  const allActions = Array.isArray(data?.actions) ? data.actions : [];
  const pinned = data?.pinnedActions ?? [];

  const sorted = pinned.length > 0
    ? [
      ...allActions.filter(a => pinned.includes(a.id)),
      ...allActions.filter(a => !pinned.includes(a.id)),
    ]
    : allActions;

  if (sorted.length === 0) return null;

  return (
    <div className="bento-actions-grid">
      {sorted.map(action => {
        const Icon = ICON_MAP[action.icon] ?? Plus;
        const { bg, color } = ACTION_COLORS[action.id] ?? DEFAULT_COLOR;
        const isPinned = pinned.includes(action.id);
        return (
          <button
            key={action.id}
            onClick={() => navigate(action.path)}
            className={`bento-action-btn${isPinned ? ' bento-action-btn--pinned' : ''}`}
            title={action.label}
          >
            {isPinned && <span className="bento-action-btn__pin" />}
            <div className="bento-action-btn__icon" style={{ background: bg }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <span className="bento-action-btn__label">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
