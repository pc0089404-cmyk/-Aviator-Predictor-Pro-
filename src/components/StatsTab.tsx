import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Calendar,
  BarChart3,
  Info,
  ShieldCheck,
  Target,
  Sparkles,
  CreditCard,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { getWeeklyAnalysisData } from '../services/storageService';
import { WeeklyDayAnalysis, HistoricalCategory, UserAccessSession } from '../types';

interface StatsTabProps {
  session?: UserAccessSession | null;
  onRenew?: () => void;
}

export const StatsTab: React.FC<StatsTabProps> = ({ session, onRenew }) => {
  const weeklyData = useMemo(() => getWeeklyAnalysisData(), []);

  const getBadgeStyle = (category: HistoricalCategory) => {
    switch (category) {
      case 'Low':
        return {
          bg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
          dot: 'bg-blue-400',
          bar: 'bg-gradient-to-r from-blue-500 to-cyan-400'
        };
      case 'Normal':
        return {
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
          bar: 'bg-gradient-to-r from-emerald-500 to-teal-400'
        };
      case 'High':
        return {
          bg: 'bg-gradient-to-r from-red-500/15 to-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
          bar: 'bg-gradient-to-r from-rose-500 via-red-500 to-amber-500'
        };
    }
  };

  // Real-time calculation of remaining days and progress percentage
  const subscriptionDetails = useMemo(() => {
    if (!session) {
      return {
        isActive: false,
        isLifetime: false,
        daysRemaining: 0,
        progressPercent: 0
      };
    }

    if (session.isLifetime || session.isAdmin) {
      return {
        isActive: true,
        isLifetime: true,
        daysRemaining: -1,
        progressPercent: 100
      };
    }

    if (!session.expiryDate) {
      return {
        isActive: true,
        isLifetime: false,
        daysRemaining: session.daysRemaining || 12,
        progressPercent: ((session.daysRemaining || 12) / 12) * 100
      };
    }

    const expiryTime = new Date(session.expiryDate).getTime();
    const now = Date.now();
    const msRemaining = expiryTime - now;

    if (msRemaining <= 0) {
      return {
        isActive: false,
        isLifetime: false,
        daysRemaining: 0,
        progressPercent: 0
      };
    }

    const daysRemaining = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
    const progressPercent = Math.min(100, Math.max(5, (daysRemaining / 12) * 100));

    return {
      isActive: true,
      isLifetime: false,
      daysRemaining,
      progressPercent
    };
  }, [session]);

  return (
    <div className="w-full max-w-md mx-auto px-4 py-3 space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            Weekly Analysis
          </h1>
          <p className="text-[11px] text-neutral-400">
            Historical/Analysis Category cycles (Monday – Sunday)
          </p>
        </div>
        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg bg-red-600/20 text-amber-300 border border-amber-500/30 font-mono">
          Phase v2.9
        </span>
      </div>

      {/* Compact Monday - Sunday Unified Card (Normal website style, view everything at once) */}
      <div className="rounded-3xl bg-[#11131E] border border-white/10 p-3 shadow-xl divide-y divide-white/5">
        {weeklyData.map((item) => {
          const badge = getBadgeStyle(item.category);

          return (
            <div
              key={item.day}
              className={`py-2 px-2.5 rounded-xl flex items-center justify-between transition-colors ${
                item.isToday
                  ? 'bg-gradient-to-r from-red-950/40 via-amber-950/20 to-transparent border border-amber-500/30 shadow-sm'
                  : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Day Name */}
              <div className="flex items-center gap-2 min-w-[90px]">
                <span className={`text-xs font-bold ${item.isToday ? 'text-white' : 'text-neutral-300'}`}>
                  {item.day}
                </span>
                {item.isToday && (
                  <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black uppercase bg-gradient-to-r from-red-600 to-amber-500 text-white">
                    Today
                  </span>
                )}
              </div>

              {/* Category Badge */}
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${badge.bg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                <span>{item.category}</span>
              </div>

              {/* Historical Band */}
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-neutral-300 block">
                  {item.historicalBand}
                </span>
                <span className="text-[9px] text-neutral-400 block -mt-0.5">
                  Est. Band
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clean Compact Summary Matrix */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-2xl bg-[#11131E] border border-white/5 text-center shadow-md">
          <span className="text-[10px] text-neutral-400 block">Low Category</span>
          <span className="text-xs font-black text-blue-400 font-mono">2 Days</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#11131E] border border-white/5 text-center shadow-md">
          <span className="text-[10px] text-neutral-400 block">Normal Category</span>
          <span className="text-xs font-black text-emerald-400 font-mono">2 Days</span>
        </div>
        <div className="p-2.5 rounded-2xl bg-[#11131E] border border-white/5 text-center shadow-md">
          <span className="text-[10px] text-neutral-400 block">High Category</span>
          <span className="text-xs font-black text-amber-400 font-mono">3 Days</span>
        </div>
      </div>

      {/* ========================================================== */}
      {/* SUBSCRIPTION STATUS SECTION (Requirement 11) */}
      {/* ========================================================== */}
      <div className="rounded-3xl bg-gradient-to-b from-[#141724] to-[#0E101A] border border-white/10 p-4 shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Subscription Status
              </span>
              <span className="text-[10px] text-neutral-400 block">
                {subscriptionDetails.isLifetime ? 'Verified Account' : `User ID: ${session?.userId || 'Active'}`}
              </span>
            </div>
          </div>

          {/* Badge */}
          <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Subscription Active</span>
          </div>
        </div>

        {/* Dynamic Display: Lifetime Access OR Real Days Remaining with Progress Line */}
        {subscriptionDetails.isLifetime ? (
          <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white tracking-wide">
                Lifetime Access
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md">
              Permanent
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Time Remaining</span>
              </span>
              <span className="font-mono font-black text-amber-300">
                {subscriptionDetails.daysRemaining} {subscriptionDetails.daysRemaining === 1 ? 'day' : 'days'} remaining
              </span>
            </div>

            {/* Smooth animated progress indicator */}
            <div className="w-full h-2 rounded-full bg-neutral-900 border border-white/5 overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${subscriptionDetails.progressPercent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              />
            </div>
          </div>
        )}

        {/* Renew Now Button */}
        {!subscriptionDetails.isLifetime && onRenew && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onRenew}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600/80 via-rose-600/80 to-amber-600/80 hover:from-red-600 hover:to-amber-500 active:scale-[0.98] text-white font-extrabold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-white/10 shadow-md cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-300" />
              <span>Renew Now — ₦3,000 (Extend +12 Days)</span>
            </button>
          </div>
        )}
      </div>

      {/* Brief Clarity Note */}
      <div className="px-3 py-2 rounded-2xl bg-[#0D0F18] border border-white/5 flex items-center gap-2 text-neutral-400 text-[11px]">
        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Categories reflect mathematical historical dispersion and are not guaranteed predictions.</span>
      </div>
    </div>
  );
};
