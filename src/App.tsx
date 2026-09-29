import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DailyVerificationState,
  AppSettings,
  SignalData,
  AppTab,
  UserAccessSession
} from './types';
import {
  loadVerificationState,
  saveVerificationState,
  clearVerificationState,
  loadAppSettings,
  saveAppSettings,
  loadSignalHistory,
  saveSignalHistory,
  getTodayDateKey
} from './services/storageService';
import {
  loadActiveSession,
  saveActiveSession,
  clearActiveSession,
  validateUserId,
  initializePayment
} from './services/accessService';
import { executeSignalAnalysis } from './services/signalEngine';
import {
  playSignalSound,
  triggerVibrate,
  triggerSystemNotification
} from './services/soundService';
import { Header } from './components/Header';
import { UserAccessScreen } from './components/UserAccessScreen';
import { DailyVerificationScreen } from './components/DailyVerificationScreen';
import { CircularSignalDisplay } from './components/CircularSignalDisplay';
import { RecentSignalsFeed } from './components/RecentSignalsFeed';
import { StatsTab } from './components/StatsTab';
import { ProfileTab } from './components/ProfileTab';
import { BottomNavigation } from './components/BottomNavigation';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';

export default function App() {
  // User Access & Subscription Session (Gatekeeper for the whole app)
  const [accessSession, setAccessSession] = useState<UserAccessSession | null>(() => loadActiveSession());

  // App settings state
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());

  // Daily verification state:
  // Reset for immediate testing as requested by user; once verified, it persists for today and only asks again tomorrow
  const [verification, setVerification] = useState<DailyVerificationState | null>(() => {
    // If user has not verified in this session, show test UI
    return null;
  });
  const [showVerificationModal, setShowVerificationModal] = useState<boolean>(true);

  // Active navigation tab
  const [currentTab, setCurrentTab] = useState<AppTab>('dashboard');

  // Signal state
  const [currentSignal, setCurrentSignal] = useState<SignalData | null>(null);
  const [signalStatus, setSignalStatus] = useState<'idle' | 'analyzing' | 'generated'>('idle');
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [signalHistory, setSignalHistory] = useState<SignalData[]>(() => loadSignalHistory());

  // Auto-run 50-second interval cycle state
  const [isAutoRunning, setIsAutoRunning] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(50);

  // Keep ref for auto-running to avoid stale closures in intervals
  const isAutoRunningRef = useRef(isAutoRunning);
  isAutoRunningRef.current = isAutoRunning;

  const signalHistoryRef = useRef(signalHistory);
  signalHistoryRef.current = signalHistory;

  const verificationRef = useRef(verification);
  verificationRef.current = verification;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Real-time access protection check
  useEffect(() => {
    if (!accessSession || accessSession.isLifetime || accessSession.isAdmin || accessSession.userId === '9130619144') return;

    const checkAccess = async () => {
      const res = await validateUserId(accessSession.userId);
      if (!res.valid || res.status === 'expired') {
        clearActiveSession();
        setAccessSession(null);
      } else if (res.daysRemaining !== undefined && res.daysRemaining !== accessSession.daysRemaining) {
        const updated = {
          ...accessSession,
          daysRemaining: res.daysRemaining,
          expiryDate: res.expiryDate || accessSession.expiryDate
        };
        saveActiveSession(updated);
        setAccessSession(updated);
      }
    };

    const interval = setInterval(checkAccess, 60000);
    window.addEventListener('focus', checkAccess);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkAccess);
    };
  }, [accessSession]);

  // Check date changes on visibility / focus - only prompts when next day begins!
  useEffect(() => {
    const checkDailyStatus = () => {
      const today = getTodayDateKey();
      const current = loadVerificationState();
      if (!current || current.date !== today || !current.isVerified) {
        setShowVerificationModal(true);
      }
    };

    window.addEventListener('focus', checkDailyStatus);
    return () => window.removeEventListener('focus', checkDailyStatus);
  }, []);

  // Update Settings handler
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveAppSettings(newSettings);
  };

  // Toggle sound quick button
  const handleToggleSound = () => {
    const updated = { ...settings, sound: !settings.sound };
    handleUpdateSettings(updated);
    triggerVibrate(settings.vibration, 20);
  };

  // Handle successful daily verification
  const handleVerified = (verifiedState: DailyVerificationState) => {
    setVerification(verifiedState);
    setShowVerificationModal(false);
  };

  // Handle subscription renewal via Paystack
  const handleRenewSubscription = async () => {
    if (!accessSession?.userId) return;
    try {
      const initResult = await initializePayment({
        type: 'renewal',
        userId: accessSession.userId
      });
      if (initResult.authorization_url) {
        window.location.href = initResult.authorization_url;
      }
    } catch (err) {
      console.error('Renewal redirect error:', err);
    }
  };

  // Switch User ID handler
  const handleSwitchUser = () => {
    clearActiveSession();
    setAccessSession(null);
  };

  // Allow re-verifying from profile if requested
  const handleTriggerReverify = () => {
    setShowVerificationModal(true);
  };

  // Core function to calculate and generate a new signal
  const computeAndSetSignal = useCallback(async () => {
    setSignalStatus('analyzing');
    setAnalysisStep('Evaluating trajectory cycle...');
    setAnalysisProgress(15);
    triggerVibrate(settingsRef.current.vibration, 30);

    const seedNum = verificationRef.current?.numericMultiplier || 2.5;

    try {
      const generated = await executeSignalAnalysis(
        seedNum,
        signalHistoryRef.current,
        (step, progress) => {
          setAnalysisStep(step);
          setAnalysisProgress(progress);
        }
      );

      setCurrentSignal(generated);
      setSignalStatus('generated');
      setSecondsRemaining(50); // reset 50s display timer

      // Update history
      const updatedHistory = [generated, ...signalHistoryRef.current].slice(0, 30);
      setSignalHistory(updatedHistory);
      saveSignalHistory(updatedHistory);

      // Sound chime of new signals (only if sound is enabled)
      playSignalSound(settingsRef.current.sound);

      // Real-life phone browser notification (drops to the real user's phone notification center)
      triggerSystemNotification(
        'Aviator Predictor Pro',
        `🚀 Signal Dropped: ${generated.multiplier} (${generated.category}) • Range: ${generated.targetRange}`,
        settingsRef.current.notifications
      );

      // Real-life haptic confirmation vibration
      triggerVibrate(settingsRef.current.vibration, [50, 40, 50]);
    } catch (err) {
      console.error('Signal analysis execution error:', err);
      setSignalStatus('idle');
      setIsAutoRunning(false);
    }
  }, []);

  // START SIGNALS: Begins analysis and arms the 50-second continuous auto-cycle
  const handleStartSignals = () => {
    if (signalStatus === 'analyzing') return;
    setIsAutoRunning(true);
    computeAndSetSignal();
  };

  // STOP SIGNALS: Stops the 50-second cycle
  const handleStopSignals = () => {
    setIsAutoRunning(false);
    triggerVibrate(settings.vibration, 25);
  };

  // 50-Second Countdown Effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isAutoRunning && signalStatus === 'generated') {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // 50 seconds completed! Generate the next signal
            if (isAutoRunningRef.current) {
              computeAndSetSignal();
            }
            return 50;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoRunning, signalStatus, computeAndSetSignal]);

  // Refresh / Reset signal display back to idle "0.00x"
  const handleRefreshSignal = () => {
    if (signalStatus === 'analyzing') return;
    setIsAutoRunning(false);
    setCurrentSignal(null);
    setSignalStatus('idle');
    setAnalysisStep('');
    setAnalysisProgress(0);
    setSecondsRemaining(50);
    triggerVibrate(settings.vibration, 25);
  };

  // If user does NOT have active access, show the beautiful premium access screen
  if (!accessSession || accessSession.status !== 'active') {
    return (
      <UserAccessScreen
        onAccessGranted={(session) => {
          setAccessSession(session);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#07080D] text-[#F3F4F6] flex flex-col antialiased selection:bg-red-600/30 selection:text-white">
      {/* Daily Verification Screen (Shown when today is not yet verified) */}
      <AnimatePresence>
        {showVerificationModal && (
          <DailyVerificationScreen
            onVerified={handleVerified}
            settings={settings}
          />
        )}
      </AnimatePresence>

      {/* Persistent App Header with Real Life Aviator Logo */}
      <Header
        verification={verification}
        settings={settings}
        onToggleSound={handleToggleSound}
        onOpenVerification={handleTriggerReverify}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col items-center">
        {/* Tab: Dashboard */}
        {currentTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full flex flex-col items-center pb-28 pt-2"
          >
            {/* Clean Seed Indicator Banner without reset & test buttons */}
            {verification && verification.isVerified && (
              <div className="w-full mb-4 px-4 py-2.5 rounded-2xl bg-[#11131E] border border-white/5 flex items-center justify-between text-xs shadow-md">
                <div className="flex items-center gap-2 text-neutral-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-medium">SportyBet Base Multiplier:</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono font-extrabold text-amber-300">
                  <Zap className="w-3.5 h-3.5 fill-amber-400 stroke-none" />
                  <span>{verification.firstMultiplier}</span>
                </div>
              </div>
            )}

            {/* Circular Signal Display */}
            <CircularSignalDisplay
              currentSignal={currentSignal}
              status={signalStatus}
              analysisStep={analysisStep}
              progressPercent={analysisProgress}
              isAutoRunning={isAutoRunning}
              secondsRemaining={secondsRemaining}
              onStartSignals={handleStartSignals}
              onStopSignals={handleStopSignals}
              onRefresh={handleRefreshSignal}
              settings={settings}
            />

            {/* Recent Signals History */}
            <RecentSignalsFeed history={signalHistory} />
          </motion.div>
        )}

        {/* Tab: Stats */}
        {currentTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            <StatsTab
              session={accessSession}
              onRenew={handleRenewSubscription}
            />
          </motion.div>
        )}

        {/* Tab: Profile */}
        {currentTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            <ProfileTab
              settings={settings}
              verification={verification}
              session={accessSession}
              onUpdateSettings={handleUpdateSettings}
              onReverify={handleTriggerReverify}
              onSwitchUser={handleSwitchUser}
            />
          </motion.div>
        )}
      </main>

      {/* Floating iPhone Bottom Navigation */}
      <BottomNavigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        settings={settings}
      />
    </div>
  );
}
