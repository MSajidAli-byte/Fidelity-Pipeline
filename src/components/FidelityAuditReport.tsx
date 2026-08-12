import React from 'react';
import { FidelityAuditResult } from '../types';
import { ShieldCheck, AlertOctagon, CheckCircle2, FileCheck, HelpCircle, BarChart3, AlertTriangle, Cpu } from 'lucide-react';

interface FidelityAuditReportProps {
  audit: FidelityAuditResult | null;
  theme?: 'dark' | 'light';
}

export const FidelityAuditReport: React.FC<FidelityAuditReportProps> = ({ audit, theme = 'dark' }) => {
  const isLight = theme === 'light';

  if (!audit) {
    return (
      <div className={`border rounded-xl p-8 text-center transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
      }`}>
        <ShieldCheck className={`w-12 h-12 mx-auto mb-3 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
        <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>No Audit Report Available</h3>
        <p className={`text-xs mt-1 max-w-md mx-auto ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
          Run the Automated Evaluation Auditor to verify factuality, measure fluff index, and inspect hallucination risks.
        </p>
      </div>
    );
  }

  const hasHallucinations = audit.hallucinations_detected && audit.hallucinations_detected.length > 0;

  return (
    <div className={`border rounded-xl p-5 shadow-xl transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
    }`}>
      {/* Top Banner */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b pb-4 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasHallucinations ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'
              }`}
            />
            <h3 className={`text-base font-bold flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Automated Evaluation: B2B Fidelity & Quality Report
            </h3>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${
                hasHallucinations
                  ? isLight
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  : isLight
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {hasHallucinations ? 'HALLUCINATION DETECTED' : '100% FACTUALLY GROUNDED'}
            </span>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Automated verification comparing generated resume claims against candidate Fact Bank.
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Overall Fidelity */}
        <div className={`border rounded-lg p-4 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <span className={`text-[10px] font-mono uppercase block mb-1 ${
            isLight ? 'text-slate-600 font-bold' : 'text-slate-400'
          }`}>Overall B2B Fidelity Score</span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-extrabold font-mono ${
                audit.overall_fidelity_score >= 90
                  ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                  : audit.overall_fidelity_score >= 70
                  ? isLight ? 'text-amber-700' : 'text-amber-400'
                  : isLight ? 'text-rose-700' : 'text-rose-400'
              }`}
            >
              {audit.overall_fidelity_score}%
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>target: ≥95%</span>
          </div>
          <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${
            isLight ? 'bg-slate-200' : 'bg-slate-800'
          }`}>
            <div
              className={`h-full ${
                audit.overall_fidelity_score >= 90
                  ? 'bg-emerald-500'
                  : audit.overall_fidelity_score >= 70
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${audit.overall_fidelity_score}%` }}
            />
          </div>
        </div>

        {/* Factuality % */}
        <div className={`border rounded-lg p-4 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <span className={`text-[10px] font-mono uppercase block mb-1 ${
            isLight ? 'text-slate-600 font-bold' : 'text-slate-400'
          }`}>Factuality Grounding</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold font-mono ${
              isLight ? 'text-blue-700' : 'text-blue-400'
            }`}>
              {audit.factuality_percentage}%
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>claims verified</span>
          </div>
          <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${
            isLight ? 'bg-slate-200' : 'bg-slate-800'
          }`}>
            <div className="bg-blue-500 h-full" style={{ width: `${audit.factuality_percentage}%` }} />
          </div>
        </div>

        {/* Fluff Index % */}
        <div className={`border rounded-lg p-4 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <span className={`text-[10px] font-mono uppercase block mb-1 ${
            isLight ? 'text-slate-600 font-bold' : 'text-slate-400'
          }`}>Fluff / Generic Buzzword Index</span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-extrabold font-mono ${
                audit.fluff_percentage <= 10
                  ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                  : isLight ? 'text-amber-700' : 'text-amber-400'
              }`}
            >
              {audit.fluff_percentage}%
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>lower is better</span>
          </div>
          <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${
            isLight ? 'bg-slate-200' : 'bg-slate-800'
          }`}>
            <div
              className={`h-full ${audit.fluff_percentage <= 10 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${audit.fluff_percentage}%` }}
            />
          </div>
        </div>

        {/* Hallucinations Count */}
        <div className={`border rounded-lg p-4 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <span className={`text-[10px] font-mono uppercase block mb-1 ${
            isLight ? 'text-slate-600 font-bold' : 'text-slate-400'
          }`}>Unverified Tool Violations</span>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-extrabold font-mono ${
                hasHallucinations
                  ? isLight ? 'text-rose-700' : 'text-rose-400'
                  : isLight ? 'text-emerald-700' : 'text-emerald-400'
              }`}
            >
              {audit.hallucinations_detected?.length || 0}
            </span>
            <span className={`text-xs ${isLight ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>unbacked skills</span>
          </div>
          <div className={`w-full h-1.5 rounded-full mt-2 overflow-hidden ${
            isLight ? 'bg-slate-200' : 'bg-slate-800'
          }`}>
            <div
              className={`h-full ${hasHallucinations ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: hasHallucinations ? '100%' : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* Hallucinations Violations Detail */}
      {hasHallucinations && (
        <div className={`border rounded-lg p-4 mb-6 ${
          isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-950/60 border-rose-500/40'
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-3 ${
            isLight ? 'text-rose-800' : 'text-rose-400'
          }`}>
            <AlertOctagon className={`w-4 h-4 ${isLight ? 'text-rose-700' : 'text-rose-400'}`} />
            Detected Hallucination Violations ({audit.hallucinations_detected.length})
          </h4>
          <div className="space-y-2">
            {audit.hallucinations_detected.map((h, i) => (
              <div key={i} className={`p-3 rounded border text-xs ${
                isLight ? 'bg-white border-rose-200' : 'bg-slate-950 border-rose-500/30'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold ${isLight ? 'text-rose-900' : 'text-rose-300'}`}>"{h.claim}"</span>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-bold ${
                    isLight ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}>
                    {h.severity} SEVERITY
                  </span>
                </div>
                <p className={`text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{h.missing_evidence_reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Claims Mapping */}
      <div className={`border rounded-lg p-4 mb-6 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
      }`}>
        <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-3 ${
          isLight ? 'text-emerald-800' : 'text-emerald-400'
        }`}>
          <FileCheck className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
          Verified Fact Bank Claims ({audit.verified_claims?.length || 0})
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
          {audit.verified_claims?.map((vc, i) => (
            <div key={i} className={`p-2.5 rounded border text-xs flex items-start gap-2 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <div className="flex-1">
                <p className={`text-[11px] leading-snug ${isLight ? 'text-slate-800 font-medium' : 'text-slate-200'}`}>{vc.claim}</p>
                <span className={`text-[10px] font-mono mt-1 block font-bold ${
                  isLight ? 'text-blue-800' : 'text-blue-400'
                }`}>
                  Backed by Fact ID: #{vc.fact_id}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Narrative Summary */}
      <div className={`border rounded-lg p-4 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
      }`}>
        <h4 className={`text-xs font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-slate-300'}`}>Auditor Narrative Executive Summary</h4>
        <p className={`text-xs leading-relaxed font-mono ${isLight ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{audit.summary_narrative}</p>
      </div>
    </div>
  );
};
