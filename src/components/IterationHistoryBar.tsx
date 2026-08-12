import React, { useState, useMemo, useRef } from 'react';
import { ResumeIteration } from '../types';
import {
  History,
  Clock,
  ShieldCheck,
  Trash2,
  Check,
  Search,
  Download,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  X,
  Building2,
  User,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Columns
} from 'lucide-react';

interface IterationHistoryBarProps {
  iterations: ResumeIteration[];
  activeIterationId: string | null;
  onSelectIteration: (iteration: ResumeIteration) => void;
  onDeleteIteration: (id: string) => void;
  onBulkDeleteIterations?: (ids: string[]) => void;
  onClearHistory: () => void;
  theme?: 'dark' | 'light';
}

export const IterationHistoryBar: React.FC<IterationHistoryBarProps> = ({
  iterations,
  activeIterationId,
  onSelectIteration,
  onDeleteIteration,
  onBulkDeleteIterations,
  onClearHistory,
  theme = 'dark'
}) => {
  const isLight = theme === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'grid'>('horizontal');

  // Drag-to-scroll refs & state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  // Filter iterations based on search query & score filter
  const filteredIterations = useMemo(() => {
    if (!iterations || iterations.length === 0) return [];
    return iterations.filter(item => {
      const score = item.auditResult?.overall_fidelity_score;
      if (scoreFilter === 'high' && (score === undefined || score < 85)) return false;
      if (scoreFilter === 'medium' && (score === undefined || score < 70 || score >= 85)) return false;
      if (scoreFilter === 'low' && (score !== undefined && score >= 70)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (item.candidateName || '').toLowerCase();
      const title = (item.targetTitle || '').toLowerCase();
      const preset = (item.presetTitle || '').toLowerCase();
      const date = (item.timestamp || '').toLowerCase();

      return name.includes(q) || title.includes(q) || preset.includes(q) || date.includes(q);
    });
  }, [iterations, searchQuery, scoreFilter]);

  if (!iterations || iterations.length === 0) {
    return null;
  }

  // Handle drag-to-slide horizontal panning
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const scrollHorizontally = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 320;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Handle single item deletion with prompt
  const confirmDeleteSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const executeDeleteSingle = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onDeleteIteration(id);
    setDeletingId(null);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Handle Bulk Selection
  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredIterations.length && filteredIterations.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIterations.map(i => i.id)));
    }
  };

  const executeBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (onBulkDeleteIterations) {
      onBulkDeleteIterations(ids);
    } else {
      ids.forEach(id => onDeleteIteration(id));
    }
    setSelectedIds(new Set());
    setShowBulkConfirm(false);
  };

  const handleExportSelected = () => {
    const itemsToExport = iterations.filter(i => selectedIds.has(i.id));
    if (itemsToExport.length === 0) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(itemsToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `b2b_candidates_batch_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className={`border p-4 shadow-2xl mb-6 space-y-4 font-mono transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0d0d12] border-zinc-800/90 text-white'
    }`}>
      {/* Hide scrollbar styles */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <History className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2">
            Local Resume History
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 font-bold rounded">
              {iterations.length} {iterations.length === 1 ? 'Saved Iteration' : 'Saved Iterations'}
            </span>
          </h3>
        </div>

        {/* Layout & Batch Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Slidable Carousel vs Grid View Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-0.5 rounded">
            <button
              onClick={() => setLayoutMode('horizontal')}
              className={`p-1 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                layoutMode === 'horizontal' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="Horizontal Slidable Panel"
            >
              <Columns className="w-3.5 h-3.5" />
              Slidable
            </button>
            <button
              onClick={() => setLayoutMode('grid')}
              className={`p-1 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                layoutMode === 'grid' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
              title="Grid Layout"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </button>
          </div>

          {selectedIds.size > 0 && (
            <>
              <button
                onClick={handleExportSelected}
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3 h-3" />
                Export ({selectedIds.size})
              </button>

              <button
                onClick={() => setShowBulkConfirm(true)}
                className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete ({selectedIds.size})
              </button>
            </>
          )}

          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-[11px] text-zinc-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer px-2 py-1"
            title="Clear all saved history"
          >
            <Trash2 className="w-3 h-3" />
            Clear History
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search candidate name, target role, or company..."
            className={`w-full pl-8 pr-8 py-1.5 text-xs font-mono border focus:outline-none focus:border-blue-500 rounded ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-[#050505] border-zinc-800 text-zinc-200'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          <button
            onClick={toggleSelectAll}
            className={`px-2 py-1 text-[10px] font-bold uppercase border flex items-center gap-1 cursor-pointer rounded ${
              selectedIds.size === filteredIterations.length && filteredIterations.length > 0
                ? 'bg-blue-600 text-white border-blue-400'
                : isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            {selectedIds.size === filteredIterations.length && filteredIterations.length > 0 ? (
              <CheckSquare className="w-3 h-3" />
            ) : (
              <Square className="w-3 h-3" />
            )}
            Select All
          </button>

          <span className="text-zinc-600 text-[10px] px-1">|</span>

          <button
            onClick={() => setScoreFilter('all')}
            className={`px-2 py-1 text-[10px] font-bold uppercase border cursor-pointer rounded ${
              scoreFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-400'
                : isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setScoreFilter('high')}
            className={`px-2 py-1 text-[10px] font-bold uppercase border cursor-pointer rounded ${
              scoreFilter === 'high'
                ? 'bg-emerald-600 text-white border-emerald-400'
                : isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            85%+ Fidelity
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Clear All */}
      {showClearConfirm && (
        <div className="p-3 bg-rose-950/40 border border-rose-600/60 text-rose-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 rounded">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Are you sure you want to clear all {iterations.length} saved resume iterations?</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase border border-zinc-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onClearHistory();
                setShowClearConfirm(false);
              }}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold uppercase border border-rose-400 cursor-pointer"
            >
              Yes, Clear All
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Delete */}
      {showBulkConfirm && (
        <div className="p-3 bg-rose-950/40 border border-rose-600/60 text-rose-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 rounded">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Delete selected {selectedIds.size} candidates from local history?</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowBulkConfirm(false)}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase border border-zinc-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={executeBulkDelete}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold uppercase border border-rose-400 cursor-pointer"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Iterations Container: Slidable Panel or Grid */}
      <div className="relative group">
        {layoutMode === 'horizontal' && filteredIterations.length > 3 && (
          <>
            <button
              onClick={() => scrollHorizontally('left')}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-zinc-900/90 text-white border border-zinc-700 rounded-full shadow-lg hover:bg-blue-600 transition-colors opacity-80 group-hover:opacity-100"
              title="Slide Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollHorizontally('right')}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-zinc-900/90 text-white border border-zinc-700 rounded-full shadow-lg hover:bg-blue-600 transition-colors opacity-80 group-hover:opacity-100"
              title="Slide Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          onMouseDown={layoutMode === 'horizontal' ? handleMouseDown : undefined}
          onMouseLeave={layoutMode === 'horizontal' ? handleMouseLeaveOrUp : undefined}
          onMouseUp={layoutMode === 'horizontal' ? handleMouseLeaveOrUp : undefined}
          onMouseMove={layoutMode === 'horizontal' ? handleMouseMove : undefined}
          className={
            layoutMode === 'horizontal'
              ? "flex items-stretch gap-3 overflow-x-auto no-scrollbar py-1 scroll-smooth cursor-grab active:cursor-grabbing"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          }
        >
          {filteredIterations.map((item) => {
            const isActive = activeIterationId === item.id;
            const isSelected = selectedIds.has(item.id);
            const isConfirmingDelete = deletingId === item.id;
            const score = item.auditResult?.overall_fidelity_score;

            return (
              <div
                key={item.id}
                onClick={() => onSelectIteration(item)}
                className={`p-4 border transition-all cursor-pointer flex flex-col justify-between relative rounded-md ${
                  layoutMode === 'horizontal' ? 'w-72 sm:w-80 shrink-0' : 'w-full'
                } ${
                  isActive
                    ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/50 shadow-md shadow-blue-500/10'
                    : isLight
                    ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/90'
                }`}
              >
                {/* Top Card Bar */}
                <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-zinc-800/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={(e) => toggleSelect(item.id, e)}
                      className="text-zinc-500 hover:text-blue-400 transition-colors p-0.5 cursor-pointer shrink-0"
                      title={isSelected ? 'Deselect candidate' : 'Select candidate'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
                      )}
                    </button>

                    <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 truncate">
                      <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                      <span className="truncate">{item.timestamp}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isActive && (
                      <span className="text-[10px] font-mono font-extrabold text-blue-400 bg-blue-500/20 px-2 py-0.5 border border-blue-500/40 flex items-center gap-1 rounded">
                        <Check className="w-3 h-3 text-blue-400" />
                        ACTIVE
                      </span>
                    )}

                    {/* Per-Item Delete Button ("X" / Trash icon) */}
                    <button
                      onClick={(e) => confirmDeleteSingle(item.id, e)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/20 rounded transition-colors cursor-pointer border border-transparent hover:border-rose-500/30"
                      title="Delete this candidate iteration"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Delete Confirmation Overlay */}
                {isConfirmingDelete ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="my-2 p-2.5 bg-rose-950/90 border border-rose-500 text-rose-200 text-xs space-y-2 rounded"
                  >
                    <p className="font-bold text-[11px]">Delete candidate iteration?</p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(null);
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 border border-zinc-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={(e) => executeDeleteSingle(item.id, e)}
                        className="px-2 py-0.5 text-[10px] font-bold uppercase bg-rose-600 text-white border border-rose-400 cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h4 className={`text-xs font-bold truncate flex items-center gap-1.5 ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}>
                      <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{item.candidateName || 'Candidate'}</span>
                    </h4>

                    <p className="text-[11px] font-mono text-blue-400 truncate uppercase font-semibold">
                      {item.targetTitle}
                    </p>
                  </div>
                )}

                {/* Footer details */}
                <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-400 truncate max-w-[120px] flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="truncate">{item.presetTitle || 'Custom Preset'}</span>
                  </span>

                  {score !== undefined && score !== null ? (
                    <span
                      className={`font-bold px-1.5 py-0.5 border flex items-center gap-1 rounded ${
                        score >= 85
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : score >= 70
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      <ShieldCheck className="w-2.5 h-2.5" />
                      {score}% Fidelity
                    </span>
                  ) : (
                    <span className="text-zinc-500">Unverified</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
