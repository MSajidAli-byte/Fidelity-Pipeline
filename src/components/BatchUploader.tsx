import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import {
  Upload,
  FileArchive,
  FileText,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowRight,
  RefreshCw,
  X,
  FileCheck
} from 'lucide-react';
import { parseResumeFile } from '../lib/fileParser';
import { JdUrlScraper } from './JdUrlScraper';
import { useCredit } from '../context/CreditContext';
import {
  FactBank,
  JobDescriptionAnalysis,
  EvidenceSelectionOutput,
  GeneratedResume,
  FidelityAuditResult,
  ResumeIteration
} from '../types';

export interface BatchCandidateResult {
  id: string;
  fileName: string;
  fileSize: number;
  candidateName: string;
  rawResumeText: string;
  status: 'idle' | 'parsing' | 'extracting_facts' | 'matching' | 'generating' | 'auditing' | 'completed' | 'error';
  currentStepMessage?: string;
  progressPercent: number; // 0 to 100
  error?: string;
  // Results
  factBank?: FactBank;
  evidenceSelection?: EvidenceSelectionOutput;
  generatedResume?: GeneratedResume;
  auditResult?: FidelityAuditResult;
  durationMs?: number;
}

interface BatchUploaderProps {
  currentJobDescription: string;
  theme?: 'dark' | 'light';
  onLoadCandidateToPipeline?: (data: {
    candidateName: string;
    rawResume: string;
    factBank: FactBank;
    jdAnalysis: JobDescriptionAnalysis;
    evidenceSelection: EvidenceSelectionOutput;
    generatedResume: GeneratedResume;
    auditResult: FidelityAuditResult;
  }) => void;
  onSaveBatchCandidate?: (iteration: ResumeIteration) => void;
}

