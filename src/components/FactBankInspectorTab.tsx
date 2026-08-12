import React, { useState } from 'react';
import { ScenarioPreset } from '../types';
import { Database, Search, Code, Cpu, RefreshCw, Loader2 } from 'lucide-react';
import { FactBankView } from './FactBankView';
import { useCandidate } from '../context/CandidateContext';

interface FactBankInspectorTabProps {
  preset?: ScenarioPreset | null;
  theme?: 'dark' | 'light';
}

export const FactBankInspectorTab: React.FC<FactBankInspectorTabProps> = ({
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const {
    candidateName,
    setCandidateName,
    rawResume,
    setRawResume,
    factBank,
    setFactBank,
  } = useCandidate();

  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtractFacts = async () => {
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch('/api/pipeline/extract-facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_name: candidateName, raw_resume: rawResume }),
      }).then((r) => r.json());

      if (res.error) throw new Error(res.error);
      setFactBank(res);
    } catch (err: any) {
      console.error('Error extracting facts:', err);
      setError(err.message || 'Fact extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`border p-6 shadow-2xl transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-base font-black uppercase tracking-wider flex items-center gap-2 font-mono ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <Database className="w-5 h-5 text-emerald-400" />
              Fact Bank Database & Schema Inspector
            </h2>
            <p className="text-xs font-mono text-zinc-400 mt-1 uppercase tracking-tight max-w-2xl">
              Inspect Stage 1 JSON Fact Bank schema. Extracts atomic claims, exact numeric metrics, and specific tools from raw resumes.
            </p>
          </div>

          <button
            onClick={handleExtractFacts}
            disabled={extracting}
            className="flex items-center gap-2 px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {extracting ? 'Extracting Fact Bank...' : 'Re-Extract Fact Bank'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-mono">
            <span className="font-bold uppercase tracking-wider">Extraction Error:</span> {error}
          </div>
        )}
      </div>

      {/* Raw Resume Input */}
      <div className={`border rounded-xl p-4 ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <label className={`text-xs font-bold uppercase tracking-wider font-mono ${
            isLight ? 'text-slate-800' : 'text-slate-200'
          }`}>
            Candidate Source Resume
          </label>
          <input
            type="text"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            className={`border rounded px-2.5 py-1 text-xs font-bold ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
            }`}
          />
        </div>
        <textarea
          rows={6}
          value={rawResume}
          onChange={(e) => setRawResume(e.target.value)}
          className={`w-full border rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-emerald-500 ${
            isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-300'
          }`}
          placeholder="Paste raw resume..."
        />
      </div>

      {/* Rendered Fact Bank */}
      <FactBankView factBank={factBank} rawText={rawResume} theme={theme} />
    </div>
  );
};

