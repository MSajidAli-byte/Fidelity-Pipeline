import React from 'react';
import { JobDescriptionAnalysis } from '../types';
import { Target, CheckCircle2, Wrench, Globe, ListChecks, Award } from 'lucide-react';

interface JdAnalysisViewProps {
  jdAnalysis: JobDescriptionAnalysis | null;
  rawJdText?: string;
  theme?: 'dark' | 'light';
}

export const JdAnalysisView: React.FC<JdAnalysisViewProps> = ({ jdAnalysis, theme = 'dark' }) => {
  const isLight = theme === 'light';

  if (!jdAnalysis) {
    return (
      <div className={`border rounded-xl p-8 text-center transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-900 border-slate-800 text-slate-400'
      }`}>
        <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>No JD Analysis Available</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Run Stage 2 to extract Must-haves, Nice-to-haves, and required technical stack from the Job Description.
        </p>
      </div>
    );
  }

  return (
    <div className={`border rounded-xl p-5 shadow-xl transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
    }`}>
      <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Stage 2: Target JD Requirements
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Role: <strong className="text-white">{jdAnalysis.job_title}</strong> {jdAnalysis.company ? `@ ${jdAnalysis.company}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Must-Haves */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-emerald-400" />
            Must-Have Qualifications ({jdAnalysis.must_haves?.length || 0})
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            {jdAnalysis.must_haves?.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Required Tools */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-blue-400" />
            Required Tools & Tech Stack ({jdAnalysis.required_tools?.length || 0})
          </h4>
          <div className="flex flex-wrap gap-2">
            {jdAnalysis.required_tools?.map((tool, idx) => (
              <span
                key={idx}
                className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded text-xs font-mono font-medium"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>

        {/* Nice-to-haves */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-amber-400" />
            Nice-to-Have Requirements ({jdAnalysis.nice_to_haves?.length || 0})
          </h4>
          <ul className="space-y-2 text-xs text-slate-300">
            {jdAnalysis.nice_to_haves?.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Domain Context */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-purple-400" />
            Domain Context & Industry Needs
          </h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {jdAnalysis.domain_context?.map((domain, idx) => (
              <span
                key={idx}
                className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded text-xs font-medium"
              >
                {domain}
              </span>
            ))}
          </div>

          {jdAnalysis.key_responsibilities && jdAnalysis.key_responsibilities.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Key Duties:</span>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {jdAnalysis.key_responsibilities.slice(0, 3).map((resp, idx) => (
                  <li key={idx} className="line-clamp-2 text-slate-400">
                    • {resp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
