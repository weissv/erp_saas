// src/components/ui/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showReset?: boolean;
  showHome?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, showReset = true, showHome = true } = this.props;

    if (hasError) {
      if (fallback) return fallback;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-[var(--tint-red)] rounded-[var(--radius-xl)] flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-macos-red" />
            </div>
            <h2 className="text-[17px] font-semibold text-primary mb-2 tracking-[-0.01em]">
              Что-то пошло не так
            </h2>
            <p className="text-[13px] text-tertiary mb-5">
              {error?.message || 'Произошла непредвиденная ошибка'}
            </p>
            <div className="flex justify-center gap-3">
              {showReset && (
                <Button onClick={this.handleReset} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Попробовать снова
                </Button>
              )}
              {showHome && (
                <Button onClick={this.handleGoHome} size="sm">
                  <Home className="w-4 h-4 mr-1.5" />
                  На главную
                </Button>
              )}
            </div>
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-5 text-left bg-fill-quaternary rounded-[var(--radius-md)] p-3 text-[11px] font-mono text-secondary">
                <summary className="cursor-pointer font-sans font-medium text-[12px] text-primary">
                  Детали ошибки
                </summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap">{error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}
