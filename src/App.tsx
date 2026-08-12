import React, { useState, useEffect } from 'react';
import {
  FactBank,
  JobDescriptionAnalysis,
  EvidenceSelectionOutput,
  GeneratedResume,
  FidelityAuditResult,
  ScenarioPreset,
  ResumeIteration,
} from './types';
import { BENCHMARK_PRESETS } from './data/presets';
import { Navbar } from './components/Navbar';
import { PipelineStepVisualizer, StepStatus } from './components/PipelineStepVisualizer';
import { FactBankView } from './components/FactBankView';
import { JdAnalysisView } from './components/JdAnalysisView';
import { EvidenceMatchMatrix } from './components/EvidenceMatchMatrix';
import { GapAnalysis } from './components/GapAnalysis';
import { TailoredResumeView } from './components/TailoredResumeView';
import { FidelityAuditReport } from './components/FidelityAuditReport';
import { ResumeAuditorTab } from './components/ResumeAuditorTab';
import { UniquenessTester } from './components/UniquenessTester';
import { FactBankInspectorTab } from './components/FactBankInspectorTab';
import { IterationHistoryBar } from './components/IterationHistoryBar';
import { ResumeUploader } from './components/ResumeUploader';
import { extractCandidateName } from './lib/fileParser';
import { JdUrlScraper } from './components/JdUrlScraper';
import { BatchUploader } from './components/BatchUploader';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import {
  getAllIterations,
  saveIteration,
  deleteIteration,
  deleteBulkIterations,
  clearAllIterations,
} from './lib/historyStore';
import { Play, Sparkles, Loader2, User, FileArchive } from 'lucide-react';

