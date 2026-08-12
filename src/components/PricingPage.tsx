import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Zap,
  Shield,
  Crown,
  ArrowRight,
  ExternalLink,
  Loader2,
  Globe,
} from 'lucide-react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { useAuth } from '../context/AuthContext';
import { useCredit } from '../context/CreditContext';

export interface Tier {
  name: 'Pro' | 'Enterprise';
  displayName: string;
  description: string;
  features: string[];
  priceId: { month: string; year: string };
  defaultPrice: { month: string; year: string };
  badge?: string;
  popular?: boolean;
}

export const TIERS: Tier[] = [
  {
    name: 'Pro',
    displayName: 'PRO PLAN',
    description: 'For active job hunters & agency recruiters who need high-volume tailored resumes.',
    badge: '★ MOST POPULAR',
    popular: true,
    features: [
      '50 Credits / month',
      'All Free features included',
      'B2B Uniqueness & Anti-Cloning Audit',
      'Batch Candidate Processing',
      'Priority AI Compute Queue',
    ],
    priceId: {
      month: import.meta.env.VITE_PADDLE_PRICE_ID_STARTER_MONTH || 'pri_01kzrxs3me47mvqesrpwtxqfva',
      year: import.meta.env.VITE_PADDLE_PRICE_ID_STARTER_YEAR || 'pri_01kzryhfyess9xnnv63kezzr9n',
    },
    defaultPrice: {
      month: '$19',
      year: '$190',
    },
  },
  {
    name: 'Enterprise',
    displayName: 'ENTERPRISE',
    description: 'For recruitment agencies, HR enterprise tools, and multi-user teams.',
    features: [
      'UNLIMITED Credits (∞)',
      'Dedicated Custom LLM Prompts',
      'Bulk Zip / JSON Export',
      'REST API & Webhooks',
      '24/7 Dedicated Account Lead',
    ],
    priceId: {
      month: import.meta.env.VITE_PADDLE_PRICE_ID_PRO_MONTH || 'pri_01kzv82gz6ckzbaqgx3ebbnwev',
      year: import.meta.env.VITE_PADDLE_PRICE_ID_PRO_YEAR || 'pri_01kzv82gz6ckzbaqgx3ebbnwev',
    },
    defaultPrice: {
      month: '$199',
      year: '$1,990',
    },
  },
];

interface PricePreviewData {
  [priceId: string]: {
    formattedTotal: string;
    currencyCode: string;
  };
}

