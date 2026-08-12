import React, { createContext, useContext, useState, useEffect } from 'react';
import { TelemetryLog, LogSeverity, SystemHealthMetrics } from '../types';
import { initSentry, captureSentryException, captureSentryMessage, addSentryBreadcrumb } from '../lib/sentry';

interface TelemetryContextType {
  logs: TelemetryLog[];
  metrics: SystemHealthMetrics;
  captureLog: (
    severity: LogSeverity,
    module: string,
    message: string,
    metadata?: Record<string, any>,
    stackTrace?: string,
    latencyMs?: number,
    statusCode?: number
  ) => void;
  triggerSimulatedError: (moduleName?: string) => void;
  clearLogs: () => void;
  isTelemetryModalOpen: boolean;
  setIsTelemetryModalOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'fidelity_telemetry_logs_v1';

const INITIAL_SEED_LOGS: TelemetryLog[] = [
  {
    id: 'log_seed_1',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    severity: 'INFO',
    module: 'Pipeline Engine',
    message: 'System booted successfully in production mode',
    latencyMs: 120,
    statusCode: 200,
  },
  {
    id: 'log_seed_2',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    severity: 'INFO',
    module: 'FactBank Extractor',
    message: 'Verified 42 atomic facts for candidate Sajid Ali',
    latencyMs: 840,
    statusCode: 200,
  },
  {
    id: 'log_seed_3',
    timestamp: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    severity: 'WARN',
    module: 'JD URL Scraper',
    message: 'Scraper encountered cloudflare wall on external URL. Activated headless browser fallback.',
    latencyMs: 2150,
    statusCode: 206,
  },
];

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<TelemetryLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load telemetry logs:', e);
    }
    return INITIAL_SEED_LOGS;
  });

  const [isTelemetryModalOpen, setIsTelemetryModalOpen] = useState(false);

  // Fetch server-side telemetry logs (e.g. Stripe Webhooks) periodically & when modal opens
  useEffect(() => {
    let isMounted = true;
    const syncServerLogs = async () => {
      try {
        const res = await fetch('/api/telemetry/logs');
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (isMounted && data?.success && Array.isArray(data.logs) && data.logs.length > 0) {
          setLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const newServerLogs: TelemetryLog[] = data.logs
              .filter((srvLog: any) => !existingIds.has(srvLog.id))
              .map((srvLog: any) => ({
                id: srvLog.id,
                timestamp: srvLog.timestamp ? new Date(srvLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString(),
                severity: srvLog.severity || 'INFO',
                module: srvLog.module || 'Server',
                message: srvLog.message || 'Server Log',
                metadata: srvLog.metadata,
                stackTrace: srvLog.stackTrace,
                latencyMs: srvLog.latencyMs || 10,
                statusCode: srvLog.statusCode || 200,
              }));
            if (newServerLogs.length === 0) return prev;
            return [...newServerLogs, ...prev].slice(0, 200);
          });
        }
      } catch {
        // Silently ignore background fetch network errors
      }
    };

    syncServerLogs();
    const interval = setInterval(syncServerLogs, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isTelemetryModalOpen]);

  // Initialize Sentry SDK on mount and register global error interceptors
  useEffect(() => {
    initSentry();

    const handleWindowError = (event: ErrorEvent) => {
      const errorObj = event.error || new Error(event.message || 'Unhandled Window Error');
      const stack = errorObj.stack || `Error: ${event.message}\n    at ${event.filename}:${event.lineno}:${event.colno}`;

      captureSentryException(errorObj, {
        source: 'window.onerror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });

      captureLog(
        'ERROR',
        'Global Exception Handler',
        `Unhandled Window Error: ${event.message}`,
        { filename: event.filename, lineno: event.lineno, colno: event.colno },
        stack,
        0,
        500
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonStr = String(reason || '');
      if (reasonStr.includes('WebSocket') || reasonStr.includes('vite') || reasonStr.includes('HMR')) {
        return; // Suppress Vite HMR dev server connection noise
      }

      const errorObj = reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : 'Unhandled Promise Rejection');
      const stack = errorObj.stack || `UnhandledPromiseRejection: ${reasonStr}`;

      captureSentryException(errorObj, {
        source: 'unhandledrejection',
        reason: String(reason),
      });

      captureLog(
        'ERROR',
        'Async Pipeline Engine',
        `Unhandled Promise Rejection: ${errorObj.message}`,
        { reason: String(reason) },
        stack,
        0,
        500
      );
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.error('Failed to save telemetry logs:', e);
    }
  }, [logs]);

  const captureLog = (
    severity: LogSeverity,
    module: string,
    message: string,
    metadata?: Record<string, any>,
    stackTrace?: string,
    latencyMs?: number,
    statusCode?: number
  ) => {
    const newLog: TelemetryLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      severity,
      module,
      message,
      metadata,
      stackTrace,
      latencyMs: latencyMs || Math.floor(Math.random() * 400) + 150,
      statusCode: statusCode || (severity === 'ERROR' || severity === 'FATAL' ? 500 : 200),
    };

    setLogs((prev) => [newLog, ...prev].slice(0, 200));

    // Relay to Sentry SDK
    addSentryBreadcrumb(module, message, { severity, statusCode, latencyMs, ...metadata });

    if (severity === 'ERROR' || severity === 'FATAL') {
      const errorContext = { module, statusCode, latencyMs, ...metadata };
      if (stackTrace) {
        const errorObj = new Error(message);
        errorObj.stack = stackTrace;
        captureSentryException(errorObj, errorContext);
      } else {
        captureSentryMessage(`[${module}] ${message}`, severity === 'FATAL' ? 'fatal' : 'error', errorContext);
      }
    }
  };

  const triggerSimulatedError = (moduleName: string = 'CoverLetterGenerator') => {
    const fakeError = new Error(`[Sentry Alert] Simulated production crash in ${moduleName}: Unexpected response token stream.`);
    fakeError.stack = `Error: ${fakeError.message}\n    at ${moduleName}.tsx:142:15\n    at dispatchAction (react-dom.development.js:16139)\n    at Object.useCandidate (CandidateContext.tsx:48:9)`;

    captureSentryException(fakeError, {
      simulated: true,
      module: moduleName,
      candidate: 'M Sajid Ali',
      targetRole: 'Senior AI Engineer',
      timestamp: new Date().toISOString(),
    });

    captureLog(
      'ERROR',
      moduleName,
      `Unhandled Exception: ${fakeError.message}`,
      { candidate: 'M Sajid Ali', targetRole: 'Senior AI Engineer', timestamp: new Date().toISOString(), sentryDispatched: true },
      fakeError.stack,
      1420,
      500
    );
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Compute live metrics
  const totalRequests = logs.length;
  const errorLogs = logs.filter((l) => l.severity === 'ERROR' || l.severity === 'FATAL');
  const errorRatePercentage = totalRequests > 0 ? Math.round((errorLogs.length / totalRequests) * 100) : 0;
  
  const validLatencies = logs.map((l) => l.latencyMs).filter((l): l is number => typeof l === 'number');
  const averageLatencyMs = validLatencies.length > 0 ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) : 250;

  let status: SystemHealthMetrics['status'] = 'OPTIMAL';
  if (errorRatePercentage > 30) {
    status = 'CRITICAL';
  } else if (errorRatePercentage > 10 || errorLogs.length > 0) {
    status = 'DEGRADED';
  }

  const metrics: SystemHealthMetrics = {
    totalRequests,
    errorRatePercentage,
    averageLatencyMs,
    activeKillSwitchesCount: 0, // Will be combined with flags
    status,
  };

  return (
    <TelemetryContext.Provider
      value={{
        logs,
        metrics,
        captureLog,
        triggerSimulatedError,
        clearLogs,
        isTelemetryModalOpen,
        setIsTelemetryModalOpen,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
};

