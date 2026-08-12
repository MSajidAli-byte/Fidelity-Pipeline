import React from 'react';
import { Zap, AlertTriangle, ArrowRight, ShieldAlert, Sparkles, X } from 'lucide-react';
import { useCredit } from '../context/CreditContext';

interface OutOfCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const OutOfCreditsModal: React.FC<OutOfCreditsModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const { tier, upgradeTier, refillCredits, setIsUpgradeModalOpen } = useCredit();

  if (!isOpen) return null;

  const handleUpgradeToPro = () => {
    upgradeTier('pro');
    onClose();
  };

  const handleRefillTen = () => {
    refillCredits(10);
    onClose();
  };

  const handleOpenFullSubscriptionModal = () => {
    onClose();
    setIsUpgradeModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg border shadow-2xl p-6 transition-all relative ${
          isLight ? 'bg-white border-rose-200 text-slate-900' : 'bg-[#0f0a0d] border-rose-900/60 text-white'
        }`}
      >
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-1.5 border transition-colors cursor-pointer ${
            isLight ? 'hover:bg-slate-100 text-slate-500 border-slate-300' : 'hover:bg-zinc-800 text-zinc-400 border-zinc-700'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0">
            <Zap className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <h3 className="font-mono font-black text-base uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Pipeline Credit Limit Reached
            </h3>
            <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Current Tier: <strong className="uppercase">{tier} PLAN</strong> (0 Credits Remaining)
            </p>
          </div>
        </div>

        <div
          className={`p-4 border mb-6 text-xs font-mono space-y-2 ${
            isLight ? 'bg-rose-50/80 border-rose-200 text-slate-800' : 'bg-rose-950/30 border-rose-900/50 text-zinc-300'
          }`}
        >
          <p className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            Anti-Hallucination Pipeline Paused
          </p>
          <p className="leading-relaxed">
            You have used all available credits for your current plan. To protect computational resources and maintain high-fidelity LLM outputs, additional pipeline executions require a credit refill or plan upgrade.
          </p>
        </div>

        {/* Quick Action Options */}
        <div className="space-y-3 font-mono text-xs">
          <button
            onClick={handleUpgradeToPro}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider border border-blue-400 flex items-center justify-between cursor-pointer shadow-lg shadow-blue-600/30"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Upgrade to Pro Plan (50 Credits / $19)</span>
            </div>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleRefillTen}
            className={`w-full py-2.5 px-4 font-bold uppercase tracking-wider border flex items-center justify-between cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
            }`}
          >
            <span>Quick Refill +10 Credits ($5)</span>
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          </button>

          <button
            onClick={handleOpenFullSubscriptionModal}
            className={`w-full text-center py-2 underline cursor-pointer text-xs ${
              isLight ? 'text-slate-600 hover:text-slate-900' : 'text-zinc-400 hover:text-white'
            }`}
          >
            View All Subscription Plans & Enterprise Options →
          </button>
        </div>
      </div>
    </div>
  );
};
