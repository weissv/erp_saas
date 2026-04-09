// src/components/dashboard/WidgetChrome.tsx
// Bento-style card wrapper for dashboard widgets

import { ReactNode } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

interface WidgetChromeProps {
  title: string;
  category?: string;
  isLoading?: boolean;
  error?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onRefresh?: () => void;
  deepLink?: string;
  /** When true the card shows the edit-mode outline and grab cursor */
  isEditMode?: boolean;
  children: ReactNode;
}

export default function WidgetChrome({
  title,
  category,
  isLoading,
  error,
  isCollapsed,
  onToggleCollapse,
  onRefresh,
  deepLink,
  isEditMode,
  children,
}: WidgetChromeProps) {
  return (
    <div className={`bento-card${isEditMode ? ' bento-card--edit-mode' : ''}`} data-cat={category}>
      {/* Header — draggable area */}
      <div className="bento-card__header dashboard-widget__header">
        <div className="bento-card__title-row">
          <span className="bento-card__dot" />
          <h3 className="bento-card__title">{title}</h3>
          {isLoading && (
            <RefreshCw className="h-3 w-3 animate-spin opacity-50 flex-shrink-0" />
          )}
        </div>

        <div className="bento-card__actions">
          {onRefresh && !isLoading && (
            <button
              onClick={onRefresh}
              className="bento-card__btn"
              title="Обновить"
              aria-label="Обновить"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
          {deepLink && (
            <a
              href={deepLink}
              className="bento-card__btn"
              title="Открыть модуль"
              aria-label="Открыть модуль"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="bento-card__btn"
              title={isCollapsed ? 'Развернуть' : 'Свернуть'}
              aria-label={isCollapsed ? 'Развернуть' : 'Свернуть'}
            >
              {isCollapsed
                ? <ChevronDown className="h-3.5 w-3.5" />
                : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={`bento-card__body${isCollapsed ? ' bento-card__body--collapsed' : ''}`}>
        {error ? (
          <div className="bento-card__error">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p>{error}</p>
          </div>
        ) : isLoading && !children ? (
          <div className="bento-card__skeleton">
            <div className="bento-card__skeleton-line" style={{ width: '80%' }} />
            <div className="bento-card__skeleton-line" style={{ width: '60%' }} />
            <div className="bento-card__skeleton-line" style={{ width: '45%' }} />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