import { useCandidate } from './context/CandidateContext';
import { useCredit } from './context/CreditContext';
import { useFeatureFlags } from './context/FeatureFlagContext';
import { useTelemetry } from './context/TelemetryContext';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { SubscriptionModal } from './components/SubscriptionModal';
import { OutOfCreditsModal } from './components/OutOfCreditsModal';
import { AdminControlPanelModal } from './components/AdminControlPanelModal';
import { PricingPage } from './components/PricingPage';
import { WelcomePage } from './components/WelcomePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export default function App() {
  const {
    candidateName,
    setCandidateName,
    rawResume,
    setRawResume,
    jobDescription,
    setJobDescription,
    selectedPreset,
    setSelectedPreset,
    factBank,
    setFactBank,
    jdAnalysis,
    setJdAnalysis,
    evidenceSelection,
    setEvidenceSelection,
    generatedResume,
    setGeneratedResume,
    auditResult,
    setAuditResult,
    activeIterationId,
    setActiveIterationId,
    loadIteration,
  } = useCandidate();

  const {
    upgradeTier,
    refillCredits,
    consumeCredits,
    syncUserCredits,
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    isOutOfCreditsModalOpen,
    setIsOutOfCreditsModalOpen,
  } = useCredit();

  const {
    flags,
    isAdminModalOpen,
    setIsAdminModalOpen,
  } = useFeatureFlags();

  const { captureLog } = useTelemetry();
  const { isAuthenticated } = useAuth();

  const [activeNavTab, setActiveNavTab] = useState<'pipeline' | 'auditor' | 'uniqueness' | 'factbank' | 'pricing'>('pipeline');
  const [isWelcomeRoute, setIsWelcomeRoute] = useState(() => {
    return window.location.pathname === '/welcome' || window.location.search.includes('view=welcome');
  });

  useEffect(() => {
    if (window.location.pathname === '/pricing' || window.location.search.includes('view=pricing')) {
      setActiveNavTab('pricing');
    }
  }, []);


  // Theme State (Dark / Light Mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('fidelity_theme_v1') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fidelity_theme_v1', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
    } catch (e) {
      console.error(e);
    }
  }, [theme]);

  // Check for Stripe or Paddle Checkout return params & verify transaction status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id') || params.get('sessionId');
    const paddleTransactionId =
      params.get('paddle_transaction_id') ||
      params.get('transaction_id') ||
      params.get('transactionId');

    if (paddleTransactionId) {
      captureLog('INFO', 'Paddle Checkout', `Verifying Paddle transaction parameter: ${paddleTransactionId}`);
      
      // Call server endpoint to confirm transaction status via Paddle API and update user credits
      fetch(`/api/user/verify-session?paddle_transaction_id=${encodeURIComponent(paddleTransactionId)}`)
        .then(async (res) => {
          if (!res.ok) return null;
          const text = await res.text();
          return text && text.trim() ? JSON.parse(text) : null;
        })
        .then((data) => {
          if (data?.verified || data?.success) {
            captureLog(
              'INFO',
              'Paddle Checkout Verification',
              `Successfully confirmed Paddle transaction ${paddleTransactionId}. User credits updated.`
            );
            if (data.user) {
              syncUserCredits({
                tier: data.user.tier,
                creditsRemaining: data.user.creditsRemaining,
              });
            }
          } else {
            captureLog(
              'WARN',
              'Paddle Checkout Verification',
              `Transaction ${paddleTransactionId} could not be verified: ${data?.message || 'Unconfirmed status'}`
            );
          }
        })
        .catch((err) => console.warn('Paddle transaction verification notice:', err?.message || err))
        .finally(() => {
          // Clean query param from URL bar
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (sessionId) {
      captureLog('INFO', 'Payment Checkout', `Verifying Stripe payment session: ${sessionId}`);
      fetch(`/api/user/verify-session?session_id=${encodeURIComponent(sessionId)}`)
        .then(async (res) => {
          if (!res.ok) return null;
          const text = await res.text();
          return text && text.trim() ? JSON.parse(text) : null;
        })
        .then((data) => {
          if (data?.verified || data?.success) {
            captureLog('INFO', 'Payment Checkout Verification', `Successfully verified Payment Session ID ${sessionId}`);
            if (data.user) {
              syncUserCredits({
                tier: data.user.tier,
                creditsRemaining: data.user.creditsRemaining,
              });
            }
          }
        })
        .catch((err) => console.warn('Payment session verify notice:', err?.message || err))
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [captureLog, syncUserCredits]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Form Inputs
  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');

  // IndexedDB History State (Supports Large Batch Workflows)
  const [resumeHistory, setResumeHistory] = useState<ResumeIteration[]>([]);

  // Pipeline Execution State
  const [activeStageView, setActiveStageView] = useState<number>(1);
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [steps, setSteps] = useState<StepStatus[]>([
    { stage: 1, name: 'Fact Extractor', subtitle: 'Raw Resume → Fact Bank JSON', status: 'idle' },
    { stage: 2, name: 'JD Analyzer', subtitle: 'Extract Must-haves & Tools', status: 'idle' },
    { stage: 3, name: 'Evidence Matcher', subtitle: 'Prompt A: Logic & Missing Flags', status: 'idle' },
    { stage: 4, name: 'Constrained Generator', subtitle: 'Prompt B: Tailored Resume', status: 'idle' },
    { stage: 5, name: 'Fidelity Auditor', subtitle: 'Automated Hallucination Audit', status: 'idle' },
  ]);

  // Load history from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    getAllIterations()
      .then((history) => {
        if (isMounted) {
          setResumeHistory(history);
        }
      })
      .catch((err) => {
        console.error('Failed to load history from IndexedDB:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Reset steps when preset changes
  useEffect(() => {
    setSteps((prev) => prev.map((s) => ({ ...s, status: 'idle', durationMs: undefined })));
  }, [selectedPreset]);

  // Switch to a previously saved iteration
  const handleSelectIteration = (iteration: ResumeIteration) => {
    loadIteration(iteration);

    setSteps([
      { stage: 1, name: 'Fact Extractor', subtitle: 'Raw Resume → Fact Bank JSON', status: 'completed' },
      { stage: 2, name: 'JD Analyzer', subtitle: 'Extract Must-haves & Tools', status: 'completed' },
      { stage: 3, name: 'Evidence Matcher', subtitle: 'Prompt A: Logic & Missing Flags', status: 'completed' },
      { stage: 4, name: 'Constrained Generator', subtitle: 'Prompt B: Tailored Resume', status: 'completed' },
      { stage: 5, name: 'Fidelity Auditor', subtitle: 'Automated Hallucination Audit', status: 'completed' },
    ]);

    setActiveStageView(4);
  };


  const handleDeleteIteration = async (id: string) => {
    setResumeHistory((prev) => prev.filter((item) => item.id !== id));
    if (activeIterationId === id) {
      setActiveIterationId(null);
    }
    try {
      await deleteIteration(id);
    } catch (e) {
      console.error('Failed to delete iteration from IndexedDB:', e);
    }
  };

  const handleBulkDeleteIterations = async (ids: string[]) => {
    const idSet = new Set(ids);
    setResumeHistory((prev) => prev.filter((item) => !idSet.has(item.id)));
    if (activeIterationId && idSet.has(activeIterationId)) {
      setActiveIterationId(null);
    }
    try {
      await deleteBulkIterations(ids);
    } catch (e) {
      console.error('Failed to bulk delete iterations from IndexedDB:', e);
    }
  };

  const handleClearHistory = async () => {
    setResumeHistory([]);
    setActiveIterationId(null);
    try {
      await clearAllIterations();
      localStorage.removeItem('fidelity_active_iteration_id_v1');
    } catch (e) {
      console.error('Failed to clear IndexedDB history:', e);
    }
  };

  // Run Stage-by-Stage Execution
  const handleRunPipeline = async () => {
    // Check system maintenance kill switch
    if (flags.maintenanceMode) {
      setPipelineError('System is currently under global maintenance. Pipeline execution is temporarily locked by DevOps.');
      captureLog('WARN', 'Pipeline Engine', 'Pipeline execution blocked due to active System Maintenance Mode kill switch.');
      return;
    }

    // Check credit availability
    if (!consumeCredits(1, 'Stage 1-5 Pipeline Execution')) {
      return;
    }

    setIsRunningPipeline(true);
    setPipelineError(null);
    const pipelineStartTime = Date.now();

    captureLog('INFO', 'Pipeline Engine', `Initiated 5-stage pipeline run for candidate '${candidateName}'`);

    const safeApiCall = async (url: string, body: any) => {
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (err: any) {
        throw new Error(`Network error connecting to server: ${err?.message || 'Failed to fetch'}`);
      }
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(data?.error || `API request to ${url} failed (status ${res.status})`);
      }
      return data;
    };

    try {
      // Stage 1
      setSteps((prev) => prev.map((s) => (s.stage === 1 ? { ...s, status: 'running' } : s)));
      const t1 = Date.now();
      const fbRes = await safeApiCall('/api/pipeline/extract-facts', {
        candidate_name: candidateName,
        raw_resume: rawResume,
      });

      if (fbRes.error) throw new Error(`Stage 1 Error: ${fbRes.error}`);
      setFactBank(fbRes);
      const d1 = Date.now() - t1;
      setSteps((prev) => prev.map((s) => (s.stage === 1 ? { ...s, status: 'completed', durationMs: d1 } : s)));

      // Stage 2
      setSteps((prev) => prev.map((s) => (s.stage === 2 ? { ...s, status: 'running' } : s)));
      const t2 = Date.now();
      const jdRes = await safeApiCall('/api/pipeline/analyze-jd', {
        job_description: jobDescription,
      });

      if (jdRes.error) throw new Error(`Stage 2 Error: ${jdRes.error}`);
      setJdAnalysis(jdRes);
      const d2 = Date.now() - t2;
      setSteps((prev) => prev.map((s) => (s.stage === 2 ? { ...s, status: 'completed', durationMs: d2 } : s)));

      // Stage 3
      setSteps((prev) => prev.map((s) => (s.stage === 3 ? { ...s, status: 'running' } : s)));
      const t3 = Date.now();
      const matchRes = await safeApiCall('/api/pipeline/match-evidence', {
        fact_bank: fbRes,
        jd_analysis: jdRes,
      });

      if (matchRes.error) throw new Error(`Stage 3 Error: ${matchRes.error}`);
      setEvidenceSelection(matchRes);
      const d3 = Date.now() - t3;
      setSteps((prev) => prev.map((s) => (s.stage === 3 ? { ...s, status: 'completed', durationMs: d3 } : s)));

      // Stage 4
      setSteps((prev) => prev.map((s) => (s.stage === 4 ? { ...s, status: 'running' } : s)));
      const t4 = Date.now();
      const genRes = await safeApiCall('/api/pipeline/generate-resume', {
        candidate_name: candidateName,
        fact_bank: fbRes,
        evidence_selection: matchRes,
        jd_analysis: jdRes,
      });

      if (genRes.error) throw new Error(`Stage 4 Error: ${genRes.error}`);
      setGeneratedResume(genRes);
      const d4 = Date.now() - t4;
      setSteps((prev) => prev.map((s) => (s.stage === 4 ? { ...s, status: 'completed', durationMs: d4 } : s)));

      // Stage 5 Audit
      setSteps((prev) => prev.map((s) => (s.stage === 5 ? { ...s, status: 'running' } : s)));
      const t5 = Date.now();
      const auditRes = await safeApiCall('/api/pipeline/audit-fidelity', {
        fact_bank: fbRes,
        generated_resume: genRes,
        raw_resume_text: rawResume,
        target_jd_text: jobDescription,
      });

      if (auditRes.error) throw new Error(`Stage 5 Error: ${auditRes.error}`);
      setAuditResult(auditRes);
      const d5 = Date.now() - t5;
      setSteps((prev) => prev.map((s) => (s.stage === 5 ? { ...s, status: 'completed', durationMs: d5 } : s)));

      // Save iteration into IndexedDB history
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const newIteration: ResumeIteration = {
        id: Date.now().toString(),
        timestamp: `${timeStr}, ${dateStr}`,
        candidateName,
        targetTitle: genRes.target_title || 'Tailored Candidate',
        presetTitle: selectedPreset.title,
        factBank: fbRes,
        jdAnalysis: jdRes,
        evidenceSelection: matchRes,
        generatedResume: genRes,
        auditResult: auditRes,
        rawResume,
        jobDescription,
      };

      try {
        await saveIteration(newIteration);
      } catch (saveErr) {
        console.error('Failed to save iteration to IndexedDB:', saveErr);
      }

      setResumeHistory((prev) => [newIteration, ...prev.filter((item) => item.id !== newIteration.id)]);
      setActiveIterationId(newIteration.id);

      captureLog(
        'INFO',
        'Pipeline Engine',
        `Successfully finished 5-stage pipeline run for '${candidateName}' (Score: ${auditRes?.overall_score ?? 100}%)`,
        { score: auditRes?.overall_score, durationTotalMs: Date.now() - pipelineStartTime }
      );

      // Default active stage view to 4 (Tailored Resume) once completed
      setActiveStageView(4);
    } catch (err: any) {
      console.error('Pipeline execution error:', err);
      const errMsg = err.message || 'Pipeline execution failed';
      setPipelineError(errMsg);
      setSteps((prev) => prev.map((s) => (s.status === 'running' ? { ...s, status: 'error' } : s)));

      captureLog(
        'ERROR',
        'Pipeline Engine',
        `Pipeline execution error: ${errMsg}`,
        { candidate: candidateName, targetPreset: selectedPreset?.title },
        err.stack
      );
    } finally {
      setIsRunningPipeline(false);
    }
  };

  const handleSaveBatchCandidate = async (iteration: ResumeIteration) => {
    try {
      await saveIteration(iteration);
      setResumeHistory((prev) => [iteration, ...prev.filter((item) => item.id !== iteration.id)]);
    } catch (err) {
      console.error('Error saving batch iteration to IndexedDB:', err);
    }
  };

  const handleLoadBatchCandidate = (data: {
    candidateName: string;
    rawResume: string;
    factBank: FactBank;
    jdAnalysis: JobDescriptionAnalysis;
    evidenceSelection: EvidenceSelectionOutput;
    generatedResume: GeneratedResume;
    auditResult: FidelityAuditResult;
  }) => {
    setCandidateName(data.candidateName);
    setRawResume(data.rawResume);
    setFactBank(data.factBank);
    setJdAnalysis(data.jdAnalysis);
    setEvidenceSelection(data.evidenceSelection);
    setGeneratedResume(data.generatedResume);
    setAuditResult(data.auditResult);
    setInputMode('single');
    setActiveStageView(4);
    setSteps([
      { stage: 1, name: 'Fact Extractor', subtitle: 'Raw Resume → Fact Bank JSON', status: 'completed' },
      { stage: 2, name: 'JD Analyzer', subtitle: 'Extract Must-haves & Tools', status: 'completed' },
      { stage: 3, name: 'Evidence Matcher', subtitle: 'Prompt A: Logic & Missing Flags', status: 'completed' },
      { stage: 4, name: 'Constrained Generator', subtitle: 'Prompt B: Tailored Resume', status: 'completed' },
      { stage: 5, name: 'Fidelity Auditor', subtitle: 'Automated Hallucination Audit', status: 'completed' },
    ]);
  };


  return (
    <ErrorBoundary theme={theme}>
      <div className={`min-h-screen font-sans transition-colors selection:bg-blue-500 selection:text-white ${
        theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-[#050505] text-zinc-100'
      }`}>
        {/* Global System Maintenance Banner (if Emergency Kill Switch enabled) */}
        {flags.maintenanceMode && (
          <div className="bg-rose-600 text-white font-mono text-xs font-bold py-2.5 px-4 text-center border-b border-rose-400 flex items-center justify-center gap-2 animate-pulse z-50">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              EMERGENCY SYSTEM MAINTENANCE: {flags.customMaintenanceNotice || 'System operations are locked by DevOps. Features are temporarily in read-only mode.'}
            </span>
          </div>
        )}

        {/* Top Navbar */}
        <Navbar
          activeTab={activeNavTab}
          setActiveTab={setActiveNavTab}
          selectedPreset={selectedPreset}
          onSelectPreset={setSelectedPreset}
          isRunning={isRunningPipeline}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

      {/* PWA Install & Network Banner */}
      <PWAInstallPrompt theme={theme} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {isWelcomeRoute ? (
          <WelcomePage
            onReturnToDashboard={() => {
              setIsWelcomeRoute(false);
              window.history.replaceState({}, '', '/');
            }}
          />
        ) : !isAuthenticated ? (
          <LoginPage theme={theme} />
        ) : (
          <>
            {/* Tab 1: 4-Stage Pipeline */}
            {activeNavTab === 'pipeline' && (
          <div className="space-y-6">
            {/* Mode Switcher Bar */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border p-2 font-mono ${
              theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'
            }`}>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setInputMode('single')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    inputMode === 'single'
                      ? 'bg-blue-600 text-white border border-blue-400 shadow-sm'
                      : theme === 'light'
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Single Candidate Pipeline
                </button>

                <button
                  onClick={() => setInputMode('batch')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    inputMode === 'batch'
                      ? 'bg-indigo-600 text-white border border-indigo-400 shadow-sm'
                      : theme === 'light'
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <FileArchive className="w-3.5 h-3.5 text-indigo-400" />
                  Batch Processing Mode (ZIP Upload)
                </button>
              </div>

              {inputMode === 'single' && (
                <div className="text-xs text-zinc-400 px-2 hidden sm:block">
                  Preset: <strong className={theme === 'light' ? 'text-slate-900' : 'text-white'}>{selectedPreset.title}</strong>
                </div>
              )}
            </div>

            {/* Input Panels (Single Mode) or BatchUploader (Batch Mode) */}
            {inputMode === 'batch' ? (
              <BatchUploader
                currentJobDescription={jobDescription}
                theme={theme}
                onLoadCandidateToPipeline={handleLoadBatchCandidate}
                onSaveBatchCandidate={handleSaveBatchCandidate}
              />
            ) : (
              <div className={`border p-6 shadow-2xl transition-colors ${
                theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
              }`}>
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4 ${
                  theme === 'light' ? 'border-slate-200' : 'border-zinc-800/80'
                }`}>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      Pipeline Inputs & Source Data
                    </h2>
                    <p className={`text-xs font-mono mt-1 uppercase tracking-wider ${
                      theme === 'light' ? 'text-slate-600 font-medium' : 'text-zinc-400'
                    }`}>
                      Benchmark Preset: <strong className={theme === 'light' ? 'text-slate-900 font-black' : 'text-white'}>{selectedPreset.title}</strong>
                    </p>
                  </div>

                  <button
                    onClick={handleRunPipeline}
                    disabled={isRunningPipeline}
                    className="flex items-center gap-2 px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isRunningPipeline ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-white" />
                    )}
                    {isRunningPipeline ? 'Executing 4-Stage Pipeline...' : 'Run Full Fidelity Pipeline'}
                  </button>
                </div>

                {pipelineError && (
                  <div className={`mb-6 p-4 border text-xs font-mono ${
                    theme === 'light' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                  }`}>
                    <span className="font-bold uppercase tracking-wider">Pipeline Error:</span> {pipelineError}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Candidate Resume */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-xs font-black uppercase tracking-widest font-mono ${
                        theme === 'light' ? 'text-slate-900' : 'text-zinc-300'
                      }`}>
                        1. Candidate Raw Resume / Profile History
                      </label>
                      <input
                        type="text"
                        title="Candidate Name"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className={`border rounded-none px-3 py-1 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none ${
                          theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-[#050505] border-zinc-800 text-white'
                        }`}
                      />
                    </div>

                    {/* Drag-and-Drop & File Upload Button (.pdf, .docx, .txt, .zip) */}
                    <ResumeUploader
                      theme={theme}
                      onResumeExtracted={(extractedText, nameCandidate) => {
                        setRawResume(extractedText);
                        if (nameCandidate) {
                          setCandidateName(nameCandidate);
                        }
                      }}
                      onZipUploaded={() => {
                        setInputMode('batch');
                      }}
                    />

                    <textarea
                      rows={8}
                      value={rawResume}
                      onChange={(e) => setRawResume(e.target.value)}
                      className={`w-full border p-3 text-xs font-mono focus:outline-none focus:border-blue-500 leading-relaxed ${
                        theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-[#050505] border-zinc-800 text-zinc-300'
                      }`}
                      placeholder="Paste or upload raw candidate resume (.pdf, .docx, .txt)..."
                    />
                  </div>

                  {/* Target Job Description */}
                  <div className="space-y-2">
                    <label className={`text-xs font-black uppercase tracking-widest block font-mono ${
                      theme === 'light' ? 'text-slate-900' : 'text-zinc-300'
                    }`}>
                      2. Target Job Description (Employer Needs)
                    </label>

                    {/* Scrape Job Description from URL */}
                    <JdUrlScraper
                      theme={theme}
                      onJdScraped={(scrapedText) => {
                        setJobDescription(scrapedText);
                      }}
                    />

                    <textarea
                      rows={7}
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className={`w-full border p-3 text-xs font-mono focus:outline-none focus:border-blue-500 leading-relaxed ${
                        theme === 'light' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-[#050505] border-zinc-800 text-zinc-300'
                      }`}
                      placeholder="Paste target job description or scrape from URL..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Iteration History Bar */}
            <IterationHistoryBar
              iterations={resumeHistory}
              activeIterationId={activeIterationId}
              onSelectIteration={handleSelectIteration}
              onDeleteIteration={handleDeleteIteration}
              onBulkDeleteIterations={handleBulkDeleteIterations}
              onClearHistory={handleClearHistory}
              theme={theme}
            />

            {/* Pipeline Step Visualizer Bar */}
            <PipelineStepVisualizer
              steps={steps}
              currentActiveStage={activeStageView}
              onSelectStage={(stage) => setActiveStageView(stage)}
              theme={theme}
            />

            {/* Stage Detailed Outputs View */}
            <div>
              {activeStageView === 1 && <FactBankView factBank={factBank} rawText={rawResume} theme={theme} />}
              {activeStageView === 2 && <JdAnalysisView jdAnalysis={jdAnalysis} rawJdText={jobDescription} theme={theme} />}
              {activeStageView === 3 && (
                <div className="space-y-6">
                  <EvidenceMatchMatrix evidenceSelection={evidenceSelection} factBank={factBank} theme={theme} />
                  <GapAnalysis jdAnalysis={jdAnalysis} factBank={factBank} evidenceSelection={evidenceSelection} theme={theme} />
                </div>
              )}
              {activeStageView === 4 && (
                <div className="space-y-6">
                  <TailoredResumeView resume={generatedResume} factBank={factBank} auditResult={auditResult} theme={theme} />
                  <GapAnalysis jdAnalysis={jdAnalysis} factBank={factBank} evidenceSelection={evidenceSelection} theme={theme} />
                </div>
              )}
              {activeStageView === 5 && <FidelityAuditReport audit={auditResult} theme={theme} />}
            </div>
          </div>
        )}

        {/* Tab 2: Resume Auditor */}
        {activeNavTab === 'auditor' && <ResumeAuditorTab preset={selectedPreset} theme={theme} />}

        {/* Tab 3: Uniqueness Lab */}
        {activeNavTab === 'uniqueness' && <UniquenessTester preset={selectedPreset} theme={theme} />}

        {/* Tab 4: Fact Bank DB */}
        {activeNavTab === 'factbank' && (
          <FactBankInspectorTab
            preset={selectedPreset}
            theme={theme}
          />
        )}

        {/* Tab 5: 3-Tier Pricing Page */}
        {activeNavTab === 'pricing' && (
          <PricingPage
            onNavigateToDashboard={() => setActiveNavTab('pipeline')}
          />
        )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t py-8 text-center text-xs font-mono uppercase tracking-wider transition-colors mt-16 ${
        theme === 'light'
          ? 'bg-slate-200 border-slate-300 text-slate-700 font-bold'
          : 'bg-[#050505] border-zinc-900 text-zinc-500'
      }`}>
        <p>
          Fidelity Pipeline B2B Resume Infrastructure — Decoupled LLM Architecture with Factual Traceability & Carbon Copy Defense.
        </p>
      </footer>

      {/* Credit Balance & SaaS Subscription Modals */}
      <SubscriptionModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        theme={theme}
      />

      <OutOfCreditsModal
        isOpen={isOutOfCreditsModalOpen}
        onClose={() => setIsOutOfCreditsModalOpen(false)}
        theme={theme}
      />

      {/* DevOps Admin Control Tower & Sentry Telemetry Modal */}
      <AdminControlPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        theme={theme}
      />
    </div>
    </ErrorBoundary>
  );
}


