import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Crown,
  History,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X,
  Plus,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useCredit } from '../context/CreditContext';
import { useAuth } from '../context/AuthContext';
import { SubscriptionTierType } from '../types';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
  initialTab?: 'plans' | 'refill' | 'history';
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  initialTab = 'plans',
}) => {
  const isLight = theme === 'light';
  const { currentUser } = useAuth();
  const {
    tier,
    creditsRemaining,
    monthlyAllowance,
    billingCycleEnd,
    usageHistory,
    resetCreditsToAllowance,
  } = useCredit();

  const [activeTab, setActiveTab] = useState<'plans' | 'refill' | 'history'>(initialTab);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const safeParseResponse = async (res: Response) => {
    try {
      const text = await res.text();
      if (text && text.trim()) {
        try {
          return JSON.parse(text);
        } catch (jsonErr) {
          console.warn('[SubscriptionModal] Response text was not JSON:', text.substring(0, 100));
        }
      }
    } catch (e) {
      console.warn('[SubscriptionModal] Error reading response:', e);
    }
    return null;
  };

  const handleSelectTier = async (selectedTier: SubscriptionTierType) => {
    setIsRedirecting(true);
    setErrorMessage(null);
    try {
      let data: any = null;
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier: selectedTier, email: currentUser?.email }),
        });
        data = await safeParseResponse(res);
      } catch (e) {
        console.warn('[SubscriptionModal] Server API unavailable, falling back to direct Paddle overlay:', e);
      }

      // Paddle overlay client fallback
      const paddleClientId = import.meta.env.VITE_PADDLE_CLIENT_ID || 'test_591324cc18efab286062326e9ae';
      const defaultPriceMap: Record<string, string> = {
        pro: import.meta.env.VITE_PADDLE_PRICE_ID_STARTER_MONTH || import.meta.env.VITE_PADDLE_PRICE_ID_PRO || 'pri_01kzrxs3me47mvqesrpwtxqfva',
        enterprise: import.meta.env.VITE_PADDLE_PRICE_ID_PRO_MONTH || import.meta.env.VITE_PADDLE_PRICE_ID_ENTERPRISE || 'pri_01kzv82gz6ckzbaqgx3ebbnwev',
      };

      if (paddleClientId) {
        const paddle = await initializePaddle({
          token: paddleClientId,
          environment: paddleClientId.startsWith('test_') ? 'sandbox' : 'production',
        });
        if (paddle) {
          const email = currentUser?.email || 'alex.rivera@fidelity.ai';
          const priceId = data?.priceId || defaultPriceMap[selectedTier];
          if (data?.transactionId && data.transactionId.startsWith('txn_01')) {
            paddle.Checkout.open({
              transactionId: data.transactionId,
              customer: { email },
            });
            setIsRedirecting(false);
            return;
          } else if (priceId) {
            paddle.Checkout.open({
              items: [{ priceId, quantity: 1 }],
              customer: { email },
            });
            setIsRedirecting(false);
            return;
          }
        }
      }

      const checkoutUrl = data?.url || data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      setErrorMessage(data?.error || 'Failed to generate Checkout session.');
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error initiating payment session.');
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleRefill = async (amount: number, costStr: string) => {
    setIsRedirecting(true);
    setErrorMessage(null);
    try {
      let data: any = null;
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ boosterCredits: amount, email: currentUser?.email }),
        });
        data = await safeParseResponse(res);
      } catch (e) {
        console.warn('[SubscriptionModal] Server API unavailable for refill, using Paddle client:', e);
      }

      const paddleClientId = import.meta.env.VITE_PADDLE_CLIENT_ID || 'test_591324cc18efab286062326e9ae';
      const refillPriceMap: Record<number, string> = {
        10: import.meta.env.VITE_PADDLE_PRICE_ID_REFILL_10 || 'pri_01kzryx11bd3pskmz23s7hdsn9',
        25: import.meta.env.VITE_PADDLE_PRICE_ID_REFILL_25 || 'pri_01kzrz5gnpr0b526b3aryd3j4m',
      };

      if (paddleClientId) {
        const paddle = await initializePaddle({
          token: paddleClientId,
          environment: paddleClientId.startsWith('test_') ? 'sandbox' : 'production',
        });
        if (paddle) {
          const email = currentUser?.email || 'alex.rivera@fidelity.ai';
          const priceId = data?.priceId || refillPriceMap[amount] || refillPriceMap[10];
          if (data?.transactionId && data.transactionId.startsWith('txn_01')) {
            paddle.Checkout.open({
              transactionId: data.transactionId,
              customer: { email },
            });
            setIsRedirecting(false);
            return;
          } else if (priceId) {
            paddle.Checkout.open({
              items: [{ priceId, quantity: 1 }],
              customer: { email },
            });
            setIsRedirecting(false);
            return;
          }
        }
      }

      const checkoutUrl = data?.url || data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      setErrorMessage(data?.error || 'Failed to generate Refill checkout session.');
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error initiating refill session.');
    } finally {
      setIsRedirecting(false);
    }
  };

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(billingCycleEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl border shadow-2xl overflow-hidden transition-all flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0d] border-zinc-800 text-white'
        }`}
      >
        {/* Top Header Banner */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/90 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 border border-blue-400 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-black text-base uppercase tracking-wider">
                  Credit Balance & SaaS Subscription
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${
                    tier === 'enterprise'
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : tier === 'pro'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {tier.toUpperCase()} TIER
                </span>
              </div>
              <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Standard SaaS Model: Server-side API proxying with transparent usage tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 border transition-colors cursor-pointer ${
              isLight
                ? 'hover:bg-slate-200 text-slate-600 border-slate-300'
                : 'hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Summary Bar */}
        <div
          className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 text-xs font-mono ${
            isLight ? 'bg-blue-50/60 border-blue-200 text-slate-800' : 'bg-blue-950/20 border-blue-900/50 text-zinc-200'
          }`}
        >
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-600 dark:text-zinc-400 block text-[10px] uppercase font-bold">
                Current Credit Balance
              </span>
              <span className="font-bold text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Zap className="w-4 h-4 fill-current text-amber-400" />
                {tier === 'enterprise' ? 'Unlimited (∞)' : `${creditsRemaining} / ${monthlyAllowance} Credits`}
              </span>
            </div>

            <div className="h-8 w-px bg-slate-300 dark:bg-zinc-800 hidden sm:block" />

            <div>
              <span className="text-slate-600 dark:text-zinc-400 block text-[10px] uppercase font-bold">
                Billing Cycle
              </span>
              <span className="font-bold">
                {tier === 'free' ? 'Lifetime Free Trial' : `${daysRemaining} days remaining`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-3 py-1.5 font-bold uppercase border transition-all cursor-pointer ${
                activeTab === 'plans'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isLight
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              Subscription Tiers
            </button>
            <button
              onClick={() => setActiveTab('refill')}
              className={`px-3 py-1.5 font-bold uppercase border transition-all cursor-pointer ${
                activeTab === 'refill'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isLight
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              Refill Credits
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 font-bold uppercase border transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isLight
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              Usage Log
            </button>
          </div>
        </div>

        {/* Redirecting or Error Banners */}
        {isRedirecting && (
          <div className="px-6 py-2.5 bg-blue-600 text-white font-mono text-xs font-bold flex items-center gap-2 border-b border-blue-500 animate-in fade-in">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Redirecting to Official Stripe Checkout... Please wait.</span>
          </div>
        )}

        {errorMessage && (
          <div className="px-6 py-2.5 bg-rose-600 text-white font-mono text-xs font-bold flex items-center gap-2 border-b border-rose-500 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Main Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: SUBSCRIPTION PLANS */}
          {activeTab === 'plans' && (
            <div>
              <div className="text-center max-w-xl mx-auto mb-6">
                <h2 className="text-xl font-black font-mono uppercase tracking-wider">
                  Choose Your Subscription Tier
                </h2>
                <p className={`text-xs font-mono mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  We cover all backend LLM API compute costs. You enjoy frictionless anti-hallucination resume pipelines with simple credit management.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* FREE TRIAL TIER */}
                <div
                  className={`p-5 border transition-all relative flex flex-col justify-between ${
                    tier === 'free'
                      ? isLight
                        ? 'bg-slate-50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-zinc-900 border-blue-500 ring-2 ring-blue-500/20'
                      : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-[#0e0e11] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {tier === 'free' && (
                    <span className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-mono font-bold uppercase px-2 py-0.5 border border-blue-400">
                      Current Active
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-black text-sm uppercase">Free Trial</span>
                      <Zap className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="font-mono text-2xl font-black mb-1">
                      $0 <span className="text-xs font-normal text-slate-600 dark:text-zinc-400">/ forever</span>
                    </div>
                    <p className={`text-xs font-mono mb-4 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      Ideal for individual applicants testing anti-hallucination resume generation.
                    </p>

                    <div className="space-y-2 text-xs font-mono border-t pt-3 border-slate-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span><strong>3 Free Credits</strong> included</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Stage 1-5 Fidelity Pipeline</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Fact Bank Inspector Tab</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Cover Letter Generator</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectTier('free')}
                    disabled={tier === 'free'}
                    className={`mt-6 w-full py-2.5 px-3 text-xs font-mono font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      tier === 'free'
                        ? 'bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-500 border-slate-300 dark:border-zinc-700 cursor-default'
                        : isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
                    }`}
                  >
                    {tier === 'free' ? 'Active Plan' : 'Select Free Plan'}
                  </button>
                </div>

                {/* PRO PLAN TIER (RECOMMENDED) */}
                <div
                  className={`p-5 border transition-all relative flex flex-col justify-between ${
                    tier === 'pro'
                      ? isLight
                        ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-500/30'
                        : 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30'
                      : isLight
                      ? 'bg-white border-blue-300 hover:border-blue-400'
                      : 'bg-[#0f121a] border-blue-900/60 hover:border-blue-700'
                  }`}
                >
                  <span className="absolute -top-3 left-4 bg-amber-500 text-black text-[10px] font-mono font-black uppercase px-2 py-0.5 border border-amber-300 shadow-sm">
                    ★ Most Popular
                  </span>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-black text-sm uppercase text-blue-600 dark:text-blue-400">
                        Pro Plan
                      </span>
                      <Crown className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="font-mono text-2xl font-black mb-1">
                      $19 <span className="text-xs font-normal text-slate-600 dark:text-zinc-400">/ month</span>
                    </div>
                    <p className={`text-xs font-mono mb-4 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      For active job hunters & agency recruiters who need high-volume tailored resumes.
                    </p>

                    <div className="space-y-2 text-xs font-mono border-t pt-3 border-slate-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span><strong>50 Credits / month</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>All Free features included</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>B2B Uniqueness & Anti-Cloning Audit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Batch Candidate Processing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Priority AI Compute Queue</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectTier('pro')}
                    disabled={isRedirecting}
                    className={`mt-6 w-full py-2.5 px-3 text-xs font-mono font-black uppercase tracking-wider border transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                      tier === 'pro'
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400'
                    }`}
                  >
                    {isRedirecting ? 'Redirecting to Stripe...' : tier === 'pro' ? 'Refill Pro Credits (50)' : 'Upgrade to Pro ($19)'}
                  </button>
                </div>

                {/* ENTERPRISE TIER */}
                <div
                  className={`p-5 border transition-all relative flex flex-col justify-between ${
                    tier === 'enterprise'
                      ? isLight
                        ? 'bg-purple-50 border-purple-600 ring-2 ring-purple-500/30'
                        : 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30'
                      : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-[#0e0e11] border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {tier === 'enterprise' && (
                    <span className="absolute -top-3 left-4 bg-purple-600 text-white text-[10px] font-mono font-bold uppercase px-2 py-0.5 border border-purple-400">
                      Current Active
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-black text-sm uppercase text-purple-600 dark:text-purple-400">
                        Enterprise
                      </span>
                      <ShieldCheck className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="font-mono text-2xl font-black mb-1">
                      $199 <span className="text-xs font-normal text-slate-600 dark:text-zinc-400">/ month</span>
                    </div>
                    <p className={`text-xs font-mono mb-4 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      For recruitment agencies, HR enterprise tools, and multi-user teams.
                    </p>

                    <div className="space-y-2 text-xs font-mono border-t pt-3 border-slate-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span><strong>UNLIMITED Credits (∞)</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Dedicated Custom LLM Prompts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Bulk Zip / JSON Export</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>REST API & Webhooks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>24/7 Dedicated Account Lead</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectTier('enterprise')}
                    disabled={isRedirecting}
                    className={`mt-6 w-full py-2.5 px-3 text-xs font-mono font-black uppercase tracking-wider border transition-all cursor-pointer disabled:opacity-50 ${
                      tier === 'enterprise'
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400'
                    }`}
                  >
                    {isRedirecting ? 'Redirecting to Stripe...' : tier === 'enterprise' ? 'Active Enterprise Plan' : 'Get Enterprise ($199)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREDIT REFILL BOOSTERS */}
          {activeTab === 'refill' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-black font-mono uppercase tracking-wider">
                  Top-Up Credit Boosters
                </h3>
                <p className={`text-xs font-mono mt-1 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Need extra pipeline runs without upgrading your monthly subscription? Purchase instant credit refills.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className={`p-5 border flex flex-col justify-between ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-black text-sm uppercase">Mini Refill Pack</span>
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mb-1">
                      +10 Credits
                    </div>
                    <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      Cost: $5.00 ($0.50 / credit). Never expires.
                    </p>
                  </div>

                  <button
                    onClick={() => handleRefill(10, '$5.00')}
                    disabled={isRedirecting}
                    className="mt-6 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-black uppercase tracking-wider border border-blue-400 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {isRedirecting ? 'Redirecting...' : 'Add 10 Credits ($5)'}
                  </button>
                </div>

                <div
                  className={`p-5 border flex flex-col justify-between ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-black text-sm uppercase">Pro Refill Pack</span>
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mb-1">
                      +25 Credits
                    </div>
                    <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      Cost: $10.00 ($0.40 / credit). Save 20%.
                    </p>
                  </div>

                  <button
                    onClick={() => handleRefill(25, '$10.00')}
                    disabled={isRedirecting}
                    className="mt-6 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-black uppercase tracking-wider border border-blue-400 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    {isRedirecting ? 'Redirecting...' : 'Add 25 Credits ($10)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USAGE AUDIT TRAIL LOG */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black font-mono uppercase tracking-wider">
                    Credit Consumption & Billing Audit Trail
                  </h3>
                  <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Real-time ledger of AI processing runs, deductions, and refills.
                  </p>
                </div>

                <button
                  onClick={resetCreditsToAllowance}
                  className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border flex items-center gap-1 cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset to Plan Max
                </button>
              </div>

              {usageHistory.length === 0 ? (
                <div
                  className={`p-8 text-center font-mono text-xs border ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  No credit transactions recorded yet. Run a pipeline to view usage logs.
                </div>
              ) : (
                <div
                  className={`border overflow-hidden ${
                    isLight ? 'border-slate-200' : 'border-zinc-800'
                  }`}
                >
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr
                        className={`border-b font-bold uppercase ${
                          isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <th className="p-3">Time</th>
                        <th className="p-3">Action Description</th>
                        <th className="p-3">Cost</th>
                        <th className="p-3 text-right">Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                      {usageHistory.map((log) => (
                        <tr
                          key={log.id}
                          className={`transition-colors ${
                            isLight ? 'hover:bg-slate-50' : 'hover:bg-zinc-900/60'
                          }`}
                        >
                          <td className={`p-3 whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                            {log.timestamp}
                          </td>
                          <td className="p-3 font-medium">{log.action}</td>
                          <td className="p-3 font-bold">
                            {log.cost > 0 ? (
                              <span className="text-amber-500">-{log.cost} Credit</span>
                            ) : (
                              <span className="text-emerald-500">Included / Refill</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold">
                            {log.remainingAfter >= 999999 ? 'Unlimited (∞)' : `${log.remainingAfter} Credits`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between text-xs font-mono ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Secure Paddle Merchant Gateway</span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 font-bold uppercase border cursor-pointer ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
