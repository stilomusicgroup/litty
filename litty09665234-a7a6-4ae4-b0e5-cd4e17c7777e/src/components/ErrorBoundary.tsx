import React, { Component, ReactNode } from 'react';
import { logError } from '@/hooks/use-error-logger';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError({
      message: error.message,
      stack: error.stack || undefined,
      context: errorInfo.componentStack || undefined,
      level: 'error',
      source: 'frontend',
    }).catch(() => { /* silent */ });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4" style={{ background: 'rgba(10,5,20,0.95)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={32} style={{ color: '#ef4444' }} />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Something went wrong</h1>
          <p className="text-sm mb-8 text-center max-w-md" style={{ color: 'rgba(220,214,240,0.5)' }}>
            An unexpected error occurred. We have logged this issue and will investigate.
          </p>
          <button
            onClick={this.handleRefresh}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            <RefreshCw size={16} />
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
