import React, { useState, useRef } from 'react';
import { Upload, FileText, FileCheck, AlertCircle, Loader2, X } from 'lucide-react';
import { parseResumeFile, ParsedFileResult } from '../lib/fileParser';

interface ResumeUploaderProps {
  onResumeExtracted: (text: string, candidateNameCandidate?: string) => void;
  onZipUploaded?: (file: File) => void;
  theme?: 'dark' | 'light';
  className?: string;
}

export const ResumeUploader: React.FC<ResumeUploaderProps> = ({
  onResumeExtracted,
  onZipUploaded,
  theme = 'dark',
  className = '',
}) => {
  const isLight = theme === 'light';
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [lastFile, setLastFile] = useState<{ name: string; size: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    setParseError(null);

    // If a ZIP archive is uploaded, delegate to batch mode if supported
    if (file.name.toLowerCase().endsWith('.zip') && onZipUploaded) {
      onZipUploaded(file);
      return;
    }

    setIsParsing(true);
    setLastFile({ name: file.name, size: file.size });

    try {
      const result: ParsedFileResult = await parseResumeFile(file);
      if (result.error) {
        setParseError(result.error);
      } else {
        onResumeExtracted(result.text, result.candidateNameCandidate);
      }
    } catch (err: any) {
      setParseError(err.message || 'Error reading file format');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleProcessFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleProcessFile(file);
    }
  };

  const clearUploadedFile = () => {
    setLastFile(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.zip"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-3 border border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-3 ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : parseError
            ? isLight ? 'border-rose-300 bg-rose-50' : 'border-rose-500/50 bg-rose-500/5'
            : lastFile
            ? isLight ? 'border-emerald-300 bg-emerald-50' : 'border-emerald-500/50 bg-emerald-500/5'
            : isLight
            ? 'border-slate-300 bg-slate-100 hover:border-slate-400 hover:bg-slate-200/70'
            : 'border-zinc-800 bg-[#050505] hover:border-zinc-700 hover:bg-zinc-900/40'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-none border flex items-center justify-center shrink-0 ${
              isParsing
                ? isLight ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : parseError
                ? isLight ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : lastFile
                ? isLight ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {isParsing ? (
              <Loader2 className={`w-4 h-4 animate-spin ${isLight ? 'text-blue-700' : 'text-blue-400'}`} />
            ) : parseError ? (
              <AlertCircle className={`w-4 h-4 ${isLight ? 'text-rose-700' : 'text-rose-400'}`} />
            ) : lastFile ? (
              <FileCheck className={`w-4 h-4 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                {isParsing
                  ? 'Extracting Resume Text...'
                  : lastFile
                  ? `Uploaded: ${lastFile.name}`
                  : 'Drag & Drop Resume File or Click to Upload'}
              </span>
              {lastFile && (
                <span className={`text-[10px] font-mono px-1.5 py-0.2 border ${
                  isLight ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {formatBytes(lastFile.size)}
                </span>
              )}
            </div>
            <p className={`text-[11px] font-mono ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
              {parseError ? (
                <span className={isLight ? 'text-rose-700 font-bold' : 'text-rose-400 font-semibold'}>{parseError}</span>
              ) : (
                'Supports .pdf, .docx, .txt files or .zip archives (multi-candidate batch)'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {lastFile && (
            <button
              onClick={clearUploadedFile}
              title="Clear file badge"
              className={`p-1 transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-900' : 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            className={`px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider border transition-colors cursor-pointer whitespace-nowrap ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
            }`}
          >
            Browse File
          </button>
        </div>
      </div>
    </div>
  );
};
