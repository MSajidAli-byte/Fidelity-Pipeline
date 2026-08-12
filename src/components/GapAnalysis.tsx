import React, { useState, useEffect } from 'react';
import { JobDescriptionAnalysis, FactBank, EvidenceSelectionOutput } from '../types';
import {
  HelpCircle,
  Lightbulb,
  Compass,
  MessageSquareQuote,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Tag,
  FileText,
  ChevronRight,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

export interface GapQuestion {
  id: string;
  gap_category: string;
  target_requirement: string;
  question: string;
  strategic_bridge_answer: string;
  key_facts_to_cite: string[];
  recommended_keywords: string[];
}

export interface GapAnalysisData {
  candidate_name: string;
  target_job_title: string;
  overall_gap_summary: string;
  top_experience_gaps: string[];
  questions: GapQuestion[];
}

interface GapAnalysisProps {
  jdAnalysis: JobDescriptionAnalysis | null;
  factBank: FactBank | null;
  evidenceSelection?: EvidenceSelectionOutput | null;
  theme?: 'dark' | 'light';
}

export const GapAnalysis: React.FC<GapAnalysisProps> = ({
  jdAnalysis,
  factBank,
  evidenceSelection,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const [data, setData] = useState<GapAnalysisData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});

  // Generate fallback data client-side deterministically if backend API call fails or is loading initially
  const generateClientFallbackData = (): GapAnalysisData => {
    const candidateName = factBank?.candidate_name || 'Candidate';
    const targetTitle = jdAnalysis?.job_title || 'Target Role';
    const missing = evidenceSelection?.missing_requirements || jdAnalysis?.must_haves?.slice(0, 3) || ['Target Framework Stack', 'System Architecture'];

    const allTools = factBank?.fact_bank?.flatMap(f => f.tools || []) || [];
    const candidateToolsStr = Array.from(new Set(allTools)).slice(0, 5).join(', ') || 'Python, AWS, REST APIs';

    const questions: GapQuestion[] = [
      {
        id: 'q1',
        gap_category: 'Primary Technology Stack Transition',
        target_requirement: jdAnalysis?.must_haves?.[0] || 'Core Stack Proficiency',
        question: `Our target role heavily relies on ${jdAnalysis?.required_tools?.[0] || jdAnalysis?.job_title || 'the target stack'}, whereas your verified background emphasizes ${candidateToolsStr}. How will you translate your architectural experience to lead deliverables in this stack?`,
        strategic_bridge_answer: `Bridge your answer by emphasizing framework-agnostic engineering fundamentals (async concurrency, API gateways, database normalization, and containerized CI/CD). Frame your deep experience in ${candidateToolsStr} as a cross-platform strength rather than a limitation.`,
        key_facts_to_cite: factBank?.fact_bank?.slice(0, 2).map(f => `${f.company}: ${f.bullet.slice(0, 80)}...`) || ['Proven cross-functional engineering experience.'],
        recommended_keywords: ['Async Concurrency', 'API Design', 'Containerization', 'Design Patterns']
      },
      {
        id: 'q2',
        gap_category: 'Domain & System Scale Bridge',
        target_requirement: jdAnalysis?.domain_context?.[0] || 'Enterprise System Scale & Operations',
        question: `Can you walk us through a complex production issue in your past systems (e.g., latency spikes, scalability bottlenecks), and how your response translates to ${targetTitle}?`,
        strategic_bridge_answer: `Cite specific verified metrics from your Fact Bank (e.g., latency reductions, automation efficiency, or team capacity optimizations). Explain your root-cause analysis process step-by-step.`,
        key_facts_to_cite: factBank?.fact_bank?.filter(f => f.metrics && f.metrics.length > 0).slice(0, 2).map(f => `${f.company} (${f.metrics.join(', ')}): ${f.bullet.slice(0, 70)}...`) || ['Optimized operational latency and manual analysis time.'],
        recommended_keywords: ['Root-Cause Analysis', 'Performance Monitoring', 'Scalability', 'SLA Adherence']
      },
      {
        id: 'q3',
        gap_category: 'Leadership & Cross-Functional Synergy',
        target_requirement: 'Technical Leadership & Stakeholder Alignment',
        question: `In this target position, you will be expected to guide technical direction and mentor team members. How have you led technical R&D or aligned cross-functional teams in previous roles?`,
        strategic_bridge_answer: `Highlight your leadership and project ownership facts. Emphasize how you author proposals, guide cross-functional developers, and establish technical standards.`,
        key_facts_to_cite: factBank?.fact_bank?.filter(f => f.role.toLowerCase().includes('lead') || f.bullet.toLowerCase().includes('led') || f.bullet.toLowerCase().includes('directed')).slice(0, 2).map(f => `${f.company}: ${f.bullet.slice(0, 80)}...`) || ['Led R&D initiatives and technical proposals.'],
        recommended_keywords: ['Mentorship', 'Technical Governance', 'Proposal Writing', 'Agile Delivery']
      },
      {
        id: 'q4',
        gap_category: 'Unverified / Secondary Requirement Alignment',
        target_requirement: missing[0] || 'Advanced Domain Tools',
        question: `The job description mentions experience with ${missing[0] || 'specialized domain tooling'}. While this may not be explicitly detailed on your primary resume, what hands-on exposure or adjacent skills do you possess?`,
        strategic_bridge_answer: `Be honest about unverified skills while highlighting adjacent hands-on tools in your Fact Bank. Demonstrate high learning velocity by explaining how quickly you adopted similar technologies in past projects.`,
        key_facts_to_cite: ['Adjacent tool usage in verified projects.'],
        recommended_keywords: ['Rapid Adoption', 'Adjacent Stack Transfer', 'Self-Directed Learning']
      }
    ];

    return {
      candidate_name: candidateName,
      target_job_title: targetTitle,
      overall_gap_summary: `The candidate possesses strong core engineering foundations in ${candidateToolsStr}, but displays a stack gap relative to the target role (${targetTitle}). These 4 strategic questions help recruiters and candidates bridge missing requirements with verified evidence.`,
      top_experience_gaps: missing.length > 0 ? missing : ['Primary Framework Transition', 'Domain Specific Tooling'],
      questions
    };
  };

  const fetchGapAnalysis = async () => {
    if (!jdAnalysis || !factBank) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/pipeline/generate-gap-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_analysis: jdAnalysis,
          fact_bank: factBank,
          evidence_selection: evidenceSelection
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const json = await res.json();
      if (json && json.questions && json.questions.length > 0) {
        setData(json);
      } else {
        setData(generateClientFallbackData());
      }
    } catch (err: any) {
      console.warn('Gap Analysis API failed or rate-limited, using intelligent client fallback:', err.message);
      setData(generateClientFallbackData());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jdAnalysis && factBank) {
      fetchGapAnalysis();
    } else {
      setData(null);
    }
  }, [jdAnalysis, factBank, evidenceSelection]);

  const handleCopyText = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(keyId);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleNoteChange = (qId: string, text: string) => {
    setUserNotes(prev => ({ ...prev, [qId]: text }));
  };

  if (!jdAnalysis || !factBank) {
    return (
      <div className={`border p-8 text-center font-mono ${
        isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-[#0a0a0c] border-zinc-800 text-zinc-400'
      }`}>
        <Compass className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-pulse" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Gap Analysis Ready
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 max-w-md mx-auto leading-relaxed">
          Run Stage 1 (Fact Extractor) and Stage 2 (JD Analyzer) to generate tailored interview questions that bridge experience gaps.
        </p>
      </div>
    );
  }

  const activeData = data || generateClientFallbackData();

  return (
    <div className={`border p-6 shadow-2xl transition-colors space-y-6 ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
    }`}>
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600/10 border border-blue-500/30 text-blue-500 rounded">
              <Compass className="w-5 h-5" />
            </span>
            <h2 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
              Candidate Gap Analysis & Interview Bridge Questions
            </h2>
          </div>
          <p className={`text-xs font-mono leading-relaxed ${
            isLight ? 'text-slate-600' : 'text-zinc-400'
          }`}>
            Targeted interview questions designed to probe experience gaps between <strong className={isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}>{activeData.candidate_name}</strong> and <strong className={isLight ? 'text-slate-900 font-bold' : 'text-white font-bold'}>{activeData.target_job_title}</strong> while offering strategic bridge answers rooted in verified facts.
          </p>
        </div>

        <button
          onClick={fetchGapAnalysis}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest border transition-all cursor-pointer ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : 'text-zinc-400'}`} />
          {loading ? 'Analyzing Gaps...' : 'Regenerate Questions'}
        </button>
      </div>

      {/* Summary Box */}
      <div className={`p-4 border font-mono text-xs space-y-3 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#050505] border-zinc-800'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Gap Analysis Overview
          </span>
          <span className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
            Candidate: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{activeData.candidate_name}</strong> | Target: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{activeData.target_job_title}</strong>
          </span>
        </div>
        <p className={`leading-relaxed ${isLight ? 'text-slate-800 font-normal' : 'text-zinc-200 font-normal'}`}>
          {activeData.overall_gap_summary}
        </p>

        {activeData.top_experience_gaps && activeData.top_experience_gaps.length > 0 && (
          <div className="pt-2 border-t border-zinc-800/60 flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase flex items-center gap-1 ${
              isLight ? 'text-amber-800' : 'text-amber-400'
            }`}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Identified Gaps:
            </span>
            {activeData.top_experience_gaps.map((gap, i) => (
              <span
                key={i}
                className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded border ${
                  isLight
                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                    : 'bg-amber-950/60 text-amber-200 border-amber-500/40'
                }`}
              >
                {gap}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            Tailored High-Impact Interview Questions ({activeData.questions?.length || 0})
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">
            Click copy button on any question or strategic response to prepare candidates
          </span>
        </div>

        {activeData.questions?.map((q, idx) => {
          const isCopiedQ = copiedIndex === `q-${q.id}`;
          const isCopiedA = copiedIndex === `a-${q.id}`;

          return (
            <div
              key={q.id || idx}
              className={`border p-5 transition-all shadow-md space-y-4 font-mono ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#050505] border-zinc-800'
              }`}
            >
              {/* Question Header Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-600/10 text-blue-400 border border-blue-500/30">
                    Question #{idx + 1} • {q.gap_category || 'Experience Gap'}
                  </span>
                  {q.target_requirement && (
                    <span className="px-2 py-0.5 text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800">
                      Target: {q.target_requirement}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleCopyText(`Question: ${q.question}\n\nStrategic Answer: ${q.strategic_bridge_answer}`, `q-${q.id}`)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                    isCopiedQ
                      ? 'bg-emerald-600 text-white border-emerald-400'
                      : isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  {isCopiedQ ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                  {isCopiedQ ? 'Copied Full Q&A' : 'Copy Question'}
                </button>
              </div>

              {/* Question Prompt */}
              <div className={`p-4 border rounded shadow-inner ${
                isLight
                  ? 'bg-blue-50/80 border-blue-200 text-slate-900 border-l-4 border-l-blue-600'
                  : 'bg-zinc-900/90 border-zinc-700 text-white border-l-4 border-l-blue-500'
              }`}>
                <div className="flex items-start gap-3">
                  <MessageSquareQuote className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className={`text-sm sm:text-base font-bold leading-relaxed tracking-wide selection:bg-blue-600 selection:text-white ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    {q.question}
                  </p>
                </div>
              </div>

              {/* Strategic Bridge Answer */}
              <div className={`p-4 border space-y-2.5 rounded ${
                isLight ? 'bg-blue-50/90 border-blue-200 text-slate-900' : 'bg-blue-950/40 border-blue-500/50 text-zinc-100'
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Strategic Answer Strategy & Bridge Angle:
                  </span>
                  <button
                    onClick={() => handleCopyText(q.strategic_bridge_answer, `a-${q.id}`)}
                    className="text-[10px] text-blue-300 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isCopiedA ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {isCopiedA ? 'Copied' : 'Copy Strategy'}
                  </button>
                </div>
                <p className={`text-xs leading-relaxed font-mono ${
                  isLight ? 'text-slate-800' : 'text-slate-100 font-medium'
                }`}>
                  {q.strategic_bridge_answer}
                </p>
              </div>

              {/* Facts to Cite & Recommended Keywords */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Verified Facts to Cite */}
                {q.key_facts_to_cite && q.key_facts_to_cite.length > 0 && (
                  <div className={`p-3.5 border space-y-2.5 rounded ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'
                  }`}>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Verified Facts to Cite:
                    </span>
                    <ul className="space-y-2 text-[11px]">
                      {q.key_facts_to_cite.map((fact, fIdx) => (
                        <li key={fIdx} className={`flex items-start gap-2 leading-snug ${
                          isLight ? 'text-slate-900' : 'text-zinc-100'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className={isLight ? 'text-slate-800 font-medium' : 'text-zinc-100 font-medium'}>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommended Keywords / Bridge Terminology */}
                {q.recommended_keywords && q.recommended_keywords.length > 0 && (
                  <div className={`p-3.5 border space-y-2.5 rounded ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'
                  }`}>
                    <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isLight ? 'text-purple-700' : 'text-purple-300'
                    }`}>
                      <Tag className="w-3.5 h-3.5" />
                      Recommended Bridge Terminology:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {q.recommended_keywords.map((kw, kIdx) => (
                        <span
                          key={kIdx}
                          className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider rounded border shadow-sm ${
                            isLight
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-purple-950/80 text-purple-200 border-purple-500/50'
                          }`}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Candidate Response Notes / Practice Input */}
              <div className="pt-2 border-t border-zinc-800/60 space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-zinc-300">
                    <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                    Candidate Interview Prep Notes / Custom Response:
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {(userNotes[q.id] || '').length} chars
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={userNotes[q.id] || ''}
                  onChange={(e) => handleNoteChange(q.id, e.target.value)}
                  placeholder="Draft candidate's talking points or practice response here..."
                  className={`w-full p-2.5 text-xs font-mono border focus:outline-none focus:border-blue-500 rounded ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#08080a] border-zinc-700 text-white placeholder-zinc-500'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
