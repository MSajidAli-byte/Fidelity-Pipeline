import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Activity,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  Trash2,
  RefreshCw,
  X,
  Zap,
  Radio,
  FileCode,
  Sliders,
  Filter,
  Coins,
  Plus,
  Minus,
  Users,
} from 'lucide-react';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { useTelemetry } from '../context/TelemetryContext';
import { useAuth } from '../context/AuthContext';
import { FeatureFlagKey, LogSeverity } from '../types';

interface AdminControlPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const AdminControlPanelModal: React.FC<AdminControlPanelModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const { isAdmin } = useAuth();
  const {
    flags,
    toggleFlag,
    setMaintenanceNotice,
    resetAllFlags,
    activeKillSwitchCount,
  } = useFeatureFlags();

  const {
    logs,
    metrics,
    triggerSimulatedError,
    clearLogs,
  } = useTelemetry();

  const [activeTab, setActiveTab] = useState<'flags' | 'telemetry' | 'credits'>('flags');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | LogSeverity>('ALL');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // Credit Management State
  const [usersList, setUsersList] = useState<any[]>([]);
  const [creditLedger, setCreditLedger] = useState<any[]>([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('alex.rivera@fidelity.ai');
  const [adjustAmount, setAdjustAmount] = useState<number>(5);
  const [actionReason, setActionReason] = useState<string>('ADMIN_MANUAL_ADJUSTMENT');
  const [creditStatusMsg, setCreditStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState<boolean>(false);

  const fetchUsersAndLedger = async () => {
    setIsLoadingCredits(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUsersList(data.users);
        if (data.ledger) setCreditLedger(data.ledger);
      }
    } catch (err) {
      console.warn('Failed to fetch admin users list:', err);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin && activeTab === 'credits') {
      fetchUsersAndLedger();
    }
  }, [isOpen, isAdmin, activeTab]);

  const handleAdjustCredits = async (isDeduction: boolean) => {
    setCreditStatusMsg(null);
    const amountVal = Math.abs(Number(adjustAmount) || 1);
    const finalAmount = isDeduction ? -amountVal : amountVal;

    try {
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedUserEmail,
          amount: finalAmount,
          action: actionReason || (isDeduction ? 'ADMIN_DEDUCTION' : 'ADMIN_REFILL'),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreditStatusMsg({
          type: 'success',
          text: `Successfully ${isDeduction ? 'deducted' : 'added'} ${amountVal} credits for ${selectedUserEmail}. New Balance: ${data.user.creditsRemaining}`,
        });
        fetchUsersAndLedger();
      } else {
        setCreditStatusMsg({
          type: 'error',
          text: data.error || 'Failed to adjust user credits.',
        });
      }
    } catch (err) {
      setCreditStatusMsg({
        type: 'error',
        text: 'Server communication error during credit adjustment.',
      });
    }
  };

  // Security Gating: Only accessible if isOpen AND user is verified super_admin via AuthContext
  if (!isOpen || !isAdmin) return null;

  const filteredLogs = logs.filter((log) => {
    if (severityFilter === 'ALL') return true;
    return log.severity === severityFilter;
  });

  const handleExportTelemetryJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sentry_telemetry_dump_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const featureConfigs: { key: FeatureFlagKey; title: string; description: string }[] = [
    {
      key: 'enableCoverLetter',
      title: 'Cover Letter Generator',
      description: 'Generates tailored executive cover letters via prompt engineering. Turn OFF if LLM hallucination is detected.',
    },
    {
      key: 'enableBatchUploader',
      title: 'Batch Candidate ZIP Processing',
      description: 'Multi-resume ZIP batch ingestion. Turn OFF to reduce server memory spike during high-traffic surges.',
    },
    {
      key: 'enableUniquenessTester',
      title: 'B2B Uniqueness & Anti-Cloning Defense',
      description: 'N-Gram similarity auditor against candidate clones. Turn OFF if vector computation exceeds latency SLAs.',
    },
    {
      key: 'enableScraper',
      title: 'AI JD URL Scraper',
      description: 'Fetches external job postings via cheerio/Puppeteer proxy. Turn OFF if Cloudflare rate limits spike.',
    },
    {
      key: 'enableGapAnalysis',
      title: 'Gap Analysis & Interview Prep',
      description: 'Stage 3 JD vs Candidate discrepancy engine. Turn OFF to isolate core resume tailoring.',
    },
    {
      key: 'enablePDFExport',
      title: 'PDF Document Export Engine',
      description: 'Client-side headless print/PDF generator. Turn OFF if styling glitches are encountered.',
    },
    {
      key: 'maintenanceMode',
      title: 'System-Wide Maintenance Mode Banner',
      description: 'Locks all pipeline executions and displays a global system maintenance banner to end users.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl border shadow-2xl overflow-hidden transition-all flex flex-col max-h-[92vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#09090c] border-zinc-800 text-white'
        }`}
      >
        {/* Header Bar */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/90 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 border border-rose-400 flex items-center justify-center shadow-lg shadow-rose-600/30 shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-black text-base uppercase tracking-wider">
                  DevOps Control Tower & Emergency Kill Switches
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${
                    metrics.status === 'OPTIMAL'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : metrics.status === 'DEGRADED'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}
                >
                  SYSTEM: {metrics.status}
                </span>
              </div>
              <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                Real-World Operational Control: Zero-downtime feature toggles & Sentry/BetterStack live error logging
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

        {/* Status Dashboard Summary Bar */}
        <div
          className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-4 text-xs font-mono ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-zinc-950 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-6">
            <div>
              <span className="text-slate-500 dark:text-zinc-500 block text-[10px] uppercase font-bold">
                Active Kill Switches
              </span>
              <span className="font-bold text-amber-500 flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" />
                {activeKillSwitchCount} Disabled / Locked
              </span>
            </div>

            <div className="h-8 w-px bg-slate-300 dark:bg-zinc-800 hidden sm:block" />

            <div>
              <span className="text-slate-500 dark:text-zinc-500 block text-[10px] uppercase font-bold">
                Logged Telemetry Events
              </span>
              <span className="font-bold">{logs.length} Recorded</span>
            </div>

            <div className="h-8 w-px bg-slate-300 dark:bg-zinc-800 hidden sm:block" />

            <div>
              <span className="text-slate-500 dark:text-zinc-500 block text-[10px] uppercase font-bold">
                Error Rate
              </span>
              <span className={`font-bold ${metrics.errorRatePercentage > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {metrics.errorRatePercentage}%
              </span>
            </div>

            <div className="h-8 w-px bg-slate-300 dark:bg-zinc-800 hidden sm:block" />

            <div>
              <span className="text-slate-500 dark:text-zinc-500 block text-[10px] uppercase font-bold">
                Avg Latency
              </span>
              <span className="font-bold">{metrics.averageLatencyMs} ms</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('flags')}
              className={`px-3 py-1.5 font-bold uppercase border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'flags'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                  : isLight
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Feature Kill Switches
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1.5 font-bold uppercase border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'telemetry'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md'
                  : isLight
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Sentry / BetterStack Logs
            </button>
            <button
              onClick={() => setActiveTab('credits')}
              className={`px-3 py-1.5 font-bold uppercase border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'credits'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                  : isLight
                  ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              User & Credit Ledger
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: FEATURE FLAGS / EMERGENCY KILL SWITCHES */}
          {activeTab === 'flags' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-black font-mono uppercase tracking-wider">
                    Emergency Feature Flag Controls
                  </h3>
                  <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Flip switches instantly to disable buggy features in production without triggering a code deployment.
                  </p>
                </div>

                <button
                  onClick={resetAllFlags}
                  className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border flex items-center gap-1.5 cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset All to Active
                </button>
              </div>

              {/* Maintenance Notice Custom Input */}
              <div
                className={`p-4 border ${
                  isLight ? 'bg-amber-50/80 border-amber-200 text-slate-800' : 'bg-amber-950/20 border-amber-900/50 text-zinc-200'
                }`}
              >
                <label className="block text-xs font-mono font-bold uppercase mb-1.5 text-amber-600 dark:text-amber-400">
                  Custom Maintenance Notice Banner (Visible when features are killed)
                </label>
                <input
                  type="text"
                  value={flags.customMaintenanceNotice || ''}
                  onChange={(e) => setMaintenanceNotice(e.target.value)}
                  placeholder="e.g. This module is undergoing temporary prompt maintenance..."
                  className={`w-full p-2.5 text-xs font-mono border ${
                    isLight
                      ? 'bg-white border-amber-300 text-slate-900 focus:ring-1 focus:ring-amber-500'
                      : 'bg-[#0a0a0d] border-amber-800 text-white focus:ring-1 focus:ring-amber-500'
                  }`}
                />
              </div>

              {/* Toggle Switches List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featureConfigs.map((cfg) => {
                  const isEnabled = flags[cfg.key];

                  return (
                    <div
                      key={cfg.key}
                      className={`p-4 border transition-all flex flex-col justify-between ${
                        isEnabled
                          ? isLight
                            ? 'bg-white border-slate-200'
                            : 'bg-[#0d0d12] border-zinc-800'
                          : isLight
                          ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-300'
                          : 'bg-rose-950/20 border-rose-900/80 ring-1 ring-rose-900/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono font-black text-sm uppercase flex items-center gap-2">
                            {cfg.title}
                          </span>

                          <button
                            onClick={() => toggleFlag(cfg.key)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold uppercase border cursor-pointer transition-all ${
                              isEnabled
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                                : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-600/30'
                            }`}
                          >
                            {isEnabled ? (
                              <>
                                <ToggleRight className="w-4 h-4" />
                                Enabled
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4" />
                                KILLED
                              </>
                            )}
                          </button>
                        </div>

                        <p className={`text-xs font-mono ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                          {cfg.description}
                        </p>
                      </div>

                      {!isEnabled && (
                        <div className="mt-3 text-[11px] font-mono font-bold text-rose-500 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Feature disabled for users in live UI</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SENTRY & BETTERSTACK TELEMETRY LOGS */}
          {activeTab === 'telemetry' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black font-mono uppercase tracking-wider">
                    Sentry / BetterStack Error & Latency Telemetry
                  </h3>
                  <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Live stream of operational events, API response codes, and uncaught exception stack traces.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => triggerSimulatedError('CoverLetterGenerator')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold uppercase border border-amber-400 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Trigger Test Crash (Simulate Sentry)
                  </button>

                  <button
                    onClick={handleExportTelemetryJSON}
                    className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border flex items-center gap-1.5 cursor-pointer ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Log JSON
                  </button>

                  <button
                    onClick={clearLogs}
                    className={`p-1.5 text-xs font-mono border transition-colors cursor-pointer text-rose-500 ${
                      isLight
                        ? 'bg-rose-50 border-rose-200 hover:bg-rose-100'
                        : 'bg-rose-950/20 border-rose-900/60 hover:bg-rose-900/40'
                    }`}
                    title="Clear Log Stream"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Severity Filter Tabs */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className={`text-slate-500 dark:text-zinc-500 font-bold flex items-center gap-1`}>
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>
                {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 font-bold border uppercase transition-all cursor-pointer ${
                      severityFilter === sev
                        ? sev === 'ERROR'
                          ? 'bg-rose-600 text-white border-rose-500'
                          : sev === 'WARN'
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'bg-blue-600 text-white border-blue-500'
                        : isLight
                        ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>

              {/* Logs Stream Table */}
              <div
                className={`border font-mono text-xs overflow-hidden ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#08080a] border-zinc-800'
                }`}
              >
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500">
                    No telemetry events found for filter '{severityFilter}'.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-zinc-800 max-h-96 overflow-y-auto">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 transition-colors ${
                          log.severity === 'ERROR' || log.severity === 'FATAL'
                            ? isLight
                              ? 'bg-rose-50/70 hover:bg-rose-100/80'
                              : 'bg-rose-950/20 hover:bg-rose-900/30'
                            : log.severity === 'WARN'
                            ? isLight
                              ? 'bg-amber-50/70 hover:bg-amber-100/80'
                              : 'bg-amber-950/20 hover:bg-amber-900/30'
                            : isLight
                            ? 'hover:bg-slate-50'
                            : 'hover:bg-zinc-900/50'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold border uppercase ${
                                log.severity === 'ERROR' || log.severity === 'FATAL'
                                  ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                                  : log.severity === 'WARN'
                                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                                  : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                              }`}
                            >
                              {log.severity}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-zinc-200">
                              [{log.module}]
                            </span>
                            <span className="text-slate-500 dark:text-zinc-500 text-[11px]">
                              {log.timestamp}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px]">
                            {log.latencyMs && (
                              <span className="text-slate-500 dark:text-zinc-400 font-bold">
                                {log.latencyMs}ms
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.2 border ${
                                log.statusCode && log.statusCode >= 500
                                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              HTTP {log.statusCode || 200}
                            </span>
                          </div>
                        </div>

                        <p className="font-medium text-slate-800 dark:text-zinc-200 leading-relaxed">
                          {log.message}
                        </p>

                        {/* Stack trace toggle preview */}
                        {log.stackTrace && (
                          <div className="mt-2">
                            <button
                              onClick={() => setSelectedLogId(selectedLogId === log.id ? null : log.id)}
                              className="text-[11px] font-bold underline text-amber-500 hover:text-amber-400 cursor-pointer"
                            >
                              {selectedLogId === log.id ? 'Hide Stack Trace ▲' : 'View Exception Stack Trace ▼'}
                            </button>

                            {selectedLogId === log.id && (
                              <pre
                                className={`mt-2 p-3 text-[10px] overflow-x-auto border leading-relaxed ${
                                  isLight
                                    ? 'bg-slate-900 text-rose-300 border-slate-800'
                                    : 'bg-black text-rose-300 border-zinc-800'
                                }`}
                              >
                                {log.stackTrace}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: USER & CREDIT LEDGER MANAGEMENT */}
          {activeTab === 'credits' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-black font-mono uppercase tracking-wider flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    User Directory & Credit Ledger Control
                  </h3>
                  <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    Directly grant refills or deduct credits for candidate/recruiter accounts. All operations write an immutable ledger record.
                  </p>
                </div>

                <button
                  onClick={fetchUsersAndLedger}
                  disabled={isLoadingCredits}
                  className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border flex items-center gap-1.5 cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCredits ? 'animate-spin' : ''}`} />
                  Refresh Database
                </button>
              </div>

              {/* Status Banner */}
              {creditStatusMsg && (
                <div
                  className={`p-3 border text-xs font-mono font-bold flex items-center justify-between ${
                    creditStatusMsg.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  <span>{creditStatusMsg.text}</span>
                  <button onClick={() => setCreditStatusMsg(null)} className="text-xs uppercase font-bold hover:underline">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Credit Adjustment Console */}
              <div
                className={`p-5 border space-y-4 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d0d12] border-zinc-800'
                }`}
              >
                <h4 className="text-xs font-mono font-black uppercase tracking-wider text-amber-500 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Execute Credit Adjustment
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Select Target User */}
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500 dark:text-zinc-400">
                      Target User Account
                    </label>
                    <select
                      value={selectedUserEmail}
                      onChange={(e) => setSelectedUserEmail(e.target.value)}
                      className={`w-full p-2.5 text-xs font-mono border rounded ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-[#060608] border-zinc-800 text-white'
                      }`}
                    >
                      {usersList.length > 0 ? (
                        usersList.map((u) => (
                          <option key={u.id} value={u.email}>
                            {u.name} ({u.email}) — Balance: {u.creditsRemaining}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="alex.rivera@fidelity.ai">Alex Rivera (alex.rivera@fidelity.ai)</option>
                          <option value="admin@fidelity.ai">M Sajid Ali (admin@fidelity.ai)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Credit Amount Input */}
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500 dark:text-zinc-400">
                      Credit Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))}
                      className={`w-full p-2.5 text-xs font-mono border rounded ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-[#060608] border-zinc-800 text-white'
                      }`}
                    />
                  </div>

                  {/* Reason / Audit Note */}
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase mb-1 text-slate-500 dark:text-zinc-400">
                      Audit Log Note / Action
                    </label>
                    <input
                      type="text"
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      placeholder="e.g. ADMIN_MANUAL_ADJUSTMENT"
                      className={`w-full p-2.5 text-xs font-mono border rounded ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-900'
                          : 'bg-[#060608] border-zinc-800 text-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Action Buttons: Add (+) and Deduct (-) */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => handleAdjustCredits(false)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded transition-all cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    Add / Refill +{adjustAmount} Credits
                  </button>

                  <button
                    onClick={() => handleAdjustCredits(true)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2 rounded transition-all cursor-pointer shadow-md shadow-rose-600/20"
                  >
                    <Minus className="w-4 h-4" />
                    Deduct / Remove -{adjustAmount} Credits
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  Database User Accounts ({usersList.length})
                </h4>

                <div
                  className={`border font-mono text-xs overflow-hidden ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#08080a] border-zinc-800'
                  }`}
                >
                  <table className="w-full text-left divide-y divide-slate-200 dark:divide-zinc-800">
                    <thead className={isLight ? 'bg-slate-100' : 'bg-zinc-900'}>
                      <tr className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase">
                        <th className="p-3">User</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Plan Tier</th>
                        <th className="p-3">Credits Balance</th>
                        <th className="p-3">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                      {usersList.map((u) => (
                        <tr key={u.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-zinc-900/50'}>
                          <td className="p-3">
                            <div className="font-bold">{u.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400">{u.email}</div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black uppercase border ${
                                u.role === 'super_admin'
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-emerald-500 uppercase">{u.tier || 'FREE'}</td>
                          <td className="p-3 font-mono font-bold text-amber-500 text-sm">
                            {u.tier === 'enterprise' ? '⚡ UNLIMITED' : `⚡ ${u.creditsRemaining}`}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setSelectedUserEmail(u.email);
                              }}
                              className="px-2 py-1 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-xs font-bold uppercase rounded cursor-pointer"
                            >
                              Select for Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Credit Audit Ledger */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-black uppercase tracking-wider text-zinc-400">
                  Credit Audit Ledger ({creditLedger.length} Transactions)
                </h4>

                <div
                  className={`border font-mono text-xs overflow-hidden ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#08080a] border-zinc-800'
                  }`}
                >
                  <table className="w-full text-left divide-y divide-slate-200 dark:divide-zinc-800">
                    <thead className={isLight ? 'bg-slate-100' : 'bg-zinc-900'}>
                      <tr className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase">
                        <th className="p-3">Tx ID</th>
                        <th className="p-3">User ID</th>
                        <th className="p-3">Delta</th>
                        <th className="p-3">Action</th>
                        <th className="p-3">Post-Balance</th>
                        <th className="p-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 max-h-64 overflow-y-auto">
                      {creditLedger.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-zinc-500">
                            No credit transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        creditLedger.map((led) => (
                          <tr key={led.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-zinc-900/50'}>
                            <td className="p-3 font-mono text-[11px] text-slate-500">{led.id}</td>
                            <td className="p-3 font-mono text-[11px]">{led.userId}</td>
                            <td className="p-3 font-bold font-mono">
                              <span
                                className={
                                  led.amount >= 0 ? 'text-emerald-500 font-black' : 'text-rose-500 font-black'
                                }
                              >
                                {led.amount >= 0 ? `+${led.amount}` : led.amount}
                              </span>
                            </td>
                            <td className="p-3 text-[11px] uppercase font-bold">{led.action}</td>
                            <td className="p-3 font-bold font-mono text-amber-500">{led.remainingAfter}</td>
                            <td className="p-3 text-[11px] text-slate-500">{new Date(led.createdAt).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between text-xs font-mono ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-zinc-900/80 border-zinc-800 text-zinc-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>DevOps Telemetry Stream Active (Sentry & BetterStack SDK Mirror)</span>
          </div>

          <button
            onClick={onClose}
            className={`px-4 py-1.5 font-bold uppercase border cursor-pointer ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
            }`}
          >
            Close Control Panel
          </button>
        </div>
      </div>
    </div>
  );
};