export const PricingPage: React.FC<{ onNavigateToDashboard?: () => void }> = ({
  onNavigateToDashboard,
}) => {
  const { currentUser } = useAuth();
  const { tier, refreshCredits } = useCredit();

  const [isYearly, setIsYearly] = useState(false);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [prices, setPrices] = useState<PricePreviewData>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [openingCheckoutPriceId, setOpeningCheckoutPriceId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch user's country code from server headers
  useEffect(() => {
    async function fetchCountry() {
      try {
        const res = await fetch('/api/user/country');
        if (res.ok) {
          const data = await res.json();
          if (data?.countryCode && data.countryCode.length === 2 && data.countryCode !== 'OTHERS') {
            setCountryCode(data.countryCode);
          } else {
            setCountryCode(null);
          }
        }
      } catch (err) {
        console.warn('[PricingPage] Could not fetch server country code:', err);
        setCountryCode(null);
      }
    }
    fetchCountry();
  }, []);

  // 2. Initialize Paddle JS SDK
  useEffect(() => {
    async function initPaddleSDK() {
      const token =
        import.meta.env.VITE_PADDLE_CLIENT_TOKEN ||
        import.meta.env.VITE_PADDLE_CLIENT_ID ||
        'test_591324cc18efab286062326e9ae';

      const env = import.meta.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';

      try {
        const instance = await initializePaddle({
          token,
          environment: env === 'sandbox' ? 'sandbox' : 'production',
          eventCallback: (event) => {
            if (event.name === 'checkout.completed') {
              refreshCredits();
              window.location.href = '/welcome';
            }
          },
        });
        if (instance) {
          setPaddle(instance);
        }
      } catch (err) {
        console.warn('[PricingPage] Paddle initialization notice:', err);
      }
    }
    initPaddleSDK();
  }, [refreshCredits]);

  // 3. Fetch Localized Price Preview via Paddle.PricePreview()
  useEffect(() => {
    if (!paddle) return;

    async function loadPrices() {
      setIsLoadingPrices(true);
      setErrorMsg(null);

      const allPriceIds = TIERS.flatMap((t) => [t.priceId.month, t.priceId.year]);
      const uniqueIds = Array.from(new Set(allPriceIds));

      try {
        const items = uniqueIds.map((id) => ({ priceId: id, quantity: 1 }));

        const previewReq: any = { items };
        if (countryCode) {
          previewReq.address = { countryCode };
        }

        const result = await paddle.PricePreview(previewReq);

        const priceMap: PricePreviewData = {};

        if (result?.data?.details?.lineItems) {
          for (const item of result.data.details.lineItems as any[]) {
            const pId = item.price?.id || item.priceId;
            const formattedTotal =
              item.formattedTotals?.grandTotal ||
              item.formattedTotals?.subtotal ||
              item.formattedTotals?.total ||
              item.price?.unitPrice?.formatted ||
              item.price?.unitPrice;

            if (pId && formattedTotal) {
              priceMap[pId] = {
                formattedTotal: typeof formattedTotal === 'string' ? formattedTotal : String(formattedTotal),
                currencyCode: item.price?.currencyCode || 'USD',
              };
            }
          }
        }

        setPrices(priceMap);
      } catch (err: any) {
        console.warn('[PricingPage] PricePreview notice:', err?.message || err);
      } finally {
        setIsLoadingPrices(false);
      }
    }

    loadPrices();
  }, [paddle, countryCode]);

  // 4. Handle Subscribe Click via Paddle.Checkout.open()
  const handleSubscribe = async (tierObj: Tier) => {
    const selectedPriceId = isYearly ? tierObj.priceId.year : tierObj.priceId.month;
    setOpeningCheckoutPriceId(selectedPriceId);
    setErrorMsg(null);

    const email = currentUser?.email || 'alex.rivera@fidelity.ai';

    if (paddle) {
      try {
        paddle.Checkout.open({
          settings: {
            displayMode: 'overlay',
            variant: 'one-page',
            successUrl: `${window.location.origin}/welcome`,
          },
          items: [{ priceId: selectedPriceId, quantity: 1 }],
          customer: email ? { email } : undefined,
          customData: {
            email,
            tier: tierObj.name.toLowerCase(),
          },
        });
      } catch (err: any) {
        console.error('[PricingPage] Checkout open error:', err);
        setErrorMsg(err?.message || 'Failed to open Paddle Checkout');
      } finally {
        setOpeningCheckoutPriceId(null);
      }
    } else {
      try {
        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tier: tierObj.name.toLowerCase(),
            email,
          }),
        });
        const data = await res.json();
        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          window.location.href = '/welcome';
        }
      } catch (err: any) {
        setErrorMsg('Error initiating checkout session.');
      } finally {
        setOpeningCheckoutPriceId(null);
      }
    }
  };

  // 5. Customer Portal Session Minting
  const handleOpenCustomerPortal = async () => {
    setPortalLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/paddle/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || 'alex.rivera@fidelity.ai',
        },
        body: JSON.stringify({ email: currentUser?.email }),
      });
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg(data?.error || 'Unable to open Customer Portal session');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error connecting to Customer Portal');
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-white font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
            <span>Paddle Merchant Integration Gateway</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black font-mono tracking-tight uppercase">
            SaaS Subscription Tiers
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 font-mono leading-relaxed">
            We cover all backend LLM API compute costs. You enjoy frictionless anti-hallucination resume pipelines with simple credit management.
          </p>

          {/* Location Auto-Detection Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-zinc-400">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>
              Location:{' '}
              <strong className="text-white">
                {countryCode ? `${countryCode} (Detected)` : 'Auto-detected via Visitor IP'}
              </strong>
            </span>
          </div>

          {/* Monthly / Yearly Billing Toggle */}
          <div className="pt-4 flex items-center justify-center gap-4">
            <span className={`text-xs font-mono font-bold uppercase ${!isYearly ? 'text-white' : 'text-zinc-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className="relative w-14 h-7 bg-zinc-800 border border-zinc-700 p-1 transition-colors cursor-pointer focus:outline-none"
            >
              <div
                className={`w-5 h-5 bg-blue-500 transition-transform ${
                  isYearly ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold uppercase ${isYearly ? 'text-white' : 'text-zinc-500'}`}>
                Yearly
              </span>
              <span className="text-[10px] font-mono font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5">
                Save 20%
              </span>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mt-6 max-w-xl mx-auto p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-mono font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* Tiers Grid matching exact screenshot design: Free Trial + Pro Plan + Enterprise */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* 1. FREE TRIAL TIER */}
          <div className="relative flex flex-col justify-between p-6 bg-[#0e111a] border border-zinc-800 hover:border-zinc-700 transition-all">
            {tier === 'free' && (
              <div className="absolute -top-3 left-6 bg-blue-600 text-white font-mono font-black text-[10px] uppercase px-3 py-0.5 border border-blue-400">
                CURRENT ACTIVE
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black font-mono uppercase tracking-wider text-white">FREE TRIAL</h3>
                <Zap className="w-5 h-5 text-zinc-400" />
              </div>

              <div className="mt-4 font-mono flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">$0</span>
                <span className="text-xs font-mono text-zinc-400">/ forever</span>
              </div>

              <p className="mt-2 text-xs font-mono text-zinc-400 min-h-[36px]">
                Ideal for individual applicants testing anti-hallucination resume generation.
              </p>

              {/* Feature Checklist */}
              <div className="mt-6 pt-6 border-t border-zinc-800 space-y-3">
                <div className="flex items-start gap-2.5 text-xs font-mono text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>3 Free Credits</strong> included</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs font-mono text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Stage 1-5 Fidelity Pipeline</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs font-mono text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Fact Bank Inspector Tab</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs font-mono text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Cover Letter Generator</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                disabled
                className="w-full py-3 px-4 text-xs font-mono font-black uppercase tracking-wider border transition-all bg-zinc-800 text-zinc-400 border-zinc-700 cursor-default flex items-center justify-center gap-2"
              >
                <span>{tier === 'free' ? 'ACTIVE PLAN' : 'FREE TIER'}</span>
              </button>
            </div>
          </div>

          {/* PAID TIERS: PRO PLAN & ENTERPRISE PLAN */}
          {TIERS.map((tierObj) => {
            const priceId = isYearly ? tierObj.priceId.year : tierObj.priceId.month;
            const previewPrice = prices[priceId]?.formattedTotal;
            const isCurrentTier = tier === tierObj.name.toLowerCase();

            return (
              <div
                key={tierObj.name}
                className={`relative flex flex-col justify-between p-6 bg-[#0e111a] border transition-all ${
                  tierObj.popular
                    ? 'border-blue-500/80 ring-2 ring-blue-500/20 shadow-2xl shadow-blue-500/10'
                    : 'border-purple-900/50 hover:border-purple-700'
                }`}
              >
                {/* Badge if present */}
                {tierObj.badge && (
                  <div className="absolute -top-3 left-6 bg-amber-400 text-black font-mono font-black text-[10px] uppercase px-3 py-0.5 border border-amber-300">
                    {tierObj.badge}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-black font-mono uppercase tracking-wider ${
                      tierObj.name === 'Pro' ? 'text-blue-400' : 'text-purple-400'
                    }`}>
                      {tierObj.displayName}
                    </h3>
                    {tierObj.name === 'Pro' ? (
                      <Crown className="w-5 h-5 text-amber-400" />
                    ) : (
                      <Shield className="w-5 h-5 text-purple-400" />
                    )}
                  </div>

                  {/* Price Display */}
                  <div className="mt-4 font-mono">
                    {isLoadingPrices ? (
                      <div className="flex items-center gap-2 text-zinc-500 text-sm py-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Fetching Paddle pricing...</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">
                          {previewPrice || (isYearly ? tierObj.defaultPrice.year : tierObj.defaultPrice.month)}
                        </span>
                        <span className="text-xs font-mono text-zinc-400">
                          {isYearly ? ' / year' : ' / month'}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-xs font-mono text-zinc-400 min-h-[36px]">{tierObj.description}</p>

                  {/* Feature Checklist */}
                  <div className="mt-6 pt-6 border-t border-zinc-800 space-y-3">
                    {tierObj.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs font-mono text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subscribe Button */}
                <div className="mt-8 pt-4">
                  <button
                    onClick={() => handleSubscribe(tierObj)}
                    disabled={openingCheckoutPriceId === priceId}
                    className={`w-full py-3 px-4 text-xs font-mono font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      tierObj.name === 'Pro'
                        ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-lg shadow-blue-600/30'
                        : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-600/30'
                    }`}
                  >
                    {openingCheckoutPriceId === priceId ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opening Paddle Checkout...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {isCurrentTier
                            ? 'CURRENT ACTIVE PLAN'
                            : tierObj.name === 'Pro'
                            ? `UPGRADE TO PRO (${previewPrice || (isYearly ? '$190' : '$19')})`
                            : `GET ENTERPRISE (${previewPrice || (isYearly ? '$1,990' : '$199')})`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Self-Service Customer Portal Section */}
        <div className="mt-16 max-w-2xl mx-auto p-6 bg-[#0e111a] border border-zinc-800 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-xs font-bold uppercase">
            <Shield className="w-3.5 h-3.5" />
            <span>Self-Service Billing Management</span>
          </div>

          <h3 className="text-lg font-black font-mono uppercase">Already a Subscriber?</h3>

          <p className="text-xs font-mono text-zinc-400">
            Manage your Paddle subscription, update payment methods, download VAT invoices, or modify plan options directly through the official Paddle Customer Portal.
          </p>

          <button
            onClick={handleOpenCustomerPortal}
            disabled={portalLoading}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold uppercase tracking-wider border border-purple-400 cursor-pointer disabled:opacity-50"
          >
            {portalLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Portal Session...</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                <span>Open Paddle Customer Portal</span>
              </>
            )}
          </button>
        </div>

        {/* Return to Dashboard Footer Link */}
        {onNavigateToDashboard && (
          <div className="mt-8 text-center">
            <button
              onClick={onNavigateToDashboard}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
            >
              ← Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
