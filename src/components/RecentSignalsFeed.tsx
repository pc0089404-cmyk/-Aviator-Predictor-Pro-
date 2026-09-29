import React from 'react';
import { Clock, TrendingUp, ShieldCheck, History, Sparkles } from 'lucide-react';
import { SignalData } from '../types';

interface RecentSignalsFeedProps {
  history: SignalData[];
}

export const RecentSignalsFeed: React.FC<RecentSignalsFeedProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="w-full max-w-sm mt-8 p-6 rounded-3xl bg-[#11131E] border border-white/5 text-center shadow-lg">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-neutral-800/80 flex items-center justify-center text-neutral-400 mb-2.5">
          <History className="w-6 h-6 text-amber-400/80" />
        </div>
        <p className="text-sm font-bold text-neutral-200">No signals generated yet</p>
        <p className="text-xs text-neutral-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
          Tap "START SIGNALS" to trigger continuous 50-second trajectory analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mt-8 space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-neutral-400">
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>Session Flight Log</span>
        </div>
        <span className="text-[11px] font-mono text-amber-400/90 font-bold">
          {history.length} {history.length === 1 ? 'Signal' : 'Signals'}
        </span>
      </div>

      <div className="space-y-2">
        {history.slice(0, 5).map((sig) => {
          const isHigh = sig.numericValue >= 5.0;
          const isMid = sig.numericValue >= 2.2 && sig.numericValue < 5.0;

          return (
            <div
              key={sig.id}
              className="p-3.5 rounded-3xl bg-[#11131E] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex flex-col items-center justify-center w-14 py-2 rounded-2xl font-mono-numbers font-black text-sm border shadow-sm ${
                    isHigh
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                      : isMid
                      ? 'bg-rose-600/15 border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  {sig.multiplier}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {sig.category}
                    </span>
                    <span className="text-[9px] text-neutral-400 font-bold uppercase px-1.5 py-0.5 rounded-md bg-white/5">
                      {sig.volatilityLevel}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Target: <span className="font-mono text-neutral-200 font-bold">{sig.targetRange}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-[10px] text-neutral-400 font-mono">
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span>{sig.timestamp}</span>
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                  ~{sig.confidenceScore}% est.
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
