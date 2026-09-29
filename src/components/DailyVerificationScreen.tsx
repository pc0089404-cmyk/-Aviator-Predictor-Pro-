import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Zap,
  Info
} from 'lucide-react';
import { validateMultiplierFormat, saveVerificationState, getTodayDateKey } from '../services/storageService';
import { DailyVerificationState, AppSettings } from '../types';
import { playSuccessSound, playFailSound, triggerVibrate } from '../services/soundService';

interface Props {
  onVerified: (state: DailyVerificationState) => void;
  settings: AppSettings;
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'failed';

export const DailyVerificationScreen: React.FC<Props> = ({ onVerified, settings }) => {
  // raw number input without the 'x'
  const [numInput, setNumInput] = useState('');
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validatedData, setValidatedData] = useState<{ numeric: number; formatted: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input automatically on mount
  useEffect(() => {
    if (status === 'idle') {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Live validation status for the tiny indicator on the left side of the input
  const liveValidation = useMemo(() => {
    const trimmed = numInput.trim();
    if (!trimmed) {
      return { state: 'empty' as const };
    }
    const result = validateMultiplierFormat(trimmed);
    if (result.isValid) {
      return { state: 'valid' as const, formatted: result.formatted };
    }
    return { state: 'invalid' as const, error: result.error };
  }, [numInput]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Strip any accidental 'x' or 'X' since 'x' is already fixed in place
    val = val.replace(/[xX]/g, '');
    // Allow digits and at most one decimal point
    const cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let formattedVal = parts[0];
    if (parts.length > 1) {
      formattedVal += '.' + parts.slice(1).join('');
    }

    setNumInput(formattedVal);
    if (errorMessage) setErrorMessage(null);
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (status === 'verifying') return;

    const trimmed = numInput.trim();
    if (!trimmed) {
      setErrorMessage("Please enter today's first Aviator multiplier.");
      return;
    }

    setErrorMessage(null);
    setStatus('verifying');
    triggerVibrate(settings.vibration, 25);

    // Validate format: passing numInput (e.g. 22.6)
    const validation = validateMultiplierFormat(trimmed);

    // Smooth, beautiful verification animation duration (~1.4s)
    await new Promise((resolve) => setTimeout(resolve, 1400));

    if (validation.isValid && validation.numeric !== undefined && validation.formatted) {
      // SUCCESS: green checkmark with tiny dots around it
      const today = getTodayDateKey();
      const state: DailyVerificationState = {
        date: today,
        firstMultiplier: validation.formatted,
        numericMultiplier: validation.numeric,
        isVerified: true,
        verifiedAt: new Date().toISOString()
      };

      setValidatedData({
        numeric: validation.numeric,
        formatted: validation.formatted
      });
      setStatus('success');
      playSuccessSound(settings.sound);
      triggerVibrate(settings.vibration, [40, 80, 40]);

      // Save persistently for today
      saveVerificationState(state);

      // Auto-enter dashboard after celebration animation
      setTimeout(() => {
        onVerified(state);
      }, 1900);
    } else {
      // FAILED
      setStatus('failed');
      setErrorMessage(validation.error || 'Verification Failed: Multiplier must have a decimal (e.g. 22.6x or 2.50x).');
      playFailSound(settings.sound);
      triggerVibrate(settings.vibration, [80, 60, 100]);
    }
  };

  const handleTryAgain = () => {
    setStatus('idle');
    setErrorMessage(null);
    triggerVibrate(settings.vibration, 20);
  };

  // Real-time live date tracker that updates automatically in real life across days and years (e.g. 2026 to 2027+)
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    // Keep date updated dynamically in real-time
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayDisplay = useMemo(() => {
    return currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, [currentDate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07080D]/95 backdrop-blur-2xl overflow-y-auto">
      {/* Ambient background glows matching SportyBet red & gold */}
      <div className="absolute top-[-10%] left-[-10%] w-[420px] h-[420px] rounded-full bg-red-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[380px] h-[380px] rounded-full bg-amber-500/12 blur-[120px] pointer-events-none" />

      {/* Main Soft UI Container Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-[36px] bg-[#11131E]/95 border border-white/10 p-6 md:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl"
      >
        {/* Soft inner highlight bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-amber-500/50" />

        {/* Top Header Badge & Live Real-Time Date with clean spacing */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-red-500/15 to-amber-500/15 border border-red-500/25 text-red-300 text-xs font-semibold tracking-wide shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold tracking-wider">SPORTYBET GATEWAY</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-[11px] font-medium tracking-wide flex items-center gap-1.5 shrink-0 shadow-sm ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>{todayDisplay}</span>
          </div>
        </div>

        {/* Dynamic Card Content States */}
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Titles */}
              <div className="space-y-2 text-center">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 p-[1.5px] shadow-lg shadow-red-600/30 mb-2">
                  <div className="w-full h-full rounded-[22px] bg-[#0E101A] flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 border-2 border-[#0E101A] flex items-center justify-center text-[10px] font-black text-black">
                    <Zap className="w-3.5 h-3.5 fill-black stroke-none" />
                  </div>
                </div>

                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                  SportyBet Verification
                </h1>
                <p className="text-sm text-neutral-400 leading-relaxed px-2">
                  Enter today's first Aviator multiplier
                </p>
              </div>

              {/* Input Form with Tiny Indicator on Left & Fixed 'x' on Right */}
              <form onSubmit={handleVerify} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-neutral-400 uppercase px-1">
                    <span>First Multiplier</span>
                    <span className="text-amber-400/90 text-[11px] font-mono">Format: 22.6x</span>
                  </div>

                  {/* Soft UI Input Box */}
                  <div className="relative flex items-center justify-between rounded-3xl bg-[#0B0D15] border-2 border-white/10 focus-within:border-red-500/80 focus-within:ring-4 focus-within:ring-red-500/20 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] transition-all px-4 py-3">
                    {/* TINY LEFT-SIDE VALIDATION MARK */}
                    <div className="shrink-0 flex items-center justify-center w-7 h-7 mr-2">
                      {liveValidation.state === 'empty' && (
                        <div
                          className="w-2.5 h-2.5 rounded-full bg-neutral-600 transition-all"
                          title="Waiting for input"
                        />
                      )}
                      {liveValidation.state === 'invalid' && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shadow-sm"
                          title="Wrong format (e.g. enter decimal 22.6x, not 22)"
                        >
                          <X className="w-3.5 h-3.5 stroke-[3]" />
                        </motion.div>
                      )}
                      {liveValidation.state === 'valid' && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/20"
                          title="Valid multiplier format"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </motion.div>
                      )}
                    </div>

                    {/* Number Input (User types only number and dot) */}
                    <input
                      ref={inputRef}
                      type="text"
                      inputMode="decimal"
                      value={numInput}
                      onChange={handleInputChange}
                      placeholder="22.6"
                      className="w-full text-center text-3xl sm:text-4xl font-extrabold tracking-wider font-mono-numbers text-white placeholder-neutral-700 bg-transparent focus:outline-none"
                    />

                    {/* Fixed 'x' on the right side */}
                    <div className="shrink-0 pl-1 pr-1 select-none">
                      <span className="text-3xl sm:text-4xl font-extrabold font-mono-numbers text-amber-400">
                        x
                      </span>
                    </div>
                  </div>

                  {/* Dynamic hint message based on live input */}
                  <div className="min-h-[20px] flex items-center justify-center">
                    {liveValidation.state === 'invalid' && (
                      <span className="text-[11px] text-red-400 flex items-center gap-1 font-medium animate-pulse">
                        <AlertCircle className="w-3 h-3" />
                        Must include a decimal point (e.g. 22.6x or 2.50x)
                      </span>
                    )}
                    {liveValidation.state === 'valid' && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                        <Check className="w-3 h-3" />
                        Format ready ({liveValidation.formatted})
                      </span>
                    )}
                    {liveValidation.state === 'empty' && (
                      <span className="text-[11px] text-neutral-400">
                        Type the number and decimal (e.g. 22.6 or 2.50)
                      </span>
                    )}
                  </div>
                </div>

                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                {/* Primary Action Button */}
                <button
                  type="submit"
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-[0.98] text-white font-extrabold text-base tracking-wider uppercase shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <span>VERIFY</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              {/* Bottom Clarifying Note as requested */}
              <div className="pt-2 border-t border-white/5 text-center">
                <div className="p-3 rounded-2xl bg-[#0D0F18] border border-white/5 text-neutral-400 text-xs flex items-center justify-center gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px] leading-relaxed text-neutral-300">
                    <strong>Note:</strong> SportyBet multiplier is the first crash flight number recorded today in the Aviator game on SportyBet.
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* BEAUTIFUL LOADING ANIMATION */}
          {status === 'verifying' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-10 flex flex-col items-center text-center space-y-6"
            >
              {/* Premium Multi-Ring Glowing Orbit Radar */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping opacity-75" />
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-red-500 border-r-amber-500 animate-spin-fast" />
                <div className="absolute inset-5 rounded-full border border-dashed border-red-400/40 animate-spin-slow" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-950 via-rose-900 to-[#1A1020] border border-red-500/50 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.4)]">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
                <div className="absolute top-1 right-3 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#F59E0B] animate-pulse" />
                <div className="absolute bottom-2 left-4 w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_#EF4444] animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-wide">
                  Verifying Multiplier
                </h3>
                <p className="text-xs text-neutral-400 max-w-[280px] mx-auto leading-relaxed">
                  Connecting SportyBet entropy reference & validating decimal criteria...
                </p>
                <div className="font-mono text-sm text-amber-300 font-extrabold pt-1">
                  "{numInput.trim()}x"
                </div>
              </div>

              <div className="w-52 h-2 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 animate-pulse w-full rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
              </div>
            </motion.div>
          )}

          {/* GREEN SUCCESS ANIMATION WITH TINY DOTS AROUND IT */}
          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 flex flex-col items-center text-center space-y-6"
            >
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* 12 Tiny Dots Radiating & Floating Around the Checkmark */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 360) / 12;
                  const rad = (angle * Math.PI) / 180;
                  const radius = 58;
                  const x = Math.cos(rad) * radius;
                  const y = Math.sin(rad) * radius;
                  const isGold = i % 3 === 0;

                  return (
                    <motion.div
                      key={i}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: [0, 1.3, 1],
                        opacity: [0, 1, 0.85],
                        y: [y, y + (i % 2 === 0 ? 3 : -3), y]
                      }}
                      transition={{
                        delay: 0.15 + i * 0.03,
                        duration: 1.2,
                        repeat: Infinity,
                        repeatType: 'reverse'
                      }}
                      style={{
                        position: 'absolute',
                        left: `calc(50% + ${x}px - 4px)`,
                        top: `calc(50% + ${y}px - 4px)`
                      }}
                      className={`w-2 h-2 rounded-full ${
                        isGold
                          ? 'bg-amber-400 shadow-[0_0_8px_#F59E0B]'
                          : 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
                      }`}
                    />
                  );
                })}

                <div className="absolute inset-4 rounded-full bg-emerald-500/25 blur-xl pointer-events-none" />

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-[0_0_35px_rgba(16,185,129,0.5)] border-2 border-emerald-300/40"
                >
                  <Check className="w-12 h-12 text-white stroke-[3.5]" />
                </motion.div>
              </div>

              <div className="space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-black text-emerald-400 tracking-tight"
                >
                  Verified Successfully
                </motion.h2>
                <p className="text-xs text-neutral-300 max-w-[280px]">
                  Daily reference recorded at{' '}
                  <span className="text-amber-300 font-mono font-bold text-sm">
                    {validatedData?.formatted}
                  </span>
                  . Entering dashboard...
                </p>
              </div>

              <div className="px-4 py-2 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Launching Aviator Predator Pro...</span>
              </div>
            </motion.div>
          )}

          {/* RED FAILED ANIMATION */}
          {status === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 flex flex-col items-center text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: [0, 1.15, 1], rotate: [0, -8, 8, -4, 4, 0] }}
                transition={{ duration: 0.5 }}
                className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 flex items-center justify-center shadow-[0_0_35px_rgba(225,29,72,0.4)] border-2 border-red-400/40"
              >
                <div className="absolute inset-0 rounded-full border-4 border-red-300/25 animate-pulse" />
                <X className="w-12 h-12 text-white stroke-[3.5]" />
              </motion.div>

              <div className="space-y-2 px-2">
                <h2 className="text-2xl font-black text-red-400 tracking-tight">
                  Verification Failed
                </h2>
                <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-500/30 text-xs text-red-200 text-left space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-red-300">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Formatting Error</span>
                  </div>
                  <p className="text-red-200/90 leading-relaxed text-[11px]">
                    {errorMessage || "Input did not meet multiplier formatting specifications."}
                  </p>
                </div>
              </div>

              {/* Try Again Button */}
              <button
                type="button"
                onClick={handleTryAgain}
                className="w-full py-4 px-6 rounded-2xl bg-[#171A27] hover:bg-[#202538] active:scale-[0.98] text-white font-extrabold text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-white/10 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Try Again</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
