import React, { useState } from 'react';
import { Globe, Link2, Loader2, Sparkles, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface JdUrlScraperProps {
  onJdScraped: (text: string, title?: string, company?: string) => void;
  theme?: 'dark' | 'light';
  className?: string;
}

export const JdUrlScraper: React.FC<JdUrlScraperProps> = ({
  onJdScraped,
  theme = 'dark',
  className = '',
}) => {
  const isLight = theme === 'light';
  const [url, setUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleScrapeUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetUrl = url.trim();

    if (!targetUrl) {
      setError('Please paste a job posting URL.');
      return;
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }

    setIsScraping(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/scrape-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to fetch job description from URL.');
      }

      if (!data.job_description || data.job_description.trim().length < 20) {
        throw new Error('Could not extract sufficient job description text from the provided web page.');
      }

      onJdScraped(data.job_description, data.job_title, data.company);
      setSuccessMessage(
        `Successfully imported job description ${data.job_title ? `[${data.job_title}]` : ''}!`
      );
      setUrl('');
    } catch (err: any) {
      console.error('Job URL Scraping Error:', err);
      setError(
        err.message ||
          'Unable to scrape this job link. Some job boards require manual login. You can copy-paste the description directly.'
      );
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <form onSubmit={handleScrapeUrl} className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
            <Link2 className="w-3.5 h-3.5" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste Job URL (LinkedIn, Indeed, Greenhouse, Lever, Workday...)"
            disabled={isScraping}
            className={`w-full pl-9 pr-3 py-1.5 text-xs font-mono border focus:outline-none focus:border-blue-500 transition-colors ${
              isLight
                ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                : 'bg-[#050505] border-zinc-800 text-zinc-200 placeholder-zinc-500'
            }`}
          />
        </div>

        <button
          type="submit"
          disabled={isScraping || !url.trim()}
          className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-bold uppercase transition-all cursor-pointer shrink-0 shadow-sm ${
            isLight
              ? 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300 text-white border border-blue-400'
              : 'bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white border border-blue-400 disabled:border-zinc-700'
          }`}
        >
          {isScraping ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Fetching Job...</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 text-blue-200" />
              <span>Import from Link</span>
            </>
          )}
        </button>
      </form>

      {/* Popular Sites Badges */}
      <div className={`flex items-center gap-1.5 text-[10px] font-mono flex-wrap ${
        isLight ? 'text-slate-600' : 'text-zinc-400'
      }`}>
        <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-zinc-400'}`}>Supports:</span>
        <span className={`px-1.5 py-0.5 border ${
          isLight ? 'bg-slate-100 border-slate-300 text-slate-800 font-medium' : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
        }`}>LinkedIn</span>
        <span className={`px-1.5 py-0.5 border ${
          isLight ? 'bg-slate-100 border-slate-300 text-slate-800 font-medium' : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
        }`}>Indeed</span>
        <span className={`px-1.5 py-0.5 border ${
          isLight ? 'bg-slate-100 border-slate-300 text-slate-800 font-medium' : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
        }`}>Greenhouse</span>
        <span className={`px-1.5 py-0.5 border ${
          isLight ? 'bg-slate-100 border-slate-300 text-slate-800 font-medium' : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
        }`}>Lever</span>
        <span className={`px-1.5 py-0.5 border ${
          isLight ? 'bg-slate-100 border-slate-300 text-slate-800 font-medium' : 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
        }`}>Workday / General Web</span>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className={`p-2 border text-xs font-mono flex items-center justify-between gap-2 ${
          isLight
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
        }`}>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className={`cursor-pointer ${isLight ? 'text-emerald-800 hover:text-emerald-950 font-bold' : 'text-emerald-400 hover:text-white'}`}
          >
            ×
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className={`p-2 border text-xs font-mono flex items-center justify-between gap-2 ${
          isLight
            ? 'bg-rose-50 border-rose-300 text-rose-900'
            : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className={`cursor-pointer ${isLight ? 'text-rose-800 hover:text-rose-950 font-bold' : 'text-rose-400 hover:text-white'}`}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
