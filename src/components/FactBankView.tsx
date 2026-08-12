import React, { useState } from 'react';
import { FactBank, FactItem } from '../types';
import { Database, Search, Code, CheckCircle2, Tag, Wrench, BarChart2, Briefcase } from 'lucide-react';

interface FactBankViewProps {
  factBank: FactBank | null;
  rawText?: string;
  theme?: 'dark' | 'light';
}

export const FactBankView: React.FC<FactBankViewProps> = ({ factBank, rawText, theme = 'dark' }) => {
  const isLight = theme === 'light';
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showJson, setShowJson] = useState(false);

  if (!factBank || !factBank.fact_bank || factBank.fact_bank.length === 0) {
    return (
      <div className={`border p-8 text-center transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-[#0a0a0c] border-zinc-800 text-zinc-400'
      }`}>
        <Database className={`w-12 h-12 mx-auto mb-3 ${isLight ? 'text-slate-400' : 'text-zinc-600'}`} />
        <h3 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-zinc-200'}`}>Fact Bank Empty</h3>
        <p className={`text-xs font-mono mt-2 max-w-md mx-auto uppercase tracking-tight ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
          Run Stage 1 (The Fact Extractor) on a candidate resume to generate the normalized source-of-truth Fact Bank.
        </p>
      </div>
    );
  }

  const filteredFacts = factBank.fact_bank.filter((item: FactItem) => {
    const matchesSearch =
      item.bullet.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tools.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(factBank.fact_bank.map((f) => f.category)));

  return (
    <div className={`border p-6 shadow-2xl transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
    }`}>
      {/* Header Controls */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4 ${
        isLight ? 'border-slate-200' : 'border-zinc-800'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 animate-pulse" />
            <h3 className={`text-base font-black uppercase tracking-wider flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Stage 1: Fact Bank (Source of Truth)
            </h3>
            <span className={`text-xs font-mono font-bold uppercase px-2 py-0.5 border ${
              isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              {factBank.fact_bank.length} Verified Claims
            </span>
          </div>
          <p className={`text-xs font-mono mt-1 uppercase tracking-tight ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
            Normalized candidate history decomposed into atomic, verifiable facts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJson(!showJson)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-widest border transition-all cursor-pointer ${
              showJson
                ? 'bg-blue-600 text-white border-blue-400'
                : isLight
                ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                : 'bg-[#050505] text-zinc-300 border-zinc-700 hover:bg-zinc-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            {showJson ? 'View Graphical Cards' : 'Inspect Raw JSON'}
          </button>
        </div>
      </div>

      {showJson ? (
        <div className="relative">
          <pre className={`font-mono text-xs p-4 overflow-x-auto border max-h-[500px] ${
            isLight ? 'bg-slate-900 text-emerald-300 border-slate-700' : 'bg-[#050505] text-emerald-400 border-zinc-800'
          }`}>
            {JSON.stringify(factBank, null, 2)}
          </pre>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-5">
            <div className="relative flex-1 w-full">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`} />
              <input
                type="text"
                placeholder="Filter facts by keyword, company, or tool..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full border pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    : 'bg-[#050505] border-zinc-800 text-white placeholder-zinc-500'
                }`}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto font-mono">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`text-xs border px-3 py-2 font-mono font-bold uppercase focus:outline-none focus:border-blue-500 ${
                  isLight ? 'bg-slate-50 text-slate-800 border-slate-300' : 'bg-[#050505] text-zinc-200 border-zinc-800'
                }`}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={String(cat)} value={String(cat)}>
                    {String(cat).toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[550px] overflow-y-auto pr-1">
            {filteredFacts.map((fact) => (
              <div
                key={fact.id}
                className={`border p-4 transition-all flex flex-col justify-between group rounded-md ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    : 'bg-[#050505] border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`font-mono text-xs font-bold px-2 py-0.5 border uppercase tracking-widest rounded ${
                      isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                    }`}>
                      ID: {fact.id}
                    </span>

                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded ${
                      isLight ? 'bg-slate-200 text-slate-900 border-slate-300' : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                    }`}>
                      {fact.category}
                    </span>
                  </div>

                  <div className={`flex items-center gap-1.5 text-xs font-mono font-bold mb-2 ${
                    isLight ? 'text-slate-900' : 'text-zinc-100'
                  }`}>
                    <Briefcase className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`} />
                    <span>{fact.role}</span>
                    <span className={isLight ? 'text-slate-400' : 'text-zinc-500'}>@</span>
                    <span className={isLight ? 'text-emerald-700 font-bold' : 'text-emerald-500'}>{fact.company}</span>
                  </div>

                  <p className={`text-xs leading-relaxed mb-3 mt-2 p-3 border font-sans rounded ${
                    isLight ? 'bg-white text-slate-900 border-slate-200' : 'bg-[#0a0a0c] text-zinc-300 border-zinc-800/80'
                  }`}>
                    "{fact.bullet}"
                  </p>
                </div>

                <div className={`space-y-2 pt-3 border-t text-[11px] font-mono ${
                  isLight ? 'border-slate-200' : 'border-zinc-800'
                }`}>
                  {/* Tools */}
                  {fact.tools && fact.tools.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Wrench className={`w-3 h-3 shrink-0 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`} />
                      <span className={`text-[10px] uppercase font-bold ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>Tools:</span>
                      {fact.tools.map((t, idx) => (
                        <span
                          key={idx}
                          className={`text-[10px] px-2 py-0.5 border uppercase font-bold tracking-wider rounded ${
                            isLight
                              ? 'bg-blue-50 text-blue-900 border-blue-200'
                              : 'bg-blue-950/50 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metrics */}
                  {fact.metrics && fact.metrics.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <BarChart2 className={`w-3 h-3 shrink-0 ${isLight ? 'text-amber-600' : 'text-amber-500'}`} />
                      <span className={`font-bold text-[10px] uppercase ${isLight ? 'text-amber-700' : 'text-amber-500'}`}>Metric:</span>
                      {fact.metrics.map((m, idx) => (
                        <span
                          key={idx}
                          className={`text-[10px] px-2 py-0.5 border font-bold rounded ${
                            isLight
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Domain */}
                  {fact.domain && (
                    <div className={`flex items-center gap-1 text-[10px] pt-1 ${isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'}`}>
                      <Tag className={`w-3 h-3 ${isLight ? 'text-slate-500' : 'text-zinc-500'}`} />
                      <span>Domain: <strong className={`font-bold uppercase ${isLight ? 'text-slate-900' : 'text-zinc-200'}`}>{fact.domain}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
