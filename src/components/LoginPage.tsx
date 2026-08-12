import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  Loader2,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authClient } from '../lib/auth-client';

interface LoginPageProps {
  theme?: 'dark' | 'light';
  onLoginSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ theme = 'dark', onLoginSuccess }) => {
  const isLight = theme === 'light';
  const { loginAsDemoAdmin, loginAsStandardUser, loginWithGoogle } = useAuth();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Target app origin for OAuth redirects and direct tab links
  const targetAppUrl =
    import.meta.env.VITE_APP_URL ||
    import.meta.env.VITE_PUBLIC_APP_URL ||
    window.location.origin;

  // Trigger Google OAuth Sign In via Better Auth
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);

    try {
      const callbackURL = `${targetAppUrl}/dashboard`;

      // 1. Attempt to fetch direct Google OAuth authorization URL from server
      const response = await fetch(`${targetAppUrl}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          callbackURL,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const googleAuthUrl = data?.url || data?.redirectUrl;

        if (googleAuthUrl && (googleAuthUrl.startsWith('http://') || googleAuthUrl.startsWith('https://'))) {
          // Direct OAuth URL obtained from Better Auth
          if (window.top !== window.self) {
            // Running inside an iframe: Open the Google OAuth Provider URL directly in a new tab
            window.open(googleAuthUrl, '_blank');
          } else {
            // Running in full tab: Redirect current window
            window.location.href = googleAuthUrl;
          }
          return;
        }
      }

      // 2. Fallback to authClient standard social method
      const res = await authClient.signIn.social({
        provider: 'google',
        callbackURL,
      });

      if (res?.error) {
        setErrorMessage(res.error.message || 'Google OAuth authentication failed.');
      }
    } catch (err: any) {
      console.warn('Better Auth OAuth Notice:', err?.message || err);
      setErrorMessage(err?.message || 'Unable to connect to Google OAuth server.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div
      className={`min-h-[85vh] flex items-center justify-center p-4 font-sans relative ${
        isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#050505] text-white'
      }`}
    >
      <div
        className={`w-full max-w-md border shadow-2xl overflow-hidden rounded-xl transition-all ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0c0c0e] border-zinc-800'
        }`}
      >
        {/* Header Banner */}
        <div
          className={`p-6 border-b text-center relative ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/60 border-zinc-800'
          }`}
        >
          <div className="mx-auto w-12 h-12 bg-blue-600 border border-blue-400 flex items-center justify-center rounded-lg shadow-lg shadow-blue-600/30 mb-3">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-mono font-black uppercase tracking-wider">
            Fidelity AI Platform
          </h2>
          <p className={`text-xs font-mono mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Anti-Hallucination Resume Optimization Pipeline
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Notification / Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold flex items-center gap-2 rounded">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="text-center space-y-1.5 py-1">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
              Identity Verification Required
            </h3>
            <p className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 leading-relaxed">
              Authentication is exclusively verified via Google OAuth 2.0 to protect candidate profile data.
            </p>
          </div>

          {/* Primary Action: Google OAuth Sign In */}
          <div className="space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={isAuthenticating}
              className="w-full py-3.5 px-4 bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-3 rounded-md shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isAuthenticating ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isAuthenticating ? 'Redirecting to Google...' : 'Sign In with Google'}</span>
            </button>

            {window.top !== window.self && (
              <div className="text-center pt-1">
                <a
                  href={targetAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono text-blue-400 hover:text-blue-300 underline transition-colors"
                >
                  <span>Open App in New Tab for Direct Google OAuth</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Quick Demo Access Bar (Development Mode Only) */}
          {import.meta.env.DEV && import.meta.env.VITE_HIDE_DEMO_BYPASS !== 'true' && (
            <div
              className={`p-4 border rounded-lg space-y-2.5 ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/40 border-zinc-800'
              }`}
            >
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Quick Evaluation Demo Access
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    loginAsDemoAdmin();
                    if (onLoginSuccess) onLoginSuccess();
                  }}
                  className={`p-2 border text-[11px] font-mono font-bold text-left rounded transition-all cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                  }`}
                >
                  <div className="font-black text-purple-400 text-[10px]">SUPER ADMIN</div>
                  <div className="truncate">admin@fidelity.ai</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    loginAsStandardUser();
                    if (onLoginSuccess) onLoginSuccess();
                  }}
                  className={`p-2 border text-[11px] font-mono font-bold text-left rounded transition-all cursor-pointer ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                  }`}
                >
                  <div className="font-black text-blue-400 text-[10px]">CANDIDATE</div>
                  <div className="truncate">alex.rivera@fidelity.ai</div>
                </button>
              </div>
            </div>
          )}

          {/* Security Features Note */}
          <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 space-y-1 border-t pt-4 border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Role-Based Access Control (RBAC) Enforced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Encrypted OAuth 2.0 Token Identity Verification</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
