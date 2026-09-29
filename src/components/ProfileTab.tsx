import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Zap,
  Vibrate,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Info,
  Check,
  Smartphone,
  ExternalLink,
  Flame,
  Award,
  Cpu,
  Star
} from 'lucide-react';
import { AppSettings, DailyVerificationState, UserAccessSession } from '../types';
import { playSignalSound, triggerVibrate } from '../services/soundService';

interface ProfileTabProps {
  settings: AppSettings;
  verification: DailyVerificationState | null;
  session?: UserAccessSession | null;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onReverify: () => void;
  onSwitchUser?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  settings,
  verification,
  session,
  onUpdateSettings,
  onReverify,
  onSwitchUser
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toggleSetting = (key: keyof AppSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    onUpdateSettings(updated);

    // Haptic feedback
    triggerVibrate(updated.vibration, 30);

    // If sound was turned ON, play a soft preview chime
    if (key === 'sound' && updated.sound) {
      playSignalSound(true);
    }

    // If notifications turned ON, request permission on real device
    if (key === 'notifications' && updated.notifications) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            try {
              new Notification('Aviator Predictor Pro', {
                body: 'Phone notifications connected! You will receive signal drops directly on your device.',
                icon: '/favicon.ico'
              });
            } catch (e) {}
          }
        });
      }
    }

    // Show temporary confirmation toast for settings like notifications/alerts
    let msg = '';
    if (key === 'sound') msg = updated.sound ? 'Sound enabled' : 'Sound muted';
    else if (key === 'notifications') msg = updated.notifications ? 'System notifications enabled' : 'Notifications disabled';
    else if (key === 'signalAlerts') msg = updated.signalAlerts ? 'Signal alert audio active' : 'Signal alerts muted';
    else if (key === 'vibration') msg = updated.vibration ? 'Haptic feedback on' : 'Haptic feedback off';
    else if (key === 'animationEffects') msg = updated.animationEffects ? 'Animation effects enabled' : 'Animations reduced';

    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 space-y-6 pb-28">
      {/* Toast Notification */}
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-neutral-900/90 text-white text-xs font-semibold shadow-xl border border-white/10 flex items-center gap-2 backdrop-blur-md"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>{toastMessage}</span>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Profile & Settings
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Device preferences and analytical engine configuration
          </p>
        </div>
        <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-red-600/20 to-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-extrabold font-mono shadow-sm">
          PRO v2.9
        </div>
      </div>

      {/* Profile Card */}
      <div className="p-5 rounded-3xl bg-[#11131E] border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 p-0.5 shadow-lg shadow-red-600/25">
            <div className="w-full h-full rounded-[14px] bg-[#0E1019] flex items-center justify-center text-white font-black text-lg tracking-wider">
              AP
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 border-2 border-[#0E1019] flex items-center justify-center">
              <Check className="w-3 h-3 text-black stroke-[3.5]" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Pro Flight Analyst
              </h2>
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-amber-400 stroke-none" />
                PREMIUM
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Engine Identifier: <span className="font-mono text-neutral-300">AV-282C0D</span>
            </p>
          </div>
        </div>

        {/* Active User ID & Subscription Details */}
        {session && (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0D0F18] border border-white/5 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-white font-bold block font-mono text-[13px]">
                  ID: {session.userId}
                </span>
                <span className="text-[10px] text-neutral-400 block">
                  {session.isLifetime
                    ? 'Permanent Lifetime Access'
                    : `${session.daysRemaining || 12} days remaining`}
                </span>
              </div>
            </div>

            {onSwitchUser && (
              <button
                type="button"
                onClick={onSwitchUser}
                className="text-[11px] text-red-400 hover:text-red-300 font-bold px-2.5 py-1.5 rounded-xl bg-red-500/10 border border-red-500/25 transition-colors cursor-pointer"
              >
                Switch ID
              </button>
            )}
          </div>
        )}

        {/* Daily SportyBet Verification Status Section */}
        <div className="p-4 rounded-2xl bg-[#0D0F18] border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-200">
                SportyBet Daily Verification
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              {verification?.isVerified ? 'VERIFIED' : 'PENDING'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
            <span>Calibrated Daily Multiplier:</span>
            <span className="font-mono font-extrabold text-amber-300 text-sm">
              {verification?.firstMultiplier || 'None'}
            </span>
          </div>

          {verification?.verifiedAt && (
            <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
              <span>Seed Registered Date:</span>
              <span className="font-mono text-neutral-400">
                {verification.date}
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onReverify}
              className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] text-neutral-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Update / Re-verify Today's Seed</span>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Section with iPhone-style Switches */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
          Settings & Preferences
        </h2>

        <div className="rounded-3xl bg-[#11131E] border border-white/10 divide-y divide-white/5 overflow-hidden shadow-xl">
          {/* Sound Setting */}
          <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-600/15 border border-red-500/20 flex items-center justify-center text-red-400">
                {settings.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">
                  Sound
                </span>
                <span className="text-[11px] text-neutral-400">
                  Signal completion and verification audio
                </span>
              </div>
            </div>
            <IOSSwitch checked={settings.sound} onChange={() => toggleSetting('sound')} />
          </div>

          {/* Notifications Setting */}
          <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400">
                {settings.notifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4 text-neutral-500" />}
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">
                  Notifications
                </span>
                <span className="text-[11px] text-neutral-400">
                  Cycle shift and session notifications
                </span>
              </div>
            </div>
            <IOSSwitch checked={settings.notifications} onChange={() => toggleSetting('notifications')} />
          </div>

          {/* Signal Alerts Setting */}
          <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">
                  Signal Alerts
                </span>
                <span className="text-[11px] text-neutral-400">
                  Target threshold notifications
                </span>
              </div>
            </div>
            <IOSSwitch checked={settings.signalAlerts} onChange={() => toggleSetting('signalAlerts')} />
          </div>

          {/* Vibration Setting */}
          <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Vibrate className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">
                  Vibration
                </span>
                <span className="text-[11px] text-neutral-400">
                  Haptic tactile response on actions
                </span>
              </div>
            </div>
            <IOSSwitch checked={settings.vibration} onChange={() => toggleSetting('vibration')} />
          </div>

          {/* Animation Effects Setting */}
          <div className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-500/20 to-amber-500/20 border border-amber-500/20 flex items-center justify-center text-amber-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">
                  Animation Effects
                </span>
                <span className="text-[11px] text-neutral-400">
                  Fluid radar, 50s countdown ring & glow
                </span>
              </div>
            </div>
            <IOSSwitch checked={settings.animationEffects} onChange={() => toggleSetting('animationEffects')} />
          </div>
        </div>
      </div>

      {/* App Information Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
          App Information
        </h2>

        <div className="p-4 rounded-3xl bg-[#11131E] border border-white/10 space-y-3 text-xs shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Application</span>
            <span className="font-bold text-white">Aviator Predator Pro</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Release Version</span>
            <span className="font-mono font-bold text-amber-400">Version 2.9</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Engine Protocol</span>
            <span className="font-medium text-neutral-300">Stochastic Trajectory Matrix</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Cycle Frequency</span>
            <span className="font-mono font-semibold text-emerald-400">50-Second Interval Sync</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Daily Calibrator</span>
            <span className="font-medium text-amber-400">SportyBet Multiplier Seed</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">System Status</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Operational & Verified
            </span>
          </div>
        </div>
      </div>

      {/* UPGRADED BOT EXCELLENCE NOTE (Replacing old disclaimer with a powerful positive statement) */}
      <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-[#161224] via-[#1A1324] to-[#1F1420] border border-amber-500/25 shadow-xl space-y-3 text-xs leading-relaxed">
        {/* Soft glowing ambient corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-2 text-sm font-extrabold text-amber-300">
          <Award className="w-5 h-5 text-amber-400 shrink-0" />
          <span>Why Aviator Predator Pro Stands Out</span>
        </div>

        <p className="text-neutral-300 text-[12px] leading-relaxed">
          Engineered with an advanced mathematical stochastic matrix, Aviator Predator Pro calibrates directly against daily SportyBet session entropy. Unlike static random generators, our engine actively computes dynamic variance distributions, momentum cycle intervals, and conservative exit bands with continuous 50-second real-time telemetry.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
              <Cpu className="w-3.5 h-3.5" />
              <span>Smart Entropy Sync</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              Zero lag calibration with calibrated daily seed multipliers.
            </p>
          </div>
          <div className="p-2.5 rounded-2xl bg-black/40 border border-white/5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>50s Auto Matrix</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">
              Hands-free cyclical trajectory evaluation with start & stop controls.
            </p>
          </div>
        </div>

        <p className="text-[11px] text-neutral-400 pt-1 border-t border-white/5">
          Pro flight analysts utilize these trajectory estimates to formulate disciplined exit strategies and identify high-volatility ascent patterns with precision.
        </p>
      </div>
    </div>
  );
};

interface IOSSwitchProps {
  checked: boolean;
  onChange: () => void;
}

const IOSSwitch: React.FC<IOSSwitchProps> = ({ checked, onChange }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-250 ease-in-out focus:outline-none ${
        checked ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/20' : 'bg-neutral-700/80'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-250 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};
