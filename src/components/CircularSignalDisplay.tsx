import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RefreshCw,
  Play,
  Square,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Activity,
  Timer,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { SignalData, AppSettings } from '../types';

interface CircularSignalDisplayProps {
  currentSignal: SignalData | null;
  status: 'idle' | 'analyzing' | 'generated';
  analysisStep: string;
  progressPercent: number;
  isAutoRunning: boolean;
  secondsRemaining: number;
  onStartSignals: () => void;
  onStopSignals: () => void;
  onRefresh: () => void;
  settings: AppSettings;
}

export const CircularSignalDisplay: React.FC<CircularSignalDisplayProps> = ({
  currentSignal,
  status,
  analysisStep,
  progressPercent,
  isAutoRunning,
  secondsRemaining,
  onStartSignals,
  onStopSignals,
  onRefresh,
  settings
}) => {
  const isAnalyzing = status === 'analyzing';
  const isGenerated = status === 'generated' && currentSignal !== null;
  const isIdle = status === 'idle';

  // Multiplier text
  const displayMultiplier = isGenerated ? currentSignal.multiplier : '0.00x';

  // Calculate percentage of 50s countdown passed
  const countdownProgress = isGenerated && isAutoRunning ? (secondsRemaining / 50) * 100 : 100;
  const countdownRadius = 104;
  const countdownCircumference = 2 * Math.PI * countdownRadius;
  const countdownDashoffset = countdownCircumference - (countdownProgress / 100) * countdownCircumference;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Small Status & Auto-Cycle Indicator */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#11131E] border border-white/10 shadow-md text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              isAnalyzing
                ? 'bg-amber-400 animate-ping'
                : isAutoRunning
                ? 'bg-emerald-400 animate-pulse'
                : isGenerated
                ? 'bg-amber-400'
                : 'bg-neutral-500'
            }`}
          />
          <span className="font-bold text-neutral-200">
            {isAnalyzing
              ? 'Synthesizing Signal...'
              : isAutoRunning
              ? 'Signal Active (Auto 50s)'
              : isGenerated
              ? 'Signal Analysis Ready'
              : 'Analysis Ready'}
          </span>
        </div>

        {/* 50-Second Countdown Chip */}
        {isAutoRunning && isGenerated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold shadow-sm"
          >
            <Timer className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>{secondsRemaining}s</span>
          </motion.div>
        )}
      </div>

      {/* Large Circular Signal Display with Soft UI & Multi-Tone Glow */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center select-none">
        {/* Soft Radial Ambient Glow */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none ${
            isAnalyzing
              ? 'bg-red-600/30 blur-3xl scale-110'
              : isAutoRunning
              ? 'bg-gradient-to-tr from-red-600/25 via-amber-500/15 to-rose-600/25 blur-2xl scale-105'
              : isGenerated
              ? 'bg-amber-500/15 blur-2xl scale-100'
              : 'bg-red-600/5 blur-xl scale-95'
          }`}
        />

        {/* Circular SVG Rings */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 240 240">
          {/* Base background track */}
          <circle
            cx="120"
            cy="120"
            r="104"
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth="8"
          />

          {/* Calibrated Tick Marks / Dials */}
          <circle
            cx="120"
            cy="120"
            r="94"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="2"
            strokeDasharray="3 8"
          />

          {/* Active 50-Second Countdown Ring or Spinning Analyzing Ring */}
          {isAnalyzing ? (
            <circle
              cx="120"
              cy="120"
              r="104"
              fill="none"
              stroke="url(#redGoldGrad)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="70 180"
              className={
                settings.animationEffects
                  ? 'animate-spin-fast origin-center'
                  : 'transition-all duration-500'
              }
            />
          ) : isGenerated && isAutoRunning ? (
            <circle
              cx="120"
              cy="120"
              r="104"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={countdownCircumference}
              strokeDashoffset={countdownDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          ) : isGenerated ? (
            <circle
              cx="120"
              cy="120"
              r="104"
              fill="none"
              stroke="#EF4444"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="660 0"
            />
          ) : (
            <circle
              cx="120"
              cy="120"
              r="104"
              fill="none"
              stroke="rgba(239, 68, 68, 0.2)"
              strokeWidth="8"
            />
          )}

          {/* SVG Linear Gradient Definition */}
          <defs>
            <linearGradient id="redGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="50%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>

        {/* Inner Glass Card Circle */}
        <div className="relative w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-[#0E101A]/90 border border-white/10 flex flex-col items-center justify-center text-center p-4 shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden">
          {/* Subtle radar sweep gradient during analysis */}
          {settings.animationEffects && isAnalyzing && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-red-500/10 to-amber-500/20 animate-radar origin-center pointer-events-none" />
          )}

          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* Top tiny label */}
            <span className="text-[11px] font-extrabold tracking-widest uppercase text-neutral-400 mb-1 flex items-center gap-1">
              {isAnalyzing ? (
                <>
                  <Activity className="w-3 h-3 text-red-400 animate-pulse" />
                  ANALYZING
                </>
              ) : isGenerated ? (
                <>
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400">ESTIMATED SIGNAL</span>
                </>
              ) : (
                'SIGNAL MULTIPLIER'
              )}
            </span>

            {/* Main Multiplier Number */}
            <motion.div
              key={displayMultiplier}
              initial={isGenerated ? { scale: 0.8, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={`text-4xl sm:text-5xl font-black font-mono-numbers tracking-tight ${
                isGenerated
                  ? 'text-white drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : isAnalyzing
                  ? 'text-red-300 animate-pulse'
                  : 'text-neutral-500'
              }`}
            >
              {displayMultiplier}
            </motion.div>

            {/* Bottom subtitle / category info */}
            <div className="mt-1 h-5 flex items-center justify-center">
              {isAnalyzing ? (
                <span className="text-[10px] text-amber-400 font-medium">
                  {analysisStep || 'Synthesizing...'}
                </span>
              ) : isGenerated ? (
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                  Target: {currentSignal.targetRange}
                </span>
              ) : (
                <span className="text-[10px] text-neutral-500 font-medium">
                  Press Start Signals
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Details Card when Generated */}
      <AnimatePresence>
        {isGenerated && (
          <motion.div
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="w-full max-w-sm mt-5 space-y-2.5"
          >
            <div className="p-4 rounded-3xl bg-[#11131E] border border-white/10 shadow-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="text-neutral-400 font-medium">Trajectory Category:</span>
                <span className="font-extrabold text-amber-300 px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/25">
                  {currentSignal.category}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[11px]">Volatility Index</span>
                  <span className="font-semibold text-neutral-200">{currentSignal.volatilityLevel} Level</span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-400 block text-[11px]">Confidence Matrix</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ~{currentSignal.confidenceScore}% (Est.)
                  </span>
                </div>
              </div>

              {isAutoRunning && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auto-update window:</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    {secondsRemaining}s remaining
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytical Caution Disclaimer */}
      <div className="mt-3.5 flex items-center justify-center gap-1.5 text-neutral-500 text-[11px] text-center max-w-xs">
        <AlertTriangle className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
        <span>Signals are estimates only. Multipliers are not guaranteed.</span>
      </div>

      {/* Action Controls: START/STOP SIGNALS and REFRESH */}
      <div className="w-full max-w-sm mt-5 flex items-center gap-3">
        {/* Toggle START SIGNALS / STOP SIGNALS */}
        {isAutoRunning ? (
          <button
            type="button"
            onClick={onStopSignals}
            className="flex-1 py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl bg-gradient-to-r from-amber-600 via-rose-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white shadow-red-600/25 active:scale-[0.98] transition-all cursor-pointer border border-amber-400/30"
          >
            <Square className="w-4 h-4 fill-white stroke-none" />
            <span>STOP SIGNALS</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartSignals}
            disabled={isAnalyzing}
            className={`flex-1 py-4 px-6 rounded-2xl font-extrabold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ${
              isAnalyzing
                ? 'bg-neutral-800 text-neutral-500 border border-white/5 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-red-600/30 active:scale-[0.98]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-white stroke-none" />
                <span>START SIGNALS</span>
              </>
            )}
          </button>
        )}

        {/* REFRESH (Reset) button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isAnalyzing || isIdle}
          title="Reset signal state to idle (0.00x)"
          className={`px-4 py-4 rounded-2xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            isIdle || isAnalyzing
              ? 'opacity-40 bg-[#12141F] border-white/5 text-neutral-500 cursor-not-allowed'
              : 'bg-[#151824] hover:bg-[#1c2030] text-neutral-300 hover:text-white border-white/10 active:scale-[0.96]'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span className="text-xs font-bold uppercase">Reset</span>
        </button>
      </div>
    </div>
  );
};
