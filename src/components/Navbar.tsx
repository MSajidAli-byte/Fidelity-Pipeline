import React from 'react';
import { ShieldCheck, Layers, GitCompare, Database, Sparkles, FileSearch, Sun, Moon, Zap, Crown, ShieldAlert, Sliders } from 'lucide-react';
import { BENCHMARK_PRESETS } from '../data/presets';
import { ScenarioPreset } from '../types';
import { useCredit } from '../context/CreditContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { useTelemetry } from '../context/TelemetryContext';
import { UserProfileDropdown } from './UserProfileDropdown';

interface NavbarProps {
  activeTab: 'pipeline' | 'auditor' | 'uniqueness' | 'factbank' | 'pricing';
  setActiveTab: (tab: 'pipeline' | 'auditor' | 'uniqueness' | 'factbank' | 'pricing') => void;
  selectedPreset: ScenarioPreset | null;
  onSelectPreset: (preset: ScenarioPreset) => void;
  isRunning: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  selectedPreset,
  onSelectPreset,
  isRunning,
  theme,
  onToggleTheme,
}) => {
  const isLight = theme === 'light';
  const { tier, creditsRemaining, monthlyAllowance, setIsUpgradeModalOpen } = useCredit();
  const { activeKillSwitchCount, setIsAdminModalOpen } = useFeatureFlags();
  const { metrics } = useTelemetry();


  return (
    <header
      className={`sticky top-0 z-50 w-full backdrop-blur-md border-b transition-colors shadow-sm ${
        isLight
          ? 'bg-white/95 border-slate-200 text-slate-900'
          : 'bg-[#050505]/95 border-zinc-800 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-2.5 md:py-0 md:h-16 gap-3">
          {/* Brand Logo & Title */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 border border-blue-400 flex items-center justify-center shadow-md shadow-blue-600/30 shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`font-black text-base md:text-lg tracking-wider uppercase font-mono ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    Fidelity Pipeline
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest uppercase border ${
                      isLight
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                    }`}
                  >
                    B2B Engine v2.4
                  </span>
                </div>
                <p
                  className={`text-[11px] font-mono tracking-tight hidden sm:block ${
                    isLight ? 'text-slate-500' : 'text-zinc-400'
                  }`}
                >
                  Anti-Hallucination & Anti-Cloning Resume Infrastructure
                </p>
              </div>
            </div>

            {/* Mobile Controls: Credit Badge & Theme Toggle */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className={`px-2.5 py-1 border text-xs font-mono font-bold flex items-center gap-1 cursor-pointer ${
                  creditsRemaining <= 0 && tier !== 'enterprise'
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-500'
                    : isLight
                    ? 'bg-blue-50 border-blue-200 text-blue-800'
                    : 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{tier === 'enterprise' ? '∞' : `${creditsRemaining}`}</span>
              </button>

              <button
                onClick={onToggleTheme}
                title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                className={`p-2 border transition-colors flex items-center justify-center cursor-pointer font-mono text-xs ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    : 'bg-[#0a0a0c] border-zinc-800 text-zinc-300 hover:text-white'
                }`}
              >
                {isLight ? (
                  <Moon className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Scrollable on small screens if needed) */}
          <div className="overflow-x-auto scrollbar-none py-1 -mx-4 px-4 md:mx-0 md:px-0">
            <nav
              className={`inline-flex items-center gap-1 p-1 border font-mono ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'
              }`}
            >
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'pipeline'
                    ? 'bg-blue-600 !text-white border border-blue-400 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                4-Stage Pipeline
              </button>

              <button
                onClick={() => setActiveTab('auditor')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'auditor'
                    ? 'bg-blue-600 !text-white border border-blue-400 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <FileSearch className="w-3.5 h-3.5" />
                Resume Auditor
              </button>

              <button
                onClick={() => setActiveTab('uniqueness')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'uniqueness'
                    ? 'bg-blue-600 !text-white border border-blue-400 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                Uniqueness Lab
              </button>

              <button
                onClick={() => setActiveTab('factbank')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'factbank'
                    ? 'bg-blue-600 !text-white border border-blue-400 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Fact Bank DB
              </button>

              <button
                onClick={() => setActiveTab('pricing')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'pricing'
                    ? 'bg-blue-600 !text-white border border-blue-400 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Pricing Plans
              </button>
            </nav>
          </div>

          {/* Controls: Preset Selector, Credit Badge, Desktop Theme Toggle & User Profile Dropdown */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Credit Balance & Plan Badge Button */}
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              title="Click to view Credit Balance & SaaS Subscription Tiers"
              className={`flex items-center gap-2 px-3 py-1.5 border font-mono text-xs transition-all cursor-pointer shadow-sm ${
                creditsRemaining <= 0 && tier !== 'enterprise'
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-500 animate-pulse'
                  : isLight
                  ? 'bg-blue-50/80 border-blue-200 text-blue-900 hover:bg-blue-100'
                  : 'bg-blue-950/40 border-blue-800/60 text-blue-200 hover:bg-blue-900/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <div className="flex items-center gap-1.5 font-bold">
                <span>
                  {tier === 'enterprise' ? 'Unlimited (∞)' : `${creditsRemaining} / ${monthlyAllowance}`}
                </span>
                <span
                  className={`text-[9px] uppercase font-black px-1.5 py-0.2 border ${
                    tier === 'enterprise'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-400/40'
                      : tier === 'pro'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-400/40'
                      : 'bg-amber-500/20 text-amber-400 border-amber-400/40'
                  }`}
                >
                  {tier.toUpperCase()}
                </span>
              </div>
            </button>

            <div
              title={selectedPreset?.title || 'Select Benchmark Preset'}
              className={`flex items-center gap-2 px-3 py-1.5 border font-mono text-xs rounded-sm ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span
                className={`hidden lg:inline font-bold uppercase tracking-wider shrink-0 ${
                  isLight ? 'text-slate-500' : 'text-zinc-400'
                }`}
              >
                Preset:
              </span>
              <select
                disabled={isRunning}
                value={selectedPreset?.id || ''}
                title={selectedPreset?.title || 'Select Benchmark Preset'}
                onChange={(e) => {
                  const preset = BENCHMARK_PRESETS.find((p) => p.id === e.target.value);
                  if (preset) onSelectPreset(preset);
                }}
                className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer border-none py-0 pr-1 uppercase max-w-[160px] sm:max-w-[220px] md:max-w-[280px] truncate ${
                  isLight ? 'text-slate-800' : 'text-white'
                }`}
              >
                {BENCHMARK_PRESETS.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    title={p.title}
                    className={isLight ? 'bg-white text-slate-900 font-bold' : 'bg-[#0a0a0c] text-white font-bold'}
                  >
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className={`p-2 border transition-colors hidden md:flex items-center justify-center cursor-pointer font-mono text-xs ${
                isLight
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'bg-[#0a0a0c] border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              {isLight ? (
                <Moon className="w-4 h-4 text-indigo-600" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* User Profile / Account Dropdown containing RBAC System Administration */}
            <UserProfileDropdown theme={theme} />
          </div>

        </div>
      </div>
    </header>
  );
};


