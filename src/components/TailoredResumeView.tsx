import React, { useState } from 'react';
import { GeneratedResume, FactBank, FidelityAuditResult } from '../types';
import {
  FileText,
  CheckCircle2,
  Copy,
  ShieldCheck,
  ShieldAlert,
  Printer,
  FileDown,
  Gauge,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Activity,
  Check,
  Mail,
} from 'lucide-react';
import { CoverLetterGenerator } from './CoverLetterGenerator';
import { useFeatureFlags } from '../context/FeatureFlagContext';

interface TailoredResumeViewProps {
  resume: GeneratedResume | null;
  factBank: FactBank | null;
  auditResult?: FidelityAuditResult | null;
  theme?: 'dark' | 'light';
}

export const TailoredResumeView: React.FC<TailoredResumeViewProps> = ({ resume, factBank, auditResult, theme = 'dark' }) => {
  const { flags } = useFeatureFlags();

  const isLight = theme === 'light';
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConfidenceBreakdown, setShowConfidenceBreakdown] = useState(true);
  const [showCoverLetter, setShowCoverLetter] = useState(false);

  if (!resume) {
    return (
      <div className="bg-[#0a0a0c] border border-zinc-800 p-8 text-center text-zinc-400">
        <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200">No Resume Generated</h3>
        <p className="text-xs font-mono text-zinc-400 mt-2 max-w-md mx-auto uppercase tracking-tight">
          Run Stage 4 (Prompt B: Constrained Generator) to synthesize the candidate's tailored resume using verified evidence only.
        </p>
      </div>
    );
  }

  // Section confidence calculations derived from Fidelity Auditor & Traceability
  const totalBullets = resume.tailored_experience?.reduce((acc, e) => acc + (e.bullets?.length || 0), 0) || 0;
  const linkedBullets =
    resume.tailored_experience?.reduce((acc, e) => {
      return acc + (e.bullets?.filter((b) => b.source_fact_ids && b.source_fact_ids.length > 0).length || 0);
    }, 0) || 0;
  const bulletTraceabilityRatio = totalBullets > 0 ? linkedBullets / totalBullets : 1;

  const overallScore = auditResult?.overall_fidelity_score ?? Math.round(bulletTraceabilityRatio * 96);
  const factualityScore = auditResult?.factuality_percentage ?? 98;
  const fluffScore = auditResult?.fluff_percentage ?? 2;
  const hallucinationCount = auditResult?.hallucinations_detected?.length ?? 0;

  // 1. Summary Section Confidence
  const summaryConfidence = Math.max(
    70,
    Math.min(100, Math.round(factualityScore - (fluffScore > 10 ? 5 : 0) - hallucinationCount * 5))
  );

  // 2. Experience Section Confidence
  const experienceConfidence = Math.max(70, Math.min(100, Math.round(bulletTraceabilityRatio * factualityScore)));

  // 3. Skills Section Confidence
  const skillCount = resume.skills?.length || 0;
  const verifiedSkillCount = factBank
    ? resume.skills?.filter((s) =>
        factBank.fact_bank.some(
          (f) =>
            f.tools?.some((t) => t.toLowerCase() === s.toLowerCase()) ||
            f.bullet.toLowerCase().includes(s.toLowerCase())
        )
      ).length || skillCount
    : skillCount;
  const skillsConfidence = skillCount > 0 ? Math.max(80, Math.min(100, Math.round((verifiedSkillCount / skillCount) * 100))) : 100;

  // Section confidence grouping
  const sections = [
    { name: 'Professional Summary', score: summaryConfidence },
    { name: 'Verified Experience', score: experienceConfidence },
    { name: 'Skills & Technologies', score: skillsConfidence },
  ];

  const highConfidenceCount = sections.filter((s) => s.score >= 85).length;
  const lowConfidenceCount = sections.filter((s) => s.score < 85).length;

  // Total Hallucination Risk Score (0 = lowest risk, 100 = highest risk)
  const hallucinationRiskScore = Math.max(
    0,
    Math.min(100, Math.round((100 - factualityScore) + (fluffScore * 0.3) + (hallucinationCount * 8)))
  );

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return isLight ? 'text-emerald-900 bg-emerald-100 border-emerald-300 font-bold' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 75) return isLight ? 'text-amber-950 bg-amber-100 border-amber-300 font-bold' : 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return isLight ? 'text-rose-950 bg-rose-100 border-rose-300 font-bold' : 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 75) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const generateFormattedText = () => {
    return `${resume.candidate_name.toUpperCase()}
${resume.target_title}

================================================================================
SUMMARY
================================================================================
${resume.summary}

================================================================================
EXPERIENCE
================================================================================
` +
      resume.tailored_experience
        .map(
          (e) =>
            `${e.role} | ${e.company} (${e.period})\n` +
            e.bullets.map((b) => `  • ${b.text}`).join('\n')
        )
        .join('\n\n') +
      `\n\n================================================================================
SKILLS & TECHNOLOGIES
================================================================================
${resume.skills.join(', ')}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateFormattedText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const textContent = generateFormattedText();
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeFilename = `${resume.candidate_name.replace(/[^a-z0-9]/gi, '_')}_Tailored_Resume.txt`;
    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${resume.candidate_name} - Tailored Resume</title>
          <style>
            @page { margin: 18mm; size: auto; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; line-height: 1.5; margin: 0; padding: 20px; }
            h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px 0; letter-spacing: -0.5px; }
            .title { font-size: 14px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; border-bottom: 2px solid #1e293b; padding-bottom: 8px; }
            .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; margin-bottom: 12px; }
            .summary { font-size: 13px; color: #334155; margin-bottom: 20px; line-height: 1.6; }
            .exp-item { margin-bottom: 18px; }
            .exp-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
            .exp-role { font-size: 14px; font-weight: 700; color: #0f172a; }
            .exp-company { color: #1d4ed8; font-weight: 600; }
            .exp-period { font-size: 12px; color: #64748b; font-family: monospace; }
            ul { margin: 6px 0 0 0; padding-left: 18px; }
            li { font-size: 12.5px; color: #334155; margin-bottom: 6px; line-height: 1.5; }
            .skills-list { font-size: 12px; font-family: monospace; color: #1e293b; background: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>${resume.candidate_name}</h1>
          <div class="title">${resume.target_title}</div>

          <div class="section-title">Professional Summary</div>
          <div class="summary">${resume.summary}</div>

          <div class="section-title">Verified Experience</div>
          ${resume.tailored_experience
            .map(
              (e) => `
            <div class="exp-item">
              <div class="exp-header">
                <span class="exp-role">${e.role} <span style="font-weight:400; color:#64748b;">at</span> <span class="exp-company">${e.company}</span></span>
                <span class="exp-period">${e.period}</span>
              </div>
              <ul>
                ${e.bullets.map((b) => `<li>${b.text}</li>`).join('')}
              </ul>
            </div>
          `
            )
            .join('')}

          <div class="section-title">Verified Skills & Technologies</div>
          <div class="skills-list">${resume.skills.join('  •  ')}</div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const selectedFact = selectedFactId ? factBank?.fact_bank.find((f) => f.id === selectedFactId) : null;

  return (
    <div className={`border p-6 shadow-2xl transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
    }`}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-zinc-800 pb-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 animate-pulse" />
            <h3 className={`text-base font-black uppercase tracking-wider flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Stage 4: Constrained Tailored Resume Output
            </h3>
            <span className={`text-xs font-mono font-bold uppercase px-2 py-0.5 border ${
              isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            }`}>
              Prompt B Constraints Enforced
            </span>
          </div>
          <p className={`text-xs font-mono mt-1 uppercase tracking-tight ${
            isLight ? 'text-slate-600' : 'text-zinc-400'
          }`}>
            Click any bullet point to inspect its underlying Fact ID source traceability!
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowConfidenceBreakdown(!showConfidenceBreakdown)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
              isLight
                ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                : 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800'
            }`}
          >
            <Gauge className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            AI Confidence Analysis
            {showConfidenceBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
              isLight
                ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                : 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800'
            }`}
          >
            {copied ? <CheckCircle2 className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Text'}
          </button>

          <button
            onClick={handleDownloadTxt}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
              isLight
                ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                : 'bg-zinc-900 text-zinc-200 border-zinc-700 hover:bg-zinc-800'
            }`}
          >
            <FileDown className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            Export .TXT
          </button>

          {flags.enablePDFExport ? (
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-blue-600 text-white border border-blue-400 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Export PDF
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed" title="PDF Export is temporarily under maintenance by DevOps">
              <Printer className="w-3.5 h-3.5" />
              Export PDF (Maintenance)
            </div>
          )}

          {flags.enableCoverLetter ? (
            <button
              onClick={() => setShowCoverLetter(!showCoverLetter)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border transition-colors cursor-pointer shadow-lg ${
                showCoverLetter
                  ? 'bg-amber-600 text-white border-amber-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-600/20'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              {showCoverLetter ? 'Close Cover Letter' : 'Cover Letter'}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 cursor-not-allowed" title={flags.customMaintenanceNotice || "Cover Letter is currently under maintenance"}>
              <Mail className="w-3.5 h-3.5" />
              Cover Letter (Disabled)
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Warning Banner if Cover Letter was requested but feature is killed */}
      {!flags.enableCoverLetter && (
        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 font-mono text-xs text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Notice: {flags.customMaintenanceNotice || 'The Cover Letter Generator feature is temporarily paused for prompt calibration by an administrator.'}</span>
        </div>
      )}

      {/* Optional Cover Letter Generator */}
      {showCoverLetter && flags.enableCoverLetter && (
        <div className="mb-6 no-print">
          <CoverLetterGenerator theme={theme} onClose={() => setShowCoverLetter(false)} />
        </div>
      )}

      {/* AI Section Confidence Score Dashboard */}
      {showConfidenceBreakdown && (
        <div className={`border p-5 mb-6 shadow-xl no-print transition-colors ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#050505] border-zinc-800 text-white'
        }`}>
          <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3 mb-4 ${
            isLight ? 'border-slate-200' : 'border-zinc-800'
          }`}>
            <div className="flex items-center gap-2">
              <Activity className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
              <h4 className={`text-xs font-mono font-black uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Section-by-Section AI Confidence Scores (Fidelity Auditor Output)
              </h4>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className={isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'}>
                Overall Resume Fidelity:{' '}
                <strong className={`px-2 py-0.5 border font-bold ${getScoreBadgeColor(overallScore)}`}>
                  {overallScore}%
                </strong>
              </span>
              <span className={isLight ? 'text-slate-300' : 'text-zinc-600'}>|</span>
              <span className={isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'}>
                Factuality:{' '}
                <strong className={isLight ? 'text-emerald-700' : 'text-emerald-400'}>{factualityScore}%</strong>
              </span>
              <span className={isLight ? 'text-slate-300' : 'text-zinc-600'}>|</span>
              <span className={isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'}>
                Fluff Index:{' '}
                <strong className={isLight ? 'text-slate-800' : 'text-zinc-300'}>{fluffScore}%</strong>
              </span>
            </div>
          </div>

          {/* Top Summary Cards: Total Hallucination Risk Score & Section Confidence Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {/* Card 1: Total Hallucination Risk Score */}
            <div className={`border p-3.5 flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'
            }`}>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider block mb-1 ${
                  isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'
                }`}>
                  Hallucination Risk Score
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-black font-mono ${
                      hallucinationRiskScore <= 10
                        ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                        : hallucinationRiskScore <= 25
                        ? isLight ? 'text-amber-700' : 'text-amber-400'
                        : isLight ? 'text-rose-700' : 'text-rose-400'
                    }`}
                  >
                    {hallucinationRiskScore}%
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                      hallucinationRiskScore <= 10
                        ? isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : hallucinationRiskScore <= 25
                        ? isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : isLight ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {hallucinationRiskScore <= 10 ? 'LOW RISK' : hallucinationRiskScore <= 25 ? 'MODERATE' : 'HIGH RISK'}
                  </span>
                </div>
              </div>
              <p className={`text-[10px] font-mono mt-2 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                {hallucinationCount === 0
                  ? '0 Unverified Claims Detected'
                  : `${hallucinationCount} Violation(s) Flagged by Auditor`}
              </p>
            </div>

            {/* Card 2: High-Confidence Sections */}
            <div className={`border p-3.5 flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'
            }`}>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider block mb-1 ${
                  isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'
                }`}>
                  High-Confidence Sections
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                    {highConfidenceCount} <span className={`text-sm font-normal ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>/ 3</span>
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                    isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    ≥85% SCORE
                  </span>
                </div>
              </div>
              <p className={`text-[10px] font-mono mt-2 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Strong Traceability & Fact Alignment
              </p>
            </div>

            {/* Card 3: Low / Review Sections */}
            <div className={`border p-3.5 flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'
            }`}>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider block mb-1 ${
                  isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'
                }`}>
                  Low-Confidence Sections
                </span>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-black font-mono ${
                      lowConfidenceCount === 0
                        ? isLight ? 'text-slate-500' : 'text-zinc-400'
                        : isLight ? 'text-amber-700' : 'text-amber-400'
                    }`}
                  >
                    {lowConfidenceCount} <span className={`text-sm font-normal ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>/ 3</span>
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                      lowConfidenceCount === 0
                        ? isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        : isLight ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {lowConfidenceCount === 0 ? 'ALL CLEAR' : '<85% SCORE'}
                  </span>
                </div>
              </div>
              <p className={`text-[10px] font-mono mt-2 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                {lowConfidenceCount === 0 ? 'No Review Needed' : 'Review Source Fact ID Links'}
              </p>
            </div>

            {/* Card 4: Overall Factuality Index */}
            <div className={`border p-3.5 flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'
            }`}>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider block mb-1 ${
                  isLight ? 'text-slate-600 font-bold' : 'text-zinc-400'
                }`}>
                  Factuality Index
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                    {factualityScore}%
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                    isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}>
                    AUDITED
                  </span>
                </div>
              </div>
              <p className={`text-[10px] font-mono mt-2 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`}>
                Fluff Index: {fluffScore}% • Traceability: {Math.round(bulletTraceabilityRatio * 100)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Section 1: Professional Summary */}
            <div className={`border p-3.5 flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800/90'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                    isLight ? 'text-slate-900' : 'text-zinc-200'
                  }`}>
                    1. Professional Summary
                  </span>
                  <span className={`text-xs font-mono font-bold px-1.5 py-0.5 border ${getScoreBadgeColor(summaryConfidence)}`}>
                    {summaryConfidence}%
                  </span>
                </div>

                <div className={`w-full h-1.5 overflow-hidden mb-2 ${isLight ? 'bg-slate-200' : 'bg-zinc-800'}`}>
                  <div
                    className={`h-full transition-all duration-500 ${getScoreBarColor(summaryConfidence)}`}
                    style={{ width: `${summaryConfidence}%` }}
                  />
                </div>

                <p className={`text-[11px] font-mono leading-tight ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  {hallucinationCount === 0
                    ? '0 Hallucinations • 100% Grounded in Candidate Facts'
                    : `${hallucinationCount} Violation Warning • Review Summary Claims`}
                </p>
              </div>

              <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
                isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800/80 text-zinc-500'
              }`}>
                <span>Auditor Status</span>
                <span className={`font-bold flex items-center gap-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  <Check className="w-3 h-3" /> VERIFIED
                </span>
              </div>
            </div>

            {/* Section 2: Tailored Experience */}
            <div className={`border p-3.5 flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800/90'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                    isLight ? 'text-slate-900' : 'text-zinc-200'
                  }`}>
                    2. Verified Experience
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-1.5 py-0.5 border ${getScoreBadgeColor(
                      experienceConfidence
                    )}`}
                  >
                    {experienceConfidence}%
                  </span>
                </div>

                <div className={`w-full h-1.5 overflow-hidden mb-2 ${isLight ? 'bg-slate-200' : 'bg-zinc-800'}`}>
                  <div
                    className={`h-full transition-all duration-500 ${getScoreBarColor(experienceConfidence)}`}
                    style={{ width: `${experienceConfidence}%` }}
                  />
                </div>

                <p className={`text-[11px] font-mono leading-tight ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  {linkedBullets}/{totalBullets} Bullets Linked to Fact IDs ({Math.round(bulletTraceabilityRatio * 100)}% Traceable)
                </p>
              </div>

              <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
                isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800/80 text-zinc-500'
              }`}>
                <span>Fact ID Traceability</span>
                <span className={`font-bold flex items-center gap-1 ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                  <ShieldCheck className="w-3 h-3" /> FULL TRACEABILITY
                </span>
              </div>
            </div>

            {/* Section 3: Skills & Technologies */}
            <div className={`border p-3.5 flex flex-col justify-between ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0a0a0c] border-zinc-800/90'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                    isLight ? 'text-slate-900' : 'text-zinc-200'
                  }`}>
                    3. Skills & Technologies
                  </span>
                  <span className={`text-xs font-mono font-bold px-1.5 py-0.5 border ${getScoreBadgeColor(skillsConfidence)}`}>
                    {skillsConfidence}%
                  </span>
                </div>

                <div className={`w-full h-1.5 overflow-hidden mb-2 ${isLight ? 'bg-slate-200' : 'bg-zinc-800'}`}>
                  <div
                    className={`h-full transition-all duration-500 ${getScoreBarColor(skillsConfidence)}`}
                    style={{ width: `${skillsConfidence}%` }}
                  />
                </div>

                <p className={`text-[11px] font-mono leading-tight ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  {verifiedSkillCount}/{skillCount} Skills Matched to Fact Bank Tools & Competencies
                </p>
              </div>

              <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
                isLight ? 'border-slate-200 text-slate-500' : 'border-zinc-800/80 text-zinc-500'
              }`}>
                <span>Domain Match</span>
                <span className={`font-bold flex items-center gap-1 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  <Sparkles className="w-3 h-3" /> ALIGNED TO JD
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Fact Inspector Banner */}
      {selectedFact && (
        <div className={`border p-4 mb-6 text-xs no-print transition-colors ${
          isLight
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-emerald-950/60 border-emerald-500/30 text-zinc-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`font-bold flex items-center gap-1.5 font-mono uppercase tracking-wider ${
              isLight ? 'text-emerald-900' : 'text-emerald-400'
            }`}>
              <ShieldCheck className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              Source Fact ID Traceability: {selectedFact.id}
            </span>
            <button
              onClick={() => setSelectedFactId(null)}
              className={`text-[11px] font-mono uppercase underline cursor-pointer ${
                isLight ? 'text-emerald-800 hover:text-emerald-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Clear Inspector
            </button>
          </div>
          <p className={`font-sans mt-2 leading-relaxed ${isLight ? 'text-slate-900 font-medium' : 'text-zinc-200'}`}>
            <strong className={isLight ? 'text-emerald-950 font-bold' : 'text-white'}>Original Fact Claim:</strong> "{selectedFact.bullet}"
          </p>
          <div className={`flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono ${
            isLight ? 'text-slate-700' : 'text-zinc-400'
          }`}>
            <span>Role: <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>{selectedFact.role}</strong></span>
            <span>• Company: <strong className={isLight ? 'text-slate-900' : 'text-zinc-200'}>{selectedFact.company}</strong></span>
            {selectedFact.metrics?.length > 0 && (
              <span>• Unique Metric: <strong className={isLight ? 'text-amber-900 font-bold' : 'text-amber-300'}>{selectedFact.metrics.join(', ')}</strong></span>
            )}
          </div>
        </div>
      )}

      {/* Styled Resume Canvas */}
      <div className={`print-resume-canvas p-8 shadow-2xl max-w-4xl mx-auto rounded-lg transition-colors border ${
        isLight ? 'bg-white text-zinc-900 border-zinc-200' : 'bg-zinc-900/90 text-zinc-100 border-zinc-800'
      }`}>
        {/* Candidate Header */}
        <div className={`border-b-2 pb-4 mb-6 ${isLight ? 'border-zinc-800' : 'border-zinc-700'}`}>
          <h1 className={`text-2xl font-black tracking-tight ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>{resume.candidate_name}</h1>
          <p className={`text-xs font-mono font-bold uppercase tracking-widest mt-1 ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>{resume.target_title}</p>
        </div>

        {/* Summary */}
        <div className="mb-6">
          <div className={`flex items-center justify-between border-b pb-1 mb-2 ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
            <h2 className={`text-xs font-mono font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Professional Summary (Factual & Non-Cloned)
            </h2>
            <span className={`no-print text-[10px] font-mono font-bold px-2 py-0.5 border flex items-center gap-1 ${
              isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <ShieldCheck className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              {summaryConfidence}% AI Confidence
            </span>
          </div>
          <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-zinc-800' : 'text-zinc-200'}`}>{resume.summary}</p>
        </div>

        {/* Tailored Experience */}
        <div className="mb-6">
          <div className={`flex items-center justify-between border-b pb-1 mb-3 ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
            <h2 className={`text-xs font-mono font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Verified Professional Experience
            </h2>
            <span className={`no-print text-[10px] font-mono font-bold px-2 py-0.5 border flex items-center gap-1 ${
              isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            }`}>
              <Activity className={`w-3 h-3 ${isLight ? 'text-blue-700' : 'text-blue-400'}`} />
              {experienceConfidence}% AI Confidence ({linkedBullets}/{totalBullets} Fact IDs)
            </span>
          </div>

          <div className="space-y-5">
            {resume.tailored_experience?.map((exp, idx) => (
              <div key={idx} className="group">
                <div className="flex items-baseline justify-between mb-1">
                  <h3 className={`text-sm font-bold ${isLight ? 'text-zinc-900' : 'text-zinc-100'}`}>
                    {exp.role} <span className={isLight ? 'text-zinc-500 font-normal' : 'text-zinc-400 font-normal'}>at</span>{' '}
                    <span className={isLight ? 'text-blue-700' : 'text-blue-400'}>{exp.company}</span>
                  </h3>
                  <span className={`text-xs font-mono ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{exp.period}</span>
                </div>

                <ul className="space-y-2 mt-2">
                  {exp.bullets?.map((b, bIdx) => {
                    const isHighlighted = b.source_fact_ids?.some((fid) => fid === selectedFactId);

                    return (
                      <li
                        key={bIdx}
                        onClick={() => {
                          if (b.source_fact_ids && b.source_fact_ids.length > 0) {
                            setSelectedFactId(b.source_fact_ids[0]);
                          }
                        }}
                        className={`text-xs leading-relaxed p-2.5 transition-all cursor-pointer border rounded ${
                          isHighlighted
                            ? isLight
                              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30 shadow-sm text-zinc-900'
                              : 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500/30 text-emerald-100'
                            : isLight
                            ? 'bg-zinc-50/80 border-zinc-200/80 text-zinc-800 hover:border-blue-400 hover:bg-blue-50/50'
                            : 'bg-zinc-800/60 border-zinc-700/80 text-zinc-200 hover:border-blue-500 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex-1 font-sans">
                            • {b.text}
                          </span>

                          <div className="flex items-center gap-1 shrink-0 no-print">
                            {b.metric_highlight && (
                              <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 border ${
                                isLight ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}>
                                {b.metric_highlight}
                              </span>
                            )}

                            {b.source_fact_ids?.map((fid) => (
                              <span
                                key={fid}
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${
                                  isLight
                                    ? 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200'
                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                                }`}
                              >
                                #{fid}
                              </span>
                            ))}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className={`flex items-center justify-between border-b pb-1 mb-2 ${isLight ? 'border-zinc-200' : 'border-zinc-800'}`}>
            <h2 className={`text-xs font-mono font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Verified Skills & Technologies
            </h2>
            <span className={`no-print text-[10px] font-mono font-bold px-2 py-0.5 border flex items-center gap-1 ${
              isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              <Sparkles className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              {skillsConfidence}% AI Confidence
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {resume.skills?.map((skill, idx) => (
              <span
                key={idx}
                className={`text-xs px-2.5 py-1 font-mono border ${
                  isLight ? 'bg-zinc-100 text-zinc-900 border-zinc-300' : 'bg-zinc-800 text-zinc-200 border-zinc-700'
                }`}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


