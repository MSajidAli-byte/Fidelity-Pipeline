import React, { createContext, useContext, useState, useEffect } from 'react';
import { SubscriptionTierType, CreditUsageLog } from '../types';

interface CreditContextType {
  tier: SubscriptionTierType;
  creditsRemaining: number;
  monthlyAllowance: number;
  billingCycleEnd: string;
  usageHistory: CreditUsageLog[];
  isOutOfCredits: boolean;
  
  // Actions
  consumeCredits: (amount?: number, actionName?: string) => boolean;
  upgradeTier: (newTier: SubscriptionTierType) => void;
  refillCredits: (amount: number) => void;
  resetCreditsToAllowance: () => void;
  syncUserCredits: (userData: { tier?: SubscriptionTierType; creditsRemaining?: number }) => void;
  refreshCredits: () => Promise<void>;
  
  // Modals
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
  isOutOfCreditsModalOpen: boolean;
  setIsOutOfCreditsModalOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'fidelity_subscription_data_v2';

const TIER_ALLOWANCES: Record<SubscriptionTierType, number> = {
  free: 3,
  pro: 50,
  enterprise: 999999, // unlimited
};

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export const CreditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tier, setTier] = useState<SubscriptionTierType>('free');
  const [creditsRemaining, setCreditsRemaining] = useState<number>(3);
  const [monthlyAllowance, setMonthlyAllowance] = useState<number>(3);
  const [billingCycleEnd, setBillingCycleEnd] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString();
  });
  const [usageHistory, setUsageHistory] = useState<CreditUsageLog[]>([]);

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [isOutOfCreditsModalOpen, setIsOutOfCreditsModalOpen] = useState<boolean>(false);

  const refreshCredits = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          if (data.user.tier) setTier(data.user.tier);
          if (typeof data.user.creditsRemaining === 'number') setCreditsRemaining(data.user.creditsRemaining);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh user credit profile:', err);
    }
  };

  // Sync with backend profile DB on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tier) setTier(parsed.tier);
        if (typeof parsed.creditsRemaining === 'number') setCreditsRemaining(parsed.creditsRemaining);
        if (typeof parsed.monthlyAllowance === 'number') setMonthlyAllowance(parsed.monthlyAllowance);
        if (parsed.billingCycleEnd) setBillingCycleEnd(parsed.billingCycleEnd);
        if (Array.isArray(parsed.usageHistory)) setUsageHistory(parsed.usageHistory);
      }
    } catch (e) {
      console.error('Failed to load subscription data:', e);
    }

    refreshCredits();
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      const data = {
        tier,
        creditsRemaining,
        monthlyAllowance,
        billingCycleEnd,
        usageHistory,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save subscription data:', e);
    }
  }, [tier, creditsRemaining, monthlyAllowance, billingCycleEnd, usageHistory]);

  const isOutOfCredits = tier !== 'enterprise' && creditsRemaining <= 0;

  const consumeCredits = (amount: number = 1, actionName: string = 'Pipeline Execution'): boolean => {
    if (tier === 'enterprise') {
      // Enterprise has unlimited credits
      const log: CreditUsageLog = {
        id: 'log_' + Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: actionName,
        cost: 0,
        remainingAfter: 999999,
      };
      setUsageHistory((prev) => [log, ...prev].slice(0, 50));
      return true;
    }

    if (creditsRemaining < amount) {
      setIsOutOfCreditsModalOpen(true);
      return false;
    }

    const nextRemaining = creditsRemaining - amount;
    setCreditsRemaining(nextRemaining);

    // Sync with backend DB
    fetch('/api/user/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: -amount, action: actionName }),
    }).catch((err) => console.warn('Failed to sync credit deduction to backend DB:', err));

    const log: CreditUsageLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      action: actionName,
      cost: amount,
      remainingAfter: nextRemaining,
    };
    setUsageHistory((prev) => [log, ...prev].slice(0, 50));

    if (nextRemaining <= 0) {
      // Show warning modal if now out of credits
      setTimeout(() => {
        setIsOutOfCreditsModalOpen(true);
      }, 500);
    }

    return true;
  };

  const upgradeTier = (newTier: SubscriptionTierType) => {
    const allowance = TIER_ALLOWANCES[newTier];
    setTier(newTier);
    setMonthlyAllowance(allowance);
    setCreditsRemaining(allowance);

    const d = new Date();
    d.setDate(d.getDate() + 30);
    setBillingCycleEnd(d.toISOString());

    const log: CreditUsageLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      action: `Plan Upgrade to ${newTier.toUpperCase()}`,
      cost: 0,
      remainingAfter: allowance,
    };
    setUsageHistory((prev) => [log, ...prev].slice(0, 50));

    setIsOutOfCreditsModalOpen(false);
  };

  const refillCredits = (amount: number) => {
    setCreditsRemaining((prev) => prev + amount);

    const log: CreditUsageLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      action: `Refill +${amount} Credits Booster`,
      cost: 0,
      remainingAfter: creditsRemaining + amount,
    };
    setUsageHistory((prev) => [log, ...prev].slice(0, 50));

    setIsOutOfCreditsModalOpen(false);
  };

  const resetCreditsToAllowance = () => {
    const allowance = TIER_ALLOWANCES[tier];
    setCreditsRemaining(allowance);
  };

  const syncUserCredits = (userData: { tier?: SubscriptionTierType; creditsRemaining?: number }) => {
    if (userData.tier) {
      setTier(userData.tier);
      setMonthlyAllowance(TIER_ALLOWANCES[userData.tier] || 3);
    }
    if (typeof userData.creditsRemaining === 'number') {
      setCreditsRemaining(userData.creditsRemaining);
    }
    setIsOutOfCreditsModalOpen(false);
  };

  return (
    <CreditContext.Provider
      value={{
        tier,
        creditsRemaining,
        monthlyAllowance,
        billingCycleEnd,
        usageHistory,
        isOutOfCredits,
        consumeCredits,
        upgradeTier,
        refillCredits,
        resetCreditsToAllowance,
        syncUserCredits,
        refreshCredits,
        isUpgradeModalOpen,
        setIsUpgradeModalOpen,
        isOutOfCreditsModalOpen,
        setIsOutOfCreditsModalOpen,
      }}
    >
      {children}
    </CreditContext.Provider>
  );
};

export const useCredit = () => {
  const context = useContext(CreditContext);
  if (!context) {
    throw new Error('useCredit must be used within a CreditProvider');
  }
  return context;
};
