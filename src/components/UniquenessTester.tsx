import React, { useState, useEffect } from 'react';
import { UniquenessAnalysis, ScenarioPreset } from '../types';
import { GitCompare, AlertTriangle, ShieldCheck, CheckCircle2, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { useCandidate } from '../context/CandidateContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';

interface UniquenessTesterProps {
  preset?: ScenarioPreset | null;
  theme?: 'dark' | 'light';
}

export const UniquenessTester: React.FC<UniquenessTesterProps> = ({ theme = 'dark' }) => {
  const isLight = theme === 'light';
  const { flags } = useFeatureFlags();
  const {
    candidateName: candidateAName,
    setCandidateName: setCandidateAName,
    rawResume: candidateA,
    setRawResume: setCandidateA,
    jobDescription: targetJd,
    setJobDescription: setTargetJd,
    selectedPreset,
  } = useCandidate();


  const [candidateB, setCandidateB] = useState(selectedPreset?.candidate_b.raw_resume || '');
  const [candidateBName, setCandidateBName] = useState(selectedPreset?.candidate_b.name || 'Candidate B');

  const [loading, setLoading] = useState(false);
  const [resumeAOutput, setResumeAOutput] = useState<any | null>(null);
  const [resumeBOutput, setResumeBOutput] = useState<any | null>(null);
  const [uniquenessResult, setUniquenessResult] = useState<UniquenessAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync Candidate B when preset changes
  useEffect(() => {
    if (selectedPreset) {
      setCandidateB(selectedPreset.candidate_b.raw_resume);
      setCandidateBName(selectedPreset.candidate_b.name);
      setResumeAOutput(null);
      setResumeBOutput(null);
      setUniquenessResult(null);
    }
  }, [selectedPreset]);


  const handleRunUniquenessTest = async () => {
    if (!flags.enableUniquenessTester) {
      setError(flags.customMaintenanceNotice || 'Uniqueness & Anti-Cloning Lab is temporarily disabled for maintenance.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Run full pipeline for Candidate A
      const resA = await fetch('/api/pipeline/run-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: candidateAName,
          raw_resume: candidateA,
          job_description: targetJd,
        }),
      }).then((r) => r.json());

      if (resA.error) throw new Error(`Candidate A Error: ${resA.error}`);
      setResumeAOutput(resA.generated_resume);

      // Step 2: Run full pipeline for Candidate B
      const resB = await fetch('/api/pipeline/run-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: candidateBName,
          raw_resume: candidateB,
          job_description: targetJd,
        }),
      }).then((r) => r.json());

      if (resB.error) throw new Error(`Candidate B Error: ${resB.error}`);
      setResumeBOutput(resB.generated_resume);

      // Step 3: Run Cosine Similarity & Uniqueness check
      const uniquenessRes = await fetch('/api/pipeline/compare-uniqueness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_a: resA.generated_resume,
          resume_b: resB.generated_resume,
          candidate_a_name: candidateAName,
          candidate_b_name: candidateBName,
        }),
      }).then((r) => r.json());

      if (uniquenessRes.error) throw new Error(`Uniqueness Error: ${uniquenessRes.error}`);
      setUniquenessResult(uniquenessRes);
    } catch (err: any) {
      console.error('Error running uniqueness test:', err);
      setError(err.message || 'Failed to complete uniqueness evaluation');
    } finally {
      setLoading(false);
    }
  };

  const isHighSimilarity = uniquenessResult && uniquenessResult.cosine_similarity_score > 0.85;

  return (
    <div className="space-y-6">
      {/* Description Header */}
      <div className={`border p-6 shadow-2xl transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className={`text-base font-black uppercase tracking-wider flex items-center gap-2 font-mono ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              <GitCompare className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              B2B Carbon Copy & Similarity Laboratory
            </h2>
            <p className={`text-xs font-mono mt-1 uppercase tracking-tight max-w-3xl ${
              isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'
            }`}>
              Proves that two distinct candidates applying for the same Job Description receive 100% unique,
              non-cloned, fingerprint-based resumes rather than generic template copies.
            </p>
          </div>

          <button
            onClick={handleRunUniquenessTest}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Evaluating Dual Candidates...' : 'Run Carbon Copy Check'}
          </button>
        </div>

        {error && (
          <div className={`mt-4 p-4 border text-xs font-mono rounded ${
            isLight
              ? 'bg-rose-50 border-rose-200 text-rose-900 font-medium'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}>
            <span className="font-bold uppercase tracking-wider">Evaluation Error:</span> {error}
          </div>
        )}
      </div>

      {/* Results Header Banner */}
      {uniquenessResult && (
        <div
          className={`border rounded-xl p-5 shadow-xl transition-all ${
            isHighSimilarity
              ? isLight ? 'bg-rose-50 border-rose-300 text-rose-950' : 'bg-rose-950/80 border-rose-500/50 text-white'
              : isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-emerald-950/60 border-emerald-500/40 text-white'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold font-mono uppercase ${
                    isHighSimilarity
                      ? isLight ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : isLight ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {uniquenessResult.risk_flag}
                </span>

                <span className={`text-xs font-medium ${isLight ? 'text-slate-800 font-bold' : 'text-slate-200'}`}>
                  Cosine Similarity Score:
                </span>
                <span className={`text-xl font-extrabold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {(uniquenessResult.cosine_similarity_score * 100).toFixed(1)}%
                </span>
              </div>

              <p className={`text-xs mt-2 font-mono ${isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>{uniquenessResult.recommendation}</p>
            </div>

            {uniquenessResult.shared_phrases && uniquenessResult.shared_phrases.length > 0 && (
              <div className={`p-3 rounded-lg border text-xs max-w-sm ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-slate-950/80 border-slate-800/80 text-slate-200'
              }`}>
                <span className={`text-[10px] uppercase font-mono block mb-1 ${
                  isLight ? 'text-slate-600 font-bold' : 'text-slate-400'
                }`}>
                  Shared Phrase Overlaps ({uniquenessResult.shared_phrases.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {uniquenessResult.shared_phrases.slice(0, 4).map((phrase, i) => (
                    <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isLight ? 'bg-slate-100 text-slate-900 border border-slate-300 font-bold' : 'bg-slate-800 text-slate-300'
                    }`}>
                      "{phrase}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side-by-side Dual Candidates Input / Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidate A Card */}
        <div className={`border rounded-xl p-5 shadow-xl flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div>
            <div className={`flex items-center justify-between mb-3 border-b pb-3 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <span className={`text-xs uppercase tracking-wider font-mono ${
                isLight ? 'text-blue-700 font-black' : 'text-blue-500 font-bold'
              }`}>
                Candidate A Input
              </span>
              <input
                type="text"
                value={candidateAName}
                onChange={(e) => setCandidateAName(e.target.value)}
                className={`border rounded px-2 py-1 text-xs font-bold ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <textarea
              rows={8}
              value={candidateA}
              onChange={(e) => setCandidateA(e.target.value)}
              className={`w-full border rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-blue-500 mb-4 ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                  : 'bg-slate-950 border-slate-800 text-slate-300 placeholder-zinc-500'
              }`}
              placeholder="Paste Candidate A raw resume..."
            />

            {resumeAOutput && (
              <div className={`rounded-lg p-4 border text-xs ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}>
                <h4 className={`font-bold text-sm border-b pb-1 mb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>{resumeAOutput.candidate_name}</h4>
                <p className={`text-[11px] italic mb-3 ${isLight ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{resumeAOutput.summary}</p>
                <span className={`text-[10px] font-bold uppercase block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Key Experience Bullets:</span>
                <ul className={`space-y-1 text-[11px] ${isLight ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>
                  {resumeAOutput.tailored_experience?.[0]?.bullets?.slice(0, 3).map((b: any, idx: number) => (
                    <li key={idx}>• {b.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Candidate B Card */}
        <div className={`border rounded-xl p-5 shadow-xl flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div>
            <div className={`flex items-center justify-between mb-3 border-b pb-3 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}>
              <span className={`text-xs uppercase tracking-wider font-mono ${
                isLight ? 'text-emerald-700 font-black' : 'text-emerald-500 font-bold'
              }`}>
                Candidate B Input
              </span>
              <input
                type="text"
                value={candidateBName}
                onChange={(e) => setCandidateBName(e.target.value)}
                className={`border rounded px-2 py-1 text-xs font-bold ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>

            <textarea
              rows={8}
              value={candidateB}
              onChange={(e) => setCandidateB(e.target.value)}
              className={`w-full border rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-emerald-500 mb-4 ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400'
                  : 'bg-slate-950 border-slate-800 text-slate-300 placeholder-zinc-500'
              }`}
              placeholder="Paste Candidate B raw resume..."
            />

            {resumeBOutput && (
              <div className={`rounded-lg p-4 border text-xs ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-200'
              }`}>
                <h4 className={`font-bold text-sm border-b pb-1 mb-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>{resumeBOutput.candidate_name}</h4>
                <p className={`text-[11px] italic mb-3 ${isLight ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{resumeBOutput.summary}</p>
                <span className={`text-[10px] font-bold uppercase block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Key Experience Bullets:</span>
                <ul className={`space-y-1 text-[11px] ${isLight ? 'text-slate-800 font-medium' : 'text-slate-300'}`}>
                  {resumeBOutput.tailored_experience?.[0]?.bullets?.slice(0, 3).map((b: any, idx: number) => (
                    <li key={idx}>• {b.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