export const BatchUploader: React.FC<BatchUploaderProps> = ({
  currentJobDescription,
  theme = 'dark',
  onLoadCandidateToPipeline,
  onSaveBatchCandidate,
}) => {
  const isLight = theme === 'light';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { consumeCredits } = useCredit();

  const [batchZipFile, setBatchZipFile] = useState<{ name: string; size: number } | null>(null);
  const [candidates, setCandidates] = useState<BatchCandidateResult[]>([]);
  const [targetJd, setTargetJd] = useState<string>(currentJobDescription || '');
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [cachedJdAnalysis, setCachedJdAnalysis] = useState<JobDescriptionAnalysis | null>(null);

  // Sync prop JD if changed and no manual edit
  React.useEffect(() => {
    if (currentJobDescription && !targetJd) {
      setTargetJd(currentJobDescription);
    }
  }, [currentJobDescription]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Process selected files or zip file
  const handleFileSelection = async (files: FileList | File[]) => {
    setZipError(null);
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const firstFile = fileList[0];

    // Check if a single ZIP file was uploaded
    if (fileList.length === 1 && firstFile.name.toLowerCase().endsWith('.zip')) {
      setIsExtractingZip(true);
      setBatchZipFile({ name: firstFile.name, size: firstFile.size });

      try {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(firstFile);
        const extractedCandidates: BatchCandidateResult[] = [];

        const filePromises: Promise<void>[] = [];

        zip.forEach((relativePath, zipEntry) => {
          if (zipEntry.dir) return; // Skip directories
          const lowerName = zipEntry.name.toLowerCase();
          // Filter out hidden OS files like __MACOSX or .DS_Store
          if (lowerName.includes('__macosx') || lowerName.startsWith('.') || lowerName.includes('/.')) return;

          const ext = lowerName.split('.').pop();
          if (ext === 'pdf' || ext === 'docx' || ext === 'doc' || ext === 'txt') {
            const p = zipEntry.async('blob').then(async (blob) => {
              const fileObj = new File([blob], zipEntry.name.split('/').pop() || zipEntry.name, {
                type: blob.type || 'application/octet-stream',
              });

              const parsed = await parseResumeFile(fileObj);
              if (parsed.text) {
                extractedCandidates.push({
                  id: Math.random().toString(36).substring(2, 9),
                  fileName: fileObj.name,
                  fileSize: fileObj.size,
                  candidateName: parsed.candidateNameCandidate || fileObj.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                  rawResumeText: parsed.text,
                  status: 'idle',
                  progressPercent: 0,
                });
              }
            });
            filePromises.push(p);
          }
        });

        await Promise.all(filePromises);

        if (extractedCandidates.length === 0) {
          setZipError('No valid resume files (.pdf, .docx, .txt) found inside the uploaded ZIP archive.');
        } else {
          setCandidates(extractedCandidates);
        }
      } catch (err: any) {
        console.error('ZIP extraction error:', err);
        setZipError(err.message || 'Failed to extract files from ZIP archive.');
      } finally {
        setIsExtractingZip(false);
      }
    } else {
      // Multiple regular files uploaded directly
      setIsExtractingZip(true);
      setBatchZipFile({ name: `${fileList.length} Resume Files`, size: fileList.reduce((acc, f) => acc + f.size, 0) });

      try {
        const extractedCandidates: BatchCandidateResult[] = [];
        for (const f of fileList) {
          const parsed = await parseResumeFile(f);
          if (parsed.text) {
            extractedCandidates.push({
              id: Math.random().toString(36).substring(2, 9),
              fileName: f.name,
              fileSize: f.size,
              candidateName: parsed.candidateNameCandidate || f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
              rawResumeText: parsed.text,
              status: 'idle',
              progressPercent: 0,
            });
          }
        }
        setCandidates(extractedCandidates);
      } catch (err: any) {
        setZipError('Failed to parse selected resume files.');
      } finally {
        setIsExtractingZip(false);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelection(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      handleFileSelection(e.dataTransfer.files);
    }
  };

  // Run Batch Pipeline against all candidates sequentially
  const handleStartBatchPipeline = async () => {
    if (candidates.length === 0) {
      setZipError('Please upload a ZIP file or resumes first.');
      return;
    }
    if (!targetJd.trim()) {
      setZipError('Please specify a Target Job Description for the batch comparison.');
      return;
    }

    setIsProcessingBatch(true);
    setZipError(null);

    try {
      // Step A: Analyze JD once for the batch to save API calls
      let jdAnalysis: JobDescriptionAnalysis;
      if (cachedJdAnalysis) {
        jdAnalysis = cachedJdAnalysis;
      } else {
        const jdRes = await fetch('/api/pipeline/analyze-jd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_description: targetJd }),
        }).then((r) => r.json());

        if (jdRes.error) throw new Error(`JD Analysis failed: ${jdRes.error}`);
        jdAnalysis = jdRes;
        setCachedJdAnalysis(jdRes);
      }

      // Step B: Loop over candidates sequentially
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (candidate.status === 'completed') continue; // Skip already completed ones

        // Check & consume credit for batch candidate run
        if (!consumeCredits(1, `Batch Processing: ${candidate.candidateName}`)) {
          setZipError('Credit limit reached. Please upgrade plan or refill credits to continue processing batch.');
          break;
        }

        const startTime = Date.now();

        // Update candidate status: Extracting facts
        setCandidates((prev) =>
          prev.map((c) =>
            c.id === candidate.id
              ? { ...c, status: 'extracting_facts', currentStepMessage: 'Extracting Fact Bank JSON...', progressPercent: 20 }
              : c
          )
        );

        try {
          // 1. Fact Extractor
          const fbRes = await fetch('/api/pipeline/extract-facts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidate_name: candidate.candidateName, raw_resume: candidate.rawResumeText }),
          }).then((r) => r.json());

          if (fbRes.error) throw new Error(`Stage 1 Fact Extraction Error: ${fbRes.error}`);

          // 2. Evidence Matcher
          setCandidates((prev) =>
            prev.map((c) =>
              c.id === candidate.id
                ? { ...c, status: 'matching', currentStepMessage: 'Matching Candidate Evidence to JD...', progressPercent: 45, factBank: fbRes }
                : c
            )
          );

          const matchRes = await fetch('/api/pipeline/match-evidence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fact_bank: fbRes, jd_analysis: jdAnalysis }),
          }).then((r) => r.json());

          if (matchRes.error) throw new Error(`Stage 3 Match Error: ${matchRes.error}`);

          // 3. Constrained Generator
          setCandidates((prev) =>
            prev.map((c) =>
              c.id === candidate.id
                ? {
                    ...c,
                    status: 'generating',
                    currentStepMessage: 'Generating Anti-Hallucination Resume...',
                    progressPercent: 70,
                    evidenceSelection: matchRes,
                  }
                : c
            )
          );

          const genRes = await fetch('/api/pipeline/generate-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidate_name: candidate.candidateName,
              fact_bank: fbRes,
              evidence_selection: matchRes,
              jd_analysis: jdAnalysis,
            }),
          }).then((r) => r.json());

          if (genRes.error) throw new Error(`Stage 4 Generation Error: ${genRes.error}`);

          // 4. Fidelity Auditor
          setCandidates((prev) =>
            prev.map((c) =>
              c.id === candidate.id
                ? { ...c, status: 'auditing', currentStepMessage: 'Performing Factuality & Hallucination Audit...', progressPercent: 90, generatedResume: genRes }
                : c
            )
          );

          const auditRes = await fetch('/api/pipeline/audit-fidelity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fact_bank: fbRes,
              generated_resume: genRes,
              raw_resume_text: candidate.rawResumeText,
              target_jd_text: targetJd,
            }),
          }).then((r) => r.json());

          if (auditRes.error) throw new Error(`Stage 5 Audit Error: ${auditRes.error}`);

          const durationMs = Date.now() - startTime;

          // Save completed candidate to IndexedDB history
          if (onSaveBatchCandidate) {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
            const batchIteration: ResumeIteration = {
              id: `${Date.now()}_${candidate.id}`,
              timestamp: `${timeStr}, ${dateStr}`,
              candidateName: candidate.candidateName,
              targetTitle: genRes.target_title || 'Tailored Candidate',
              presetTitle: 'Batch ZIP Upload',
              factBank: fbRes,
              jdAnalysis: jdAnalysis,
              evidenceSelection: matchRes,
              generatedResume: genRes,
              auditResult: auditRes,
              rawResume: candidate.rawResumeText,
              jobDescription: targetJd,
            };
            onSaveBatchCandidate(batchIteration);
          }

          // Candidate complete
          setCandidates((prev) =>
            prev.map((c) =>
              c.id === candidate.id
                ? {
                    ...c,
                    status: 'completed',
                    currentStepMessage: 'Fidelity Audit Complete',
                    progressPercent: 100,
                    factBank: fbRes,
                    evidenceSelection: matchRes,
                    generatedResume: genRes,
                    auditResult: auditRes,
                    durationMs,
                  }
                : c
            )
          );
        } catch (err: any) {
          console.error(`Candidate pipeline error [${candidate.candidateName}]:`, err);
          setCandidates((prev) =>
            prev.map((c) =>
              c.id === candidate.id
                ? { ...c, status: 'error', error: err.message || 'Processing failed', progressPercent: 0 }
                : c
            )
          );
        }
      }
    } catch (globalErr: any) {
      setZipError(globalErr.message || 'Batch pipeline execution encountered an error.');
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleClearBatch = () => {
    setBatchZipFile(null);
    setCandidates([]);
    setZipError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateResumeMarkdown = (gen: GeneratedResume) => {
    let md = `# ${gen.candidate_name}\n**${gen.target_title}**\n\n## SUMMARY\n${gen.summary}\n\n## EXPERIENCE\n`;
    if (gen.tailored_experience) {
      gen.tailored_experience.forEach((exp) => {
        md += `\n### ${exp.role} — ${exp.company} (${exp.period})\n`;
        exp.bullets?.forEach((b) => {
          md += `- ${b.text}\n`;
        });
      });
    }
    if (gen.skills && gen.skills.length > 0) {
      md += `\n## SKILLS\n${gen.skills.join(', ')}\n`;
    }
    if (gen.education && gen.education.length > 0) {
      md += `\n## EDUCATION\n${gen.education.join('\n')}\n`;
    }
    return md;
  };

  // Download individual generated resume text
  const downloadCandidateResume = (candidate: BatchCandidateResult) => {
    if (!candidate.generatedResume) return;
    const markdownText = generateResumeMarkdown(candidate.generatedResume);
    const blob = new Blob([markdownText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${candidate.candidateName.replace(/\s+/g, '_')}_Tailored_Resume.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV summary of batch results
  const exportBatchCsvReport = () => {
    if (candidates.length === 0) return;

    const headers = [
      'Candidate Name',
      'File Name',
      'Status',
      'Factuality Index %',
      'Must-Have Match %',
      'Unmatched Claims',
      'Audit Verdict',
      'Duration (sec)'
    ];

    const rows = candidates.map((c) => {
      const factuality = c.auditResult?.factuality_percentage !== undefined ? `${c.auditResult.factuality_percentage}%` : 'N/A';
      const coverage = c.evidenceSelection?.overall_fit_score !== undefined ? `${c.evidenceSelection.overall_fit_score}%` : 'N/A';
      const unmatched = c.auditResult?.hallucinations_detected?.length || 0;
      const verdict = c.status === 'completed' ? (c.auditResult?.factuality_percentage && c.auditResult.factuality_percentage >= 90 ? 'PASSED (HIGH FIDELITY)' : 'PASSED') : c.status;
      const duration = c.durationMs ? (c.durationMs / 1000).toFixed(1) : 'N/A';

      return [
        `"${c.candidateName.replace(/"/g, '""')}"`,
        `"${c.fileName.replace(/"/g, '""')}"`,
        c.status,
        factuality,
        coverage,
        unmatched,
        `"${verdict}"`,
        duration
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Batch_Fidelity_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export all completed resumes in a ZIP file
  const exportAllResumesZip = async () => {
    const completed = candidates.filter((c) => c.generatedResume);
    if (completed.length === 0) return;

    const zip = new JSZip();
    const folder = zip.folder('Tailored_Resumes');

    completed.forEach((c) => {
      if (c.generatedResume) {
        const filename = `${c.candidateName.replace(/\s+/g, '_')}_Tailored.md`;
        const markdownContent = generateResumeMarkdown(c.generatedResume);
        folder?.file(filename, markdownContent);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Batch_Tailored_Resumes_${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const completedCount = candidates.filter((c) => c.status === 'completed').length;
  const errorCount = candidates.filter((c) => c.status === 'error').length;

  return (
    <div
      className={`border rounded-none p-5 transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-900 shadow-sm' : 'bg-[#0a0a0c] border-zinc-800 text-white shadow-xl'
      }`}
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <FileArchive className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-mono font-bold uppercase tracking-wider">
                Multi-Candidate Batch Processor
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase">
                B2B Enterprise Mode
              </span>
            </div>
            <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'} mt-0.5`}>
              Upload a ZIP file or multiple resumes to run the 5-Stage Anti-Hallucination Pipeline in batch.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          {completedCount > 0 && (
            <>
              <button
                onClick={exportAllResumesZip}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Resumes (.zip)</span>
              </button>

              <button
                onClick={exportBatchCsvReport}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>CSV Audit Report</span>
              </button>
            </>
          )}

          {candidates.length > 0 && (
            <button
              onClick={handleClearBatch}
              disabled={isProcessingBatch}
              title="Clear batch list"
              className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-800 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Upload Drag & Drop Zone */}
      {candidates.length === 0 && (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.pdf,.docx,.doc,.txt"
            multiple
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-8 border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
              isExtractingZip
                ? 'border-blue-500 bg-blue-500/10'
                : zipError
                ? 'border-rose-500/50 bg-rose-500/5'
                : isLight
                ? 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
                : 'border-zinc-800 bg-[#050505] hover:border-zinc-700 hover:bg-zinc-900/40'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              {isExtractingZip ? (
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-indigo-400" />
              )}
            </div>

            <div>
              <h4 className="text-sm font-mono font-bold uppercase tracking-wider">
                {isExtractingZip ? 'Extracting Resume Archives...' : 'Drop ZIP File or Multiple Resumes Here'}
              </h4>
              <p className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'} mt-1`}>
                Select a single <code className="text-indigo-400 font-bold">.zip</code> archive containing candidate PDFs/DOCX, or select multiple files at once.
              </p>
            </div>

            <button
              type="button"
              className="mt-2 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 transition-colors shadow-sm cursor-pointer"
            >
              Browse Batch Files
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {zipError && (
        <div className="p-3 my-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{zipError}</span>
        </div>
      )}

      {/* Target Job Description Box & Queue View */}
      {candidates.length > 0 && (
        <div className="space-y-6">
          {/* Target JD & Controls Row */}
          <div className={`p-4 border font-mono ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#050505] border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Target Job Description for Batch Pipeline
              </label>
              <span className="text-[11px] text-zinc-400">
                {targetJd.length} chars
              </span>
            </div>

            <JdUrlScraper
              theme={theme}
              className="mb-3"
              onJdScraped={(scrapedText) => {
                setTargetJd(scrapedText);
                setCachedJdAnalysis(null);
              }}
            />

            <textarea
              rows={3}
              value={targetJd}
              onChange={(e) => {
                setTargetJd(e.target.value);
                setCachedJdAnalysis(null); // Reset cached JD analysis on edit
              }}
              placeholder="Paste or import job description text here..."
              className={`w-full p-2.5 text-xs font-mono border focus:outline-none focus:border-indigo-500 transition-colors resize-y ${
                isLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#0a0a0c] border-zinc-800 text-zinc-200'
              }`}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-3">
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span className="flex items-center gap-1 font-bold">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  {candidates.length} Candidates Loaded
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">{completedCount} Completed</span>
                {errorCount > 0 && <span className="text-rose-400 font-bold">• {errorCount} Errors</span>}
              </div>

              <button
                onClick={handleStartBatchPipeline}
                disabled={isProcessingBatch || !targetJd.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 text-xs font-mono font-bold uppercase bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white border border-indigo-400 disabled:border-zinc-700 transition-all cursor-pointer shadow-md"
              >
                {isProcessingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing Candidate Queue...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 text-white fill-white" />
                    <span>Run Batch Pipeline ({candidates.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Candidates Batch Queue Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Candidate Queue Progress</span>
              <span className="text-[11px] font-normal">
                {completedCount} / {candidates.length} Audited
              </span>
            </h4>

            <div className="space-y-2">
              {candidates.map((candidate, idx) => {
                const isExpanded = expandedCandidateId === candidate.id;
                const isCompleted = candidate.status === 'completed';
                const isRunning = candidate.status !== 'idle' && candidate.status !== 'completed' && candidate.status !== 'error';
                const isErr = candidate.status === 'error';

                return (
                  <div
                    key={candidate.id}
                    className={`border transition-all ${
                      isRunning
                        ? 'border-indigo-500/60 bg-indigo-500/5'
                        : isCompleted
                        ? isLight
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : 'border-emerald-500/30 bg-emerald-500/5'
                        : isErr
                        ? 'border-rose-500/30 bg-rose-500/5'
                        : isLight
                        ? 'border-slate-200 bg-white'
                        : 'border-zinc-800 bg-[#050505]'
                    }`}
                  >
                    {/* Main Row */}
                    <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Info & Progress */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono font-bold text-zinc-500 w-5">
                          #{idx + 1}
                        </span>

                        <div
                          className={`w-7 h-7 border flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : isRunning
                              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                              : isErr
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {isRunning ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : isErr ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold truncate">
                              {candidate.candidateName}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400 truncate hidden md:inline">
                              ({candidate.fileName})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 mt-0.5">
                            <span>{formatBytes(candidate.fileSize)}</span>
                            {candidate.currentStepMessage && (
                              <>
                                <span>•</span>
                                <span className={isRunning ? 'text-indigo-400 font-semibold' : ''}>
                                  {candidate.currentStepMessage}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Scores & Expand Toggle */}
                      <div className="flex items-center gap-3 shrink-0 ml-auto sm:ml-0">
                        {isCompleted && candidate.auditResult && (
                          <div className="flex items-center gap-2 font-mono text-xs">
                            <div className="text-right">
                              <div className="font-bold text-emerald-400">
                                {candidate.auditResult.factuality_percentage}% Factuality
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                {candidate.evidenceSelection?.overall_fit_score}% Fit Match
                              </div>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                              PASSED
                            </span>
                          </div>
                        )}

                        {isCompleted && candidate.generatedResume && (
                          <div className="flex items-center gap-1">
                            {onLoadCandidateToPipeline && candidate.factBank && candidate.evidenceSelection && candidate.auditResult && cachedJdAnalysis && (
                              <button
                                onClick={() =>
                                  onLoadCandidateToPipeline({
                                    candidateName: candidate.candidateName,
                                    rawResume: candidate.rawResumeText,
                                    factBank: candidate.factBank!,
                                    jdAnalysis: cachedJdAnalysis!,
                                    evidenceSelection: candidate.evidenceSelection!,
                                    generatedResume: candidate.generatedResume!,
                                    auditResult: candidate.auditResult!,
                                  })
                                }
                                title="Load candidate into main workspace"
                                className="px-2.5 py-1 text-[11px] font-mono font-bold uppercase bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 transition-colors cursor-pointer"
                              >
                                View Details
                              </button>
                            )}

                            <button
                              onClick={() => downloadCandidateResume(candidate)}
                              title="Download resume"
                              className="p-1.5 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {candidate.status !== 'idle' && (
                          <button
                            onClick={() => setExpandedCandidateId(isExpanded ? null : candidate.id)}
                            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Line */}
                    {isRunning && (
                      <div className="w-full bg-zinc-800 h-1 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full transition-all duration-300"
                          style={{ width: `${candidate.progressPercent}%` }}
                        />
                      </div>
                    )}

                    {/* Expanded Detail Panel */}
                    {isExpanded && isCompleted && candidate.generatedResume && (
                      <div className={`p-4 border-t text-xs font-mono space-y-3 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-950 border-zinc-800'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className={`p-2.5 border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'}`}>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">
                              Target Title
                            </span>
                            <span className="font-bold text-blue-400">
                              {candidate.generatedResume.target_title}
                            </span>
                          </div>

                          <div className={`p-2.5 border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'}`}>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">
                              Facts Extracted
                            </span>
                            <span className="font-bold">
                              {candidate.factBank?.fact_bank?.length || 0} Verifiable Bullets
                            </span>
                          </div>

                          <div className={`p-2.5 border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'}`}>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">
                              Processing Duration
                            </span>
                            <span className="font-bold">
                              {candidate.durationMs ? `${(candidate.durationMs / 1000).toFixed(1)}s` : 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Resume Executive Summary */}
                        {candidate.generatedResume?.summary && (
                          <div className={`p-3 border ${isLight ? 'bg-white border-slate-200' : 'bg-[#0a0a0c] border-zinc-800'}`}>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">
                              Tailored Executive Summary
                            </span>
                            <p className="text-zinc-300 text-[11px] leading-relaxed">
                              {candidate.generatedResume.summary}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
