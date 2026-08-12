import React, { useEffect, useState } from 'react';
import { Download, Wifi, WifiOff, X, Check, Smartphone } from 'lucide-react';

interface PWAInstallPromptProps {
  theme?: 'dark' | 'light';
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ theme = 'dark' }) => {
  const isLight = theme === 'light';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Detect standalone display mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install this app, tap your browser menu and choose "Add to Home Screen" or "Install App".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install outcome: ${outcome}`);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (dismissed) return null;

  return (
    <div className={`w-full border-b text-xs font-mono py-1.5 px-4 flex flex-wrap items-center justify-between gap-2 z-40 transition-all ${
      isLight ? 'bg-slate-200/90 border-slate-300 text-slate-800' : 'bg-zinc-900/90 border-zinc-800 text-zinc-100'
    }`}>
      {/* Network Status Badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 border font-bold ${
            isOnline
              ? isLight
                ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : isLight
              ? 'bg-amber-100 text-amber-900 border-amber-400'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              <span>ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className={`w-3 h-3 animate-pulse ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
              <span>OFFLINE MODE (Saved Resumes Ready)</span>
            </>
          )}
        </span>

        <span className={`hidden sm:inline ${isLight ? 'text-slate-700 font-medium' : 'text-zinc-400'}`}>
          {isInstalled
            ? 'PWA Standalone App Active'
            : 'Progressive Web App (Offline Local Cache Enabled)'}
        </span>
      </div>

      {/* Install Button & Close */}
      <div className="flex items-center gap-2 ml-auto">
        {!isInstalled && (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold border border-blue-400 transition-colors cursor-pointer text-[11px]"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Install App / Shortcut</span>
          </button>
        )}

        {isInstalled && (
          <span className={`flex items-center gap-1 font-bold text-[11px] ${
            isLight ? 'text-emerald-800' : 'text-emerald-400'
          }`}>
            <Check className="w-3.5 h-3.5" /> App Installed
          </span>
        )}

        <button
          onClick={() => setDismissed(true)}
          title="Dismiss banner"
          className={`p-1 transition-colors cursor-pointer ${
            isLight ? 'hover:bg-slate-300 text-slate-600 hover:text-slate-900' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
