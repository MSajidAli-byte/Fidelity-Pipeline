import React from 'react';
import { EvidenceSelectionOutput, FactBank } from '../types';
import { CheckSquare, AlertTriangle, XCircle, CheckCircle2, ShieldCheck, Tag, Cpu } from 'lucide-react';

interface EvidenceMatchMatrixProps {
  evidenceSelection: EvidenceSelectionOutput | null;
  factBank: FactBank | null;
  theme?: 'dark' | 'light';
}

export const EvidenceMatchMatrix: React.FC<EvidenceMatchMatrixProps> = ({
  evidenceSelection,
  factBank,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  if (!evidenceSelection) {
    return (
      <div className={`border rounded-xl p-8 text-center transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
      }`}>
        <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>No Evidence Match Data</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Run Stage 3 (Prompt A: Evidence Selector) to map candidate Fact Bank items against JD requirements and flag missing skills.
        </p>
      </div>
    );
  }

  const selectedFactItems =
    factBank?.fact_bank.filter((f) => evidenceSelection.evidence_ids.includes(f.id)) || [];

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
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <h3 className={`text-base font-bold flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Stage 3: Evidence Matcher (Prompt A - Fact-Checking Auditor)
            </h3>
          </div>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Logic Layer: Selects verified evidence and explicitly flags unverified/missing skills to prevent hallucination.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className={`border rounded-lg p-2.5 text-right ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
          }`}>
            <span className={`text-[10px] block uppercase font-mono ${
              isLight ? 'text-slate-600 font-bold' : 'text-slate-400'
            }`}>Candidate Fit Score</span>
            <span
              className={`text-lg font-extrabold font-mono ${
                evidenceSelection.overall_fit_score >= 80
                  ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                  : evidenceSelection.overall_fit_score >= 60
                  ? isLight ? 'text-amber-700' : 'text-amber-400'
                  : isLight ? 'text-rose-700' : 'text-rose-400'
              }`}
            >
              {evidenceSelection.overall_fit_score} / 100
            </span>
          </div>
        </div>
      </div>

      {/* Selected Evidence IDs Pills */}
      <div className={`border rounded-lg p-3.5 mb-5 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs font-bold flex items-center gap-1.5 ${
            isLight ? 'text-slate-900' : 'text-slate-200'
          }`}>
            <ShieldCheck className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            Verified Evidence Fact IDs Passed to Generator ({evidenceSelection.evidence_ids?.length || 0}):
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {evidenceSelection.evidence_ids?.map((id) => {
            const item = factBank?.fact_bank.find((f) => f.id === id);
            return (
              <span
                key={id}
                title={item?.bullet}
                className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1 cursor-help border ${
                  isLight
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}
              >
                <span>{id}</span>
                {item && <span className="text-[10px] opacity-75">({item.company})</span>}
              </span>
            );
          })}
        </div>
      </div>

      {/* Matrix Table */}
      <div className={`overflow-x-auto border rounded-lg mb-5 ${
        isLight ? 'border-slate-200' : 'border-slate-800'
      }`}>
        <table className="w-full text-left text-xs">
          <thead className={`font-mono text-[11px] uppercase border-b ${
            isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}>
            <tr>
              <th className="p-3">Job Requirement</th>
              <th className="p-3">Type</th>
              <th className="p-3">Fidelity Status</th>
              <th className="p-3">Matched Fact IDs</th>
              <th className="p-3">Auditor Notes</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${
            isLight ? 'divide-slate-200 bg-white' : 'divide-slate-800/60 bg-slate-900/50'
          }`}>
            {evidenceSelection.matches?.map((match, idx) => {
              const isMatched = match.status === 'matched';
              const isMissing = match.status === 'missing';

              return (
                <tr key={idx} className={`transition-colors ${
                  isLight ? 'hover:bg-slate-50 text-slate-900' : 'hover:bg-slate-800/40 text-white'
                }`}>
                  <td className={`p-3 font-medium max-w-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{match.requirement}</td>

                  <td className="p-3">
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                      isLight ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {match.requirement_type || 'Requirement'}
                    </span>
                  </td>

                  <td className="p-3">
                    {isMatched ? (
                      <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] border ${
                        isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                      </span>
                    ) : isMissing ? (
                      <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] border ${
                        isLight ? 'bg-rose-100 text-rose-900 border-rose-300' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      }`}>
                        <XCircle className="w-3.5 h-3.5" /> Missing (Flagged)
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] border ${
                        isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5" /> Partial
                      </span>
                    )}
                  </td>

                  <td className="p-3 font-mono font-bold">
                    {match.matched_fact_ids && match.matched_fact_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {match.matched_fact_ids.map((fid) => (
                          <span
                            key={fid}
                            className={`px-1.5 py-0.5 rounded border text-[11px] ${
                              isLight ? 'text-blue-900 bg-blue-100 border-blue-300 font-bold' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                            }`}
                          >
                            {fid}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={`italic text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>None (Prevented Hallucination)</span>
                    )}
                  </td>

                  <td className={`p-3 text-[11px] leading-snug max-w-sm ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>{match.notes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Domain Overlap & Missing Items Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`border p-3.5 rounded-lg ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <h4 className={`text-xs font-bold flex items-center gap-1.5 mb-2 ${
            isLight ? 'text-purple-900' : 'text-slate-300'
          }`}>
            <Tag className="w-3.5 h-3.5 text-purple-500" />
            Domain Synergy & Overlap
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {evidenceSelection.domain_overlap?.map((d, i) => (
              <span
                key={i}
                className={`border px-2 py-0.5 rounded text-[11px] font-bold ${
                  isLight ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                }`}
              >
                {d}
              </span>
            ))}
          </div>
        </div>

        <div className={`border p-3.5 rounded-lg ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
        }`}>
          <h4 className={`text-xs font-bold flex items-center gap-1.5 mb-2 ${
            isLight ? 'text-rose-900' : 'text-slate-300'
          }`}>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            Missing Requirements (Guaranteed Omitted in Stage 4 Output)
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {evidenceSelection.missing_requirements?.map((m, i) => (
              <span
                key={i}
                className={`border px-2 py-0.5 rounded text-[11px] font-bold ${
                  isLight ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                }`}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
