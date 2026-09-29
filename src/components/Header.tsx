import React from 'react';
import { Volume2, VolumeX, ShieldCheck, Zap } from 'lucide-react';
import { DailyVerificationState, AppSettings } from '../types';

interface HeaderProps {
  verification: DailyVerificationState | null;
  settings: AppSettings;
  onToggleSound: () => void;
  onOpenVerification?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  verification,
  settings,
  onToggleSound,
  onOpenVerification
}) => {
  return (
    <header className="sticky top-0 z-40 w-full px-3 sm:px-4 py-2.5 backdrop-blur-xl bg-[#08090D]/90 border-b border-white/5">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Real life Aviator branding / logo area - fully unshrinkable so PRO is never hidden */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-800 shadow-md shadow-red-600/40 border border-red-400/40 p-1 shrink-0">
            {/* Real-life Aviator Red Monoplane Plane Icon */}
            <svg
              className="w-full h-full text-white transform -rotate-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <ellipse cx="88" cy="42" rx="2" ry="12" fill="#FFE4E6" transform="rotate(25 88 42)" />
              <circle cx="88" cy="42" r="3" fill="#FFFFFF" />
              <path
                d="M87 42 C85 39, 65 37, 45 42 C30 46, 18 52, 12 55 C10 56, 11 58, 14 57 C22 55, 38 52, 55 50 C70 48, 85 45, 87 42 Z"
                fill="#FFFFFF"
              />
              <path
                d="M58 46 L38 24 C36 21, 32 22, 33 25 L44 48 Z"
                fill="#FFFFFF"
                opacity="0.95"
              />
              <path
                d="M54 50 L42 74 C41 77, 37 77, 38 74 L46 51 Z"
                fill="#FFE4E6"
                opacity="0.8"
              />
              <path
                d="M17 54 L10 40 C9 38, 7 39, 8 41 L13 55 Z"
                fill="#FFFFFF"
              />
              <path
                d="M5 60 C15 57, 28 55, 42 53"
                stroke="#FCA5A5"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.7"
              />
            </svg>
            <span className="absolute -bottom-1 left-1.5 w-3 h-1 bg-amber-400 rounded-full blur-[2px]" />
          </div>

          {/* Bot name all prominent and guaranteed unshrinkable */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <span className="text-[14px] sm:text-[16px] font-black tracking-tight text-white leading-none uppercase italic whitespace-nowrap shrink-0">
              AVIATOR
            </span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-sm whitespace-nowrap shrink-0">
              PREDATOR
            </span>
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-red-600/25 border border-red-500/40 text-red-400 font-bold whitespace-nowrap shrink-0">
              PRO
            </span>
          </div>
        </div>

        {/* Right Action & Status Area - dragged further to the right */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Daily SportyBet Verified Badge */}
          {verification && verification.isVerified && (
            <div
              title="Daily SportyBet Verification Active"
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs shrink-0 shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] uppercase font-extrabold tracking-wider whitespace-nowrap">
                Verified
              </span>
            </div>
          )}

          {/* Sound Toggle Quick Access */}
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={settings.sound ? "Mute sound" : "Enable sound"}
            className="w-8 h-8 rounded-xl bg-[#141722] hover:bg-[#1a1f2e] border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0"
          >
            {settings.sound ? (
              <Volume2 className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
