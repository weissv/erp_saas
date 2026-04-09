// src/components/ui/LoadingState.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/* ── Spinner ── */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const spinnerSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-macos-blue', spinnerSizes[size], className)}
    />
  );
}

/* ── Full-page loader ── */
interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({ message = 'Загрузка...' }: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 bg-[var(--bg-canvas)]/80 backdrop-blur-[20px] z-50 flex flex-col items-center justify-center">
      <Spinner size="xl" />
      <p className="mt-4 text-[13px] text-tertiary tracking-[-0.01em]">{message}</p>
    </div>
  );
}

/* ── Card / section loader ── */
interface LoadingCardProps {
  className?: string;
  message?: string;
  height?: string | number;
}

export function LoadingCard({ className, message, height = 200 }: LoadingCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-lg)]',
        'bg-[var(--bg-inset)]',
        className
      )}
      style={{ minHeight: height }}
    >
      <Spinner size="lg" />
      {message && <p className="mt-2 text-[12px] text-tertiary">{message}</p>}
    </div>
  );
}

/* ── Skeleton ── */
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-xl)]',
  full: 'rounded-full',
};

export function Skeleton({ className, width, height, rounded = 'md' }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-fill-quaternary', roundedClasses[rounded], className)}
      style={{ width, height }}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 border border-[var(--border-card)] rounded-[var(--radius-xl)]', className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton width={48} height={48} rounded="full" />
        <div className="flex-1">
          <Skeleton height={20} width="60%" className="mb-2" />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="border border-[var(--border-card)] rounded-[var(--radius-lg)] overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--bg-inset)] p-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height={14} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="p-3 flex gap-4 border-t border-[var(--separator)]">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} height={16} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
