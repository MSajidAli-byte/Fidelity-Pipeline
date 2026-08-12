import React, { useEffect, useState } from 'react';
import { CheckCircle2, Zap, ArrowRight, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import { useAuth } from '../context/AuthContext';

export const WelcomePage: React.FC<{ onReturnToDashboard?: () => void }> = ({
  onReturnToDashboard,
}) => {
  const { currentUser } = useAuth();
  const { tier, creditsRemaining, refreshCredits } = useCredit();

  const [isVerifying, setIsVerifying] = useState(true);
  const [verifiedStatus, setVerifiedStatus] = useState<string>('Payment Verified');

  useEffect(() => {
    async function verifyCheckout() {
      setIsVerifying(true);
      const urlParams = new URLSearchParams(window.location.search);
      const txnId =
        urlParams.get('paddle_transaction_id') ||
        urlParams.get('transaction_id') ||
        urlParams.get('sessionId');

      if (txnId) {
        try {
          const res = await fetch(
            `/api/paddle/verify-transaction?paddle_transaction_id=${encodeURIComponent(
              txnId
            )}&email=${encodeURIComponent(currentUser?.email || '')}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.verified) {
              setVerifiedStatus('Payment Verified & Account Activated');
            }
          }
        } catch (err) {
          console.warn('[WelcomePage] Session verification notice:', err);
        }
      }

      await refreshCredits();
      setIsVerifying(false);
    }

    verifyCheckout();
  }, [currentUser, refreshCredits]);

  const handleOpenPortal = async () => {
    try {
      const res = await fetch('/api/paddle/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'alex.rivera@fidelity.ai',
        },
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.warn('[WelcomePage] Customer portal notice:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-[#0e111a] border border-blue-500/50 p-8 shadow-2xl text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-blue-600 border border-blue-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-600/40">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold uppercase">
            <ShieldCheck className="w-4 h-4" />
            <span>{isVerifying ? 'Verifying Subscription...' : verifiedStatus}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase">
            Welcome to Fidelity Pipeline Premium!
          </h1>

          <p className="text-xs font-mono text-zinc-400">
            Thank you for subscribing. Your account has been upgraded with active subscription credits and priority access.
          </p>
        </div>

        {/* Current Active Plan Card */}
        <div className="p-4 bg-zinc-900/80 border border-zinc-800 text-left font-mono space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 uppercase font-bold">Active Tier:</span>
            <span className="font-bold text-blue-400 uppercase">{tier} Plan</span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800 pt-2">
            <span className="text-zinc-400 uppercase font-bold">Available Credits:</span>
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Zap className="w-4 h-4 fill-current" />
              {tier === 'enterprise' ? 'Unlimited (∞)' : `${creditsRemaining} Credits`}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              if (onReturnToDashboard) {
                onReturnToDashboard();
              } else {
                window.location.href = '/';
              }
            }}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-black uppercase tracking-wider border border-blue-400 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Launch Pipeline Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenPortal}
            className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold uppercase tracking-wider border border-zinc-700 cursor-pointer flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Manage Billing</span>
          </button>
        </div>
      </div>
    </div>
  );
};
