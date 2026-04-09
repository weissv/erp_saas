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
  'add-child':          { bg: 'var(--tint-blue)',       color: 'var(--color-blue)' },
  'add-employee':       { bg: 'var(--tint-green)',      color: 'var(--color-green)' },
  'add-finance':        { bg: 'var(--tint-green)',      color: 'var(--color-green)' },
  'mark-attendance':    { bg: 'var(--tint-purple)',     color: 'var(--color-purple)' },
  'create-order':       { bg: 'var(--tint-orange)',     color: 'var(--color-orange)' },
  'create-maintenance': { bg: 'var(--tint-red)',        color: 'var(--color-red)' },
  'view-menu':          { bg: 'var(--tint-orange)',     color: 'var(--color-orange)' },
  'view-schedule':      { bg: 'var(--tint-blue)',       color: 'var(--color-blue)' },
  'view-inventory':     { bg: 'var(--tint-purple)',     color: 'var(--color-indigo)' },
  'ai-assistant':       { bg: 'var(--tint-purple)',     color: 'var(--color-purple)' },
};

const DEFAULT_COLOR = { bg: 'var(--fill-quaternary)', color: 'var(--text-secondary)' };

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
            aria-label={action.label}
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
