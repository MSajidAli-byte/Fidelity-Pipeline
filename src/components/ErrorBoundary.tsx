import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Terminal, Cpu } from 'lucide-react';
import { captureSentryException } from '../lib/sentry';

interface Props {
  children: ReactNode;
  theme?: 'dark' | 'light';
  onCatchError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[Sentry/BetterStack Telemetry Captured Error]:', error, errorInfo);
    captureSentryException(error, {
      componentStack: errorInfo.componentStack,
      boundary: 'React.ErrorBoundary',
    });
    if (this.props.onCatchError) {
      this.props.onCatchError(error, errorInfo);
    }
  }


  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isLight = this.props.theme === 'light';

      return (
        <div
          className={`min-h-screen flex items-center justify-center p-6 font-mono ${
            isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#09090c] text-white'
          }`}
        >
          <div
            className={`w-full max-w-2xl border p-8 shadow-2xl relative ${
              isLight ? 'bg-white border-rose-300' : 'bg-[#0f0b0f] border-rose-900/60'
            }`}
          >
            <div className="flex items-center gap-3 mb-6 border-b pb-4 border-rose-500/20">
              <div className="w-12 h-12 bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-lg uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Sentry Telemetry: Exception Caught
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase">
                    Crash Recovery
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  The application caught an unexpected runtime error. A diagnostic log has been transmitted to Sentry/BetterStack.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div
              className={`p-4 border mb-6 text-xs font-mono space-y-2 overflow-x-auto ${
                isLight ? 'bg-rose-50 border-rose-200 text-slate-800' : 'bg-rose-950/40 border-rose-900/60 text-rose-200'
              }`}
            >
              <div className="font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Cpu className="w-4 h-4 shrink-0" />
                <span>Error: {this.state.error?.name || 'Runtime Exception'}</span>
              </div>
              <p className="font-semibold">{this.state.error?.message || 'An unexpected error occurred during render.'}</p>
            </div>

            {/* Stack Trace Preview */}
            {this.state.error?.stack && (
              <div className="mb-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase mb-2 text-zinc-400">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  <span>Captured Stack Trace:</span>
                </div>
                <pre
                  className={`p-3 text-[11px] font-mono overflow-x-auto max-h-48 border leading-relaxed ${
                    isLight ? 'bg-slate-900 text-emerald-400 border-slate-800' : 'bg-black text-emerald-400 border-zinc-800'
                  }`}
                >
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-zinc-800">
              <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Emergency Kill Switch controls remain active in Admin.
              </span>

              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase tracking-wider text-xs border border-rose-400 flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
