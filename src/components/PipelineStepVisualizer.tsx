import React from 'react';
import { Database, Target, CheckSquare, FileText, ShieldAlert, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface StepStatus {
  stage: number;
  name: string;
  subtitle: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  durationMs?: number;
}

interface PipelineStepVisualizerProps {
  steps: StepStatus[];
  currentActiveStage: number;
  onSelectStage: (stage: number) => void;
  theme?: 'dark' | 'light';
}

export const PipelineStepVisualizer: React.FC<PipelineStepVisualizerProps> = ({
  steps,
  currentActiveStage,
  onSelectStage,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const getStageIcon = (stage: number) => {
    switch (stage) {
      case 1:
        return <Database className="w-4 h-4" />;
      case 2:
        return <Target className="w-4 h-4" />;
      case 3:
        return <CheckSquare className="w-4 h-4" />;
      case 4:
        return <FileText className="w-4 h-4" />;
      case 5:
        return <ShieldAlert className="w-4 h-4" />;
      default:
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  return (
    <div className={`border p-5 shadow-2xl transition-colors ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0a0a0c] border-zinc-800 text-white'
    }`}>
      <div className={`flex items-center justify-between mb-4 px-1 border-b pb-3 ${
        isLight ? 'border-slate-200' : 'border-zinc-800'
      }`}>
        <div>
          <h2 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            <span>The Fidelity Pipeline Architecture</span>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-blue-500/10 text-blue-500 border border-blue-500/30">
              Deterministic 4-Stage LLM Flow
            </span>
          </h2>
          <p className="text-xs font-mono text-zinc-400 mt-1 uppercase tracking-tight">
            Decoupled LLM stages eliminate Carbon Copy cloning and Hallucinations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {steps.map((s) => {
          const isActive = currentActiveStage === s.stage;
          const isCompleted = s.status === 'completed';
          const isRunning = s.status === 'running';
          const isError = s.status === 'error';

          return (
            <motion.button
              key={s.stage}
              onClick={() => onSelectStage(s.stage)}
              animate={
                isRunning
                  ? {
                      scale: [1, 1.02, 1],
                      boxShadow: [
                        '0 0 0px rgba(59, 130, 246, 0)',
                        isLight
                          ? '0 0 18px rgba(37, 99, 235, 0.45)'
                          : '0 0 18px rgba(59, 130, 246, 0.5)',
                        '0 0 0px rgba(59, 130, 246, 0)',
                      ],
                    }
                  : { scale: 1, boxShadow: '0 0 0px rgba(0,0,0,0)' }
              }
              transition={
                isRunning
                  ? { repeat: Infinity, duration: 1.5, ease: 'easeInOut' }
                  : { duration: 0.2 }
              }
              className={`text-left p-3.5 border transition-colors relative group cursor-pointer overflow-hidden rounded-md ${
                isActive
                  ? isLight
                    ? 'bg-blue-50/90 border-blue-500 shadow-sm'
                    : 'bg-zinc-900 border-blue-500 shadow-lg shadow-blue-500/10'
                  : isLight
                  ? 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                  : 'bg-[#050505] border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-900/60'
              }`}
            >
              {/* Running Pulsing Background Wave */}
              {isRunning && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.98, 1.01, 0.98] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className={`absolute inset-0 pointer-events-none rounded-md ${
                    isLight ? 'bg-blue-500/15' : 'bg-blue-500/20'
                  }`}
                />
              )}

              <div className="flex items-center justify-between mb-2 relative z-10">
                <span
                  className={`flex items-center justify-center w-7 h-7 font-mono text-xs font-bold transition-all ${
                    isCompleted
                      ? isLight
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : isRunning
                      ? isLight
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : isError
                      ? isLight
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : isLight
                      ? 'bg-slate-200 text-slate-700 border border-slate-300'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {isRunning ? <Loader2 className={`w-3.5 h-3.5 animate-spin ${isLight ? 'text-blue-700' : 'text-blue-400'}`} /> : s.stage}
                </span>

                <div className="flex items-center gap-1.5">
                  {s.durationMs !== undefined && (
                    <motion.span
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                        isLight ? 'text-slate-600' : 'text-zinc-400'
                      }`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {(s.durationMs / 1000).toFixed(1)}s
                    </motion.span>
                  )}

                  <AnimatePresence mode="wait">
                    {isCompleted && (
                      <motion.div
                        key={`check-${s.stage}`}
                        initial={{ opacity: 0, x: 16, scale: 0.5 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -8, scale: 0.5 }}
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 24,
                        }}
                        className={`flex items-center justify-center ${
                          isLight ? 'text-emerald-700' : 'text-emerald-400'
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${
                          isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                        }`} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className={`flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider relative z-10 ${
                isLight ? 'text-slate-800 group-hover:text-slate-900' : 'text-zinc-200 group-hover:text-white'
              }`}>
                <span className={
                  isCompleted
                    ? isLight ? 'text-emerald-700' : 'text-emerald-400'
                    : isRunning
                    ? isLight ? 'text-blue-700' : 'text-blue-400'
                    : isLight ? 'text-slate-500' : 'text-zinc-400'
                }>
                  {getStageIcon(s.stage)}
                </span>
                <span className="truncate">{s.name}</span>
              </div>

              <p className={`text-[11px] font-mono mt-1 line-clamp-1 relative z-10 ${
                isLight ? 'text-slate-600 font-medium' : 'text-zinc-400'
              }`}>{s.subtitle}</p>

              {/* Active Step Bottom Indicator Line */}
              {isActive && (
                <motion.div
                  layoutId="activePipelineIndicator"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

