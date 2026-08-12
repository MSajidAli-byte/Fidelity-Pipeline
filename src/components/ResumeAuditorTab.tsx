import React, { useState } from 'react';
import { FidelityAuditResult, ScenarioPreset } from '../types';
import { FileSearch, ShieldCheck, AlertOctagon, Sparkles, Loader2, Code, Copy, CheckCircle2 } from 'lucide-react';
import { FidelityAuditReport } from './FidelityAuditReport';
import { useCandidate } from '../context/CandidateContext';

interface ResumeAuditorTabProps {
  preset: ScenarioPreset | null;
  theme?: 'dark' | 'light';
}

export const ResumeAuditorTab: React.FC<ResumeAuditorTabProps> = ({ theme = 'dark' }) => {
  const isLight = theme === 'light';
  const {
    candidateName,
    setCandidateName,
    rawResume: candidateResume,
    setRawResume: setCandidateResume,
    jobDescription: targetJd,
    setJobDescription: setTargetJd,
  } = useCandidate();

  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<FidelityAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);


  const handleAudit = async () => {
    setAuditing(true);
    setError(null);
    try {
      // First extract Fact Bank to act as ground truth
      const factsRes = await fetch('/api/pipeline/extract-facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_name: candidateName, raw_resume: candidateResume }),
      }).then((r) => r.json());

      if (factsRes.error) throw new Error(factsRes.error);

      // Now run B2B Audit
      const auditRes = await fetch('/api/pipeline/audit-fidelity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fact_bank: factsRes,
          generated_resume: {
            candidate_name: candidateName,
            summary: candidateResume.substring(0, 300),
            tailored_experience: [],
            skills: [],
          },
          raw_resume_text: candidateResume,
          target_jd_text: targetJd,
        }),
      }).then((r) => r.json());

      if (auditRes.error) throw new Error(auditRes.error);
      setAuditResult(auditRes);
    } catch (err: any) {
      console.error('Error auditing resume:', err);
      setError(err.message || 'Audit failed');
    } finally {
      setAuditing(false);
    }
  };

  const sampleCurl = `curl -X POST "${window.location.origin}/api/pipeline/audit-fidelity" \\
  -H "Content-Type: application/json" \\
  -d '{
    "candidate_name": "${candidateName}",
    "raw_resume_text": "...",
    "target_jd_text": "..."
  }'`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`border p-6 shadow-2xl transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-base font-black uppercase tracking-wider flex items-center gap-2 font-mono ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <FileSearch className="w-5 h-5 text-emerald-400" />
              B2B "Resume Auditor" API Simulator
            </h2>
            <p className="text-xs font-mono text-zinc-400 mt-1 uppercase tracking-tight max-w-2xl">
              Enterprise endpoint allowing employers to evaluate any candidate resume against a job description for instant
              Fidelity Score, Hallucination Flags, and Fluff Index calculations.
            </p>
          </div>

          <button
            onClick={handleAudit}
            disabled={auditing}
            className="flex items-center gap-2 px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {auditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {auditing ? 'Auditing Resume...' : 'Audit Resume & JD'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-mono">
            <span className="font-bold uppercase tracking-wider">Audit Error:</span> {error}
          </div>
        )}
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`border p-5 rounded-lg ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
        }`}>
          <label className={`text-xs font-black uppercase tracking-widest block mb-2 font-mono ${
            isLight ? 'text-slate-800' : 'text-zinc-300'
          }`}>
            Candidate Resume Input
          </label>
          <textarea
            rows={10}
            value={candidateResume}
            onChange={(e) => setCandidateResume(e.target.value)}
            className={`w-full border p-3 text-xs font-mono focus:outline-none focus:border-emerald-500 leading-relaxed ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#050505] border-zinc-800 text-zinc-300'
            }`}
            placeholder="Paste candidate resume..."
          />
        </div>

        <div className={`border p-5 rounded-lg ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
        }`}>
          <label className={`text-xs font-black uppercase tracking-widest block mb-2 font-mono ${
            isLight ? 'text-slate-800' : 'text-zinc-300'
          }`}>
            Target Job Description
          </label>
          <textarea
            rows={10}
            value={targetJd}
            onChange={(e) => setTargetJd(e.target.value)}
            className={`w-full border p-3 text-xs font-mono focus:outline-none focus:border-blue-500 leading-relaxed ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#050505] border-zinc-800 text-zinc-300'
            }`}
            placeholder="Paste target job description..."
          />
        </div>
      </div>

      {/* Audit Output */}
      {auditResult && <FidelityAuditReport audit={auditResult} theme={theme} />}

      {/* B2B API Endpoint Usage Snippet */}
      <div className={`border rounded-xl p-5 shadow-xl ${
        isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className={`text-xs font-bold flex items-center gap-2 font-mono ${
            isLight ? 'text-slate-900' : 'text-slate-200'
          }`}>
            <Code className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            cURL Request / API Integration Endpoint
          </h3>
          <button
            onClick={() => {
              navigator.clipboard.writeText(sampleCurl);
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2000);
            }}
            className={`text-xs flex items-center gap-1 font-mono ${
              isLight ? 'text-slate-600 hover:text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            {copiedCode ? <CheckCircle2 className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? 'Copied' : 'Copy cURL'}
          </button>
        </div>
        <pre className={`p-3 rounded border font-mono text-[11px] overflow-x-auto ${
          isLight ? 'bg-slate-900 text-emerald-400 border-slate-800' : 'bg-slate-950 text-emerald-400 border-slate-800'
        }`}>
          {sampleCurl}
        </pre>
      </div>
    </div>
  );
};
