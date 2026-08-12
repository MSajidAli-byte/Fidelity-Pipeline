import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Loader2,
  Copy,
  CheckCircle2,
  DollarSign,
  Calendar,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Mail,
  Send,
} from 'lucide-react';
import { useCandidate } from '../context/CandidateContext';

interface CoverLetterGeneratorProps {
  theme?: 'dark' | 'light';
  onClose?: () => void;
}

export const CoverLetterGenerator: React.FC<CoverLetterGeneratorProps> = ({
  theme = 'dark',
  onClose,
}) => {
  const isLight = theme === 'light';
  const { candidateName, factBank, jdAnalysis, rawResume } = useCandidate();

  // Checkbox state for salary expectations and availability
  const [includeSalaryAvailability, setIncludeSalaryAvailability] = useState<boolean>(false);
  const [salaryExpectation, setSalaryExpectation] = useState<string>('$150,000 - $170,000 / year');
  const [availabilityDate, setAvailabilityDate] = useState<string>('Available within 2 weeks notice');
  const [customNotes, setCustomNotes] = useState<string>('');

  const [generating, setGenerating] = useState<boolean>(false);
  const [coverLetterData, setCoverLetterData] = useState<{
    cover_letter_markdown: string;
    key_highlights: string[];
    included_salary_availability: boolean;
    salary_statement_summary?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState<boolean>(true);

  const handleGenerate = async () => {
    if (!factBank || !factBank.fact_bank || factBank.fact_bank.length === 0) {
      setError('Fact Bank is missing. Please extract resume facts first.');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/pipeline/generate-cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: candidateName,
          fact_bank: factBank,
          jd_analysis: jdAnalysis || {
            job_title: 'Target Role',
            company_name: 'Hiring Company',
          },
          include_salary_availability: includeSalaryAvailability,
          salary_expectation: includeSalaryAvailability ? salaryExpectation : undefined,
          availability_date: includeSalaryAvailability ? availabilityDate : undefined,
          custom_notes: customNotes.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to generate cover letter');
      }

      setCoverLetterData(data);
      setIsConfigExpanded(false); // Collapse form to focus on output
    } catch (err: any) {
      console.error('Error generating cover letter:', err);
      setError(err.message || 'Error communicating with cover letter generator service');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!coverLetterData?.cover_letter_markdown) return;
    navigator.clipboard.writeText(coverLetterData.cover_letter_markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    if (!coverLetterData?.cover_letter_markdown) return;
    const blob = new Blob([coverLetterData.cover_letter_markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(candidateName || 'Candidate').replace(/\s+/g, '_')}_Cover_Letter.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!coverLetterData?.cover_letter_markdown) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${candidateName} - Cover Letter</title>
          <style>
            @page { margin: 20mm; size: auto; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; max-width: 800px; mx-auto; }
            h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; color: #0f172a; }
            .subtitle { font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            .content { font-size: 14px; color: #334155; whitespace: pre-wrap; line-height: 1.7; }
            p { margin-bottom: 16px; }
            ul { padding-left: 20px; margin-bottom: 16px; }
            li { margin-bottom: 6px; }
            .footer-note { margin-top: 32px; font-size: 12px; font-family: monospace; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <h1>${candidateName || 'Candidate'}</h1>
          <div class="subtitle">Cover Letter for ${jdAnalysis?.job_title || 'Target Position'} at ${jdAnalysis?.company || 'Hiring Organization'}</div>
          <div class="content">${coverLetterData.cover_letter_markdown
            .replace(/\*\*\*([^*]+)\*\*\*/g, '<b>$1</b>')
            .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
            .replace(/\n/g, '<br/>')}</div>
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

  return (
    <div
      className={`border p-6 shadow-2xl transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
      }`}
    >
      {/* Header Banner */}
      <div
        className={`flex items-center justify-between gap-4 pb-4 mb-5 border-b ${
          isLight ? 'border-slate-200' : 'border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 border flex items-center justify-center shrink-0 ${
              isLight
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}
          >
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
              AI Tailored Cover Letter Generator
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${
                  isLight
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                Grounded in Fact Bank
              </span>
            </h3>
            <p className={`text-xs font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
              Candidate: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{candidateName || 'Candidate'}</strong> | Target: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{jdAnalysis?.job_title || 'Target Role'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfigExpanded(!isConfigExpanded)}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border flex items-center gap-1.5 transition-colors cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
            }`}
          >
            {isConfigExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isConfigExpanded ? 'Minimize Setup' : 'Configure Prompt'}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className={`p-1.5 border transition-colors cursor-pointer ${
                isLight
                  ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-300'
                  : 'hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700'
              }`}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Generator Configuration Card */}
      {isConfigExpanded && (
        <div
          className={`p-4 border mb-6 space-y-4 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-zinc-900/50 border-zinc-800'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-2 mb-2 border-slate-200 dark:border-zinc-800">
            <span
              className={`text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 ${
                isLight ? 'text-slate-800' : 'text-zinc-300'
              }`}
            >
              <Sparkles className="w-4 h-4 text-blue-500" />
              Cover Letter Parameters & Variable Injections
            </span>
          </div>

          {/* Salary Expectations & Availability Checkbox */}
          <div
            className={`p-3.5 border transition-all ${
              includeSalaryAvailability
                ? isLight
                  ? 'bg-blue-50/80 border-blue-300'
                  : 'bg-blue-950/30 border-blue-500/40'
                : isLight
                ? 'bg-white border-slate-200 hover:border-slate-300'
                : 'bg-[#0a0a0c] border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSalaryAvailability}
                onChange={(e) => setIncludeSalaryAvailability(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1">
                <span
                  className={`text-xs font-mono font-bold uppercase tracking-wider block ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Include salary expectations/availability?
                </span>
                <p className={`text-[11px] font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                  Optionally inject desired compensation and notice period availability directly into the cover letter tone and closing paragraph.
                </p>
              </div>
            </label>

            {/* Expandable Inputs when checkbox is checked */}
            {includeSalaryAvailability && (
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className={`text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1 ${
                      isLight ? 'text-slate-800' : 'text-zinc-300'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    Salary Expectation / Target Range
                  </label>
                  <input
                    type="text"
                    value={salaryExpectation}
                    onChange={(e) => setSalaryExpectation(e.target.value)}
                    placeholder="e.g. $160,000 - $180,000 / year (Negotiable)"
                    className={`w-[100%] p-2 text-xs font-mono border focus:outline-none focus:ring-1 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                        : 'bg-zinc-900 border-zinc-700 text-white focus:ring-blue-400'
                    }`}
                  />
                </div>

                <div>
                  <label
                    className={`text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1 ${
                      isLight ? 'text-slate-800' : 'text-zinc-300'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    Target Availability / Notice Period
                  </label>
                  <input
                    type="text"
                    value={availabilityDate}
                    onChange={(e) => setAvailabilityDate(e.target.value)}
                    placeholder="e.g. 2 weeks notice or Immediate"
                    className={`w-[100%] p-2 text-xs font-mono border focus:outline-none focus:ring-1 ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                        : 'bg-zinc-900 border-zinc-700 text-white focus:ring-blue-400'
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Optional Custom Notes / Emphasis */}
          <div>
            <label
              className={`text-xs font-mono font-bold uppercase tracking-wider block mb-1 ${
                isLight ? 'text-slate-800' : 'text-zinc-300'
              }`}
            >
              Optional Custom Emphasis / Key Focus
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Highlight leadership in microservices modernization and cloud migration..."
              className={`w-[100%] p-2 text-xs font-mono border focus:outline-none focus:ring-1 ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
                  : 'bg-zinc-900 border-zinc-700 text-white focus:ring-blue-400'
              }`}
            />
          </div>

          {/* Action Button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className={`w-full py-2.5 px-4 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              isLight
                ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:text-slate-500'
                : 'bg-blue-600 hover:bg-blue-500 text-white disabled:bg-zinc-800 disabled:text-zinc-500'
            }`}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Synthesizing Cover Letter from Verified Fact Bank...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                Generate Tailored Cover Letter
              </>
            )}
          </button>
        </div>
      )}

      {/* Error Message Banner */}
      {error && (
        <div
          className={`p-3 mb-4 border text-xs font-mono flex items-center justify-between gap-2 ${
            isLight
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold cursor-pointer">
            ×
          </button>
        </div>
      )}

      {/* Generated Cover Letter Result View */}
      {coverLetterData && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div
            className={`p-3 border flex flex-wrap items-center justify-between gap-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-900/80 border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold uppercase tracking-wider ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                Cover Letter Ready
              </span>
              {coverLetterData.included_salary_availability && (
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border flex items-center gap-1 ${
                    isLight
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <DollarSign className="w-3 h-3 text-emerald-600" />
                  Salary & Availability Included
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                }`}
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Letter'}
              </button>

              <button
                onClick={handleDownloadMd}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                .MD File
              </button>

              <button
                onClick={handlePrint}
                className={`px-3 py-1.5 text-xs font-mono font-bold uppercase border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300'
                    : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </button>
            </div>
          </div>

          {/* Key Highlights Badge Row */}
          {coverLetterData.key_highlights && coverLetterData.key_highlights.length > 0 && (
            <div
              className={`p-3 border text-xs font-mono space-y-1.5 ${
                isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-zinc-900/40 border-zinc-800'
              }`}
            >
              <span className={`font-bold uppercase block mb-1 ${isLight ? 'text-slate-800' : 'text-zinc-300'}`}>
                Verified Alignment Highlights:
              </span>
              <ul className="space-y-1">
                {coverLetterData.key_highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px]">
                    <span className="text-blue-500 font-bold">•</span>
                    <span className={isLight ? 'text-slate-700' : 'text-zinc-300'}>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Letter Document Canvas */}
          <div
            className={`p-6 border shadow-inner leading-relaxed text-sm font-sans whitespace-pre-wrap ${
              isLight
                ? 'bg-white border-slate-300 text-slate-800 shadow-slate-100'
                : 'bg-[#050507] border-zinc-800 text-zinc-100'
            }`}
          >
            {coverLetterData.cover_letter_markdown}
          </div>
        </div>
      )}
    </div>
  );
};
