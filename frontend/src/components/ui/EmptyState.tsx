// src/components/ui/EmptyState.tsx
import React from 'react';
import { LucideIcon, Inbox, Search, FileQuestion, AlertCircle, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    container: 'py-8 px-4',
    icon: 'w-8 h-8',
    iconWrapper: 'w-14 h-14',
    title: 'text-[14px]',
    description: 'text-[12px]',
  },
  md: {
    container: 'py-12 px-6',
    icon: 'w-10 h-10',
    iconWrapper: 'w-16 h-16',
    title: 'text-[15px]',
    description: 'text-[13px]',
  },
  lg: {
    container: 'py-16 px-8',
    icon: 'w-12 h-12',
    iconWrapper: 'w-20 h-20',
    title: 'text-[17px]',
    description: 'text-[14px]',
  },
};

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizes = sizeClasses[size];
  const ActionIcon = action?.icon || Plus;

  return (
    <div className={cn('text-center', sizes.container, className)}>
      <div
        className={cn(
          'mx-auto rounded-[var(--radius-xl)] flex items-center justify-center mb-4',
          'bg-fill-quaternary',
          sizes.iconWrapper
        )}
      >
        <Icon className={cn('text-tertiary', sizes.icon)} />
      </div>
      <h3 className={cn('font-semibold text-primary mb-1 tracking-[-0.01em]', sizes.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-tertiary mb-4 max-w-sm mx-auto', sizes.description)}>
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          <ActionIcon className="w-4 h-4 mr-1.5" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

/* ── Presets ── */
interface PresetEmptyStateProps {
  onAction?: () => void;
  className?: string;
}

export function NoDataState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={Inbox}
      title="Нет данных"
      description="Данные ещё не добавлены в систему"
      action={onAction ? { label: 'Добавить', onClick: onAction } : undefined}
      className={className}
    />
  );
}

export function NoSearchResultsState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={Search}
      title="Ничего не найдено"
      description="Попробуйте изменить параметры поиска или фильтры"
      className={className}
    />
  );
}

export function NotFoundState({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Страница не найдена"
      description="Запрашиваемая страница не существует или была удалена"
      action={onAction ? { label: 'На главную', onClick: onAction } : undefined}
      className={className}
    />
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title="Произошла ошибка"
      description={message || 'Не удалось загрузить данные'}
      action={onRetry ? { label: 'Повторить', onClick: onRetry } : undefined}
      className={className}
    />
  );
}

/* ── List empty state ── */
export function EmptyListState({
  title = 'Список пуст',
  description,
  onAction,
  actionLabel = 'Добавить',
  className,
}: {
  title?: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={Inbox}
      title={title}
      description={description}
      action={onAction ? { label: actionLabel, onClick: onAction } : undefined}
      size="sm"
      className={className}
    />
  );
}
