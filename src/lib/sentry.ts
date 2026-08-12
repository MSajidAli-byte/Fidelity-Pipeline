/// <reference types="vite/client" />
import * as Sentry from '@sentry/react';

let isSentryInitialized = false;

export function initSentry() {
  if (isSentryInitialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN || (window as any).__SENTRY_DSN__ || '';
  const isProd = import.meta.env.PROD;

  try {
    Sentry.init({
      dsn: dsn || 'https://00000000000000000000000000000000@o0.ingest.sentry.io/0',
      enabled: isProd && Boolean(dsn),
      tracesSampleRate: 1.0,
      environment: import.meta.env.MODE || 'development',
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      ignoreErrors: [
        'WebSocket closed without opened',
        'Failed to connect to websocket',
        '[vite]',
      ],
    });
    isSentryInitialized = true;
    console.log('[Sentry SDK] Initialized successfully.', { enabled: isProd && Boolean(dsn) });
  } catch (err) {
    console.warn('[Sentry SDK] Sentry initialization notice:', err);
  }
}

export function captureSentryException(error: unknown, context?: Record<string, any>) {
  try {
    initSentry();
    Sentry.captureException(error, {
      extra: context,
    });
  } catch (e) {
    console.error('[Sentry SDK] Exception dispatch fallback:', e);
  }
}

export function captureSentryMessage(message: string, level: Sentry.SeverityLevel = 'error', context?: Record<string, any>) {
  try {
    initSentry();
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  } catch (e) {
    console.error('[Sentry SDK] Message dispatch fallback:', e);
  }
}

export function addSentryBreadcrumb(category: string, message: string, data?: Record<string, any>) {
  try {
    initSentry();
    Sentry.addBreadcrumb({
      category,
      message,
      data,
      level: 'info',
    });
  } catch (e) {
    // Ignore breadcrumb errors
  }
}
