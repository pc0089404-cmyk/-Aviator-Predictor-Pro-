import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ArrowRight,
  RefreshCw,
  X,
  CreditCard,
  AlertCircle,
  Clock,
  Sparkles,
  Download,
  Info,
  CheckCircle2,
  XCircle,
  Crown
} from 'lucide-react';
import { UserAccessSession, UserAccessStatus } from '../types';
import {
  validateUserId,
  initializePayment,
  verifyPayment,
  getRememberedUserId,
  saveRememberedUserId,
  clearRememberedUserId,
  saveActiveSession
} from '../services/accessService';
import {
  playSuccessSound,
  playFailSound,
  triggerVibrate
} from '../services/soundService';

interface Props {
  onAccessGranted: (session: UserAccessSession) => void;
}

type ScreenMode =
  | 'input'
  | 'verifying'
  | 'verified_success'
  | 'invalid'
  | 'expired'
  | 'info_modal'
  | 'payment_checking'
  | 'payment_not_approved'
  | 'user_id_revealed';

export const UserAccessScreen: React.FC<Props> = ({ onAccessGranted }) => {
  // User ID input (numbers only)
  const [userIdInput, setUserIdInput] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [mode, setMode] = useState<ScreenMode>('input');

  // Live status indicator (red, yellow, green, none)
  // When input is empty, statusLight is 'none' so absolutely NO color shows
  const [statusLight, setStatusLight] = useState<'red' | 'yellow' | 'green' | 'none'>('none');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Verified session awaiting transition
  const [verifiedSession, setVerifiedSession] = useState<UserAccessSession | null>(null);

  // Payment states
  const [isInitializingPayment, setIsInitializingPayment] = useState<boolean>(false);
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Newly generated User ID revealed state
  const [revealedUserId, setRevealedUserId] = useState<string>('');
  const [isIdMasked, setIsIdMasked] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Expired user ID state for renewal
  const [expiredUserId, setExpiredUserId] = useState<string>('');

  // Timer ref for verify animations
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-fill remembered User ID on mount
  useEffect(() => {
    const saved = getRememberedUserId();
    if (saved) {
      setUserIdInput(saved);
      setRememberMe(true);
      // Quick backend ping to set the live status light
      validateUserId(saved).then((res) => {
        if (res.exists) {
          if (res.status === 'active') {
            setStatusLight('green');
            setStatusMessage('Active User ID');
          } else if (res.status === 'pending') {
            setStatusLight('yellow');
            setStatusMessage('Valid ID Awaiting First Access');
          } else {
            setStatusLight('red');
            setStatusMessage('Subscription Expired');
          }
        } else {
          setStatusLight('red');
          setStatusMessage('User ID does not exist');
        }
      });
    }
  }, []);

  // Check URL params for Paystack callback redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const assignedUserId = urlParams.get('userId');
    const ref = urlParams.get('ref');
    const paymentErrorParam = urlParams.get('payment_error');

    if (paymentErrorParam) {
      // Clean query string
      window.history.replaceState({}, document.title, window.location.pathname);
      // 6-second check animation, then show Payment Not Approved!
      setMode('payment_checking');
      setTimeout(() => {
        setPaymentError(decodeURIComponent(paymentErrorParam));
        setMode('payment_not_approved');
      }, 6000);
      return;
    }

    if (paymentSuccess === 'true' && (assignedUserId || ref)) {
      // Clean URL params
      window.history.replaceState({}, document.title, window.location.pathname);

      // Show exactly 6-second checking animation as requested
      setMode('payment_checking');

      const finalize = async () => {
        let finalId = assignedUserId;
        if (ref) {
          const verifyResult = await verifyPayment(ref);
          if (verifyResult.success && verifyResult.userId) {
            finalId = verifyResult.userId;
          } else {
            finalId = null;
          }
        }

        setTimeout(() => {
          if (finalId) {
            setRevealedUserId(finalId);
            setUserIdInput(finalId);
            saveRememberedUserId(finalId);
            setMode('user_id_revealed');
          } else {
            setMode('payment_not_approved');
          }
        }, 6000);
      };

      finalize();
    }
  }, []);

  // Handle User ID Input change (Enforce numbers only)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numbersOnly = raw.replace(/\D/g, '');
    setUserIdInput(numbersOnly);
    setPaymentError(null);

    // CRITICAL USER REQUIREMENT:
    // "when enter a invalid number let it show that red but when they remove the number let no color show"
    if (!numbersOnly || numbersOnly.trim().length === 0) {
      setStatusLight('none');
      setStatusMessage('');
      return;
    }

    // Debounced check for live status indicator
    const timer = setTimeout(async () => {
      if (numbersOnly.length >= 4) {
        const res = await validateUserId(numbersOnly);
        if (res.exists) {
          if (res.status === 'active') {
            setStatusLight('green');
            setStatusMessage('Active User ID');
          } else if (res.status === 'pending') {
            setStatusLight('yellow');
            setStatusMessage('Awaiting First Access');
          } else {
            setStatusLight('red');
            setStatusMessage('Subscription Expired');
          }
        } else {
          // Invalid: Show Red
          setStatusLight('red');
          setStatusMessage('User ID does not exist');
        }
      } else {
        // Less than 4 digits: Show Red invalid as user is typing partial/invalid ID
        setStatusLight('red');
        setStatusMessage('Incomplete ID');
      }
    }, 350);

    return () => clearTimeout(timer);
  };

  // VERIFY ACTION: Scanning radar animation followed by Green Checkmark (Verified) or Red X (Invalid)
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userIdInput.trim()) {
      setStatusLight('red');
      setStatusMessage('Please enter your User ID');
      return;
    }

    setMode('verifying');

    // Save or clear remember me preference
    if (rememberMe) {
      saveRememberedUserId(userIdInput.trim());
    } else {
      clearRememberedUserId();
    }

    // Backend validation check
    const validationPromise = validateUserId(userIdInput.trim());

    // 4.0 seconds scanning radar animation
    timerRef.current = setTimeout(async () => {
      const res = await validationPromise;

      if (!res.exists) {
        // WRONG / INVALID ID: Show Big Red X Animation
        setStatusLight('red');
        playFailSound(true);
        triggerVibrate(true, [80, 50, 80]);
        setMode('invalid');
      } else if (res.status === 'expired') {
        // Expired subscription
        setStatusLight('red');
        playFailSound(true);
        triggerVibrate(true, [80, 50, 80]);
        setExpiredUserId(userIdInput.trim());
        setMode('expired');
      } else if (res.status === 'pending') {
        // Exists but unpaid
        setStatusLight('yellow');
        setMode('input');
        setStatusMessage('User ID awaiting first activation payment.');
      } else if (res.status === 'active' && res.valid) {
        // SUCCESS: GREEN LIGHT & BIG GREEN CHECKMARK ANIMATION
        setStatusLight('green');
        const session: UserAccessSession = {
          userId: userIdInput.trim(),
          status: 'active',
          isAdmin: res.isAdmin,
          isLifetime: res.isLifetime,
          daysRemaining: res.daysRemaining,
          expiryDate: res.expiryDate,
          purchaseDate: res.purchaseDate,
          activationDate: res.activationDate,
          verifiedAt: new Date().toISOString()
        };

        saveActiveSession(session);
        setVerifiedSession(session);
        setMode('verified_success');

        // Play uplifting success chime and haptic feedback
        playSuccessSound(true);
        triggerVibrate(true, [50, 60, 50]);

        // Celebrate for 2.6 seconds with green checkmark animation before entering bot!
        setTimeout(() => {
          onAccessGranted(session);
        }, 2600);
      } else {
        setStatusLight('red');
        playFailSound(true);
        setMode('invalid');
      }
    }, 4000);
  };

  // Open Paystack Checkout
  const handleStartPaystackPayment = async (type: 'purchase' | 'renewal', targetUserId?: string) => {
    setIsInitializingPayment(true);
    setPaymentError(null);

    const initResult = await initializePayment({
      email: customerEmail || undefined,
      type,
      userId: targetUserId
    });

    if (!initResult.success) {
      setIsInitializingPayment(false);
      setPaymentError(
        initResult.error || 'Failed to initialize payment. Please check Paystack configuration.'
      );
      return;
    }

    // Check if Paystack Inline Pop is available for instant in-app checkout
    if (typeof window !== 'undefined' && (window as any).PaystackPop && initResult.publicKey && initResult.reference) {
      try {
        const handler = (window as any).PaystackPop.setup({
          key: initResult.publicKey,
          email: customerEmail || `user_${Date.now()}@aviatorpredator.com`,
          amount: 300000,
          currency: 'NGN',
          ref: initResult.reference,
          // CRITICAL: When user pays, run 6-second animation then reveal unique user ID!
          callback: async (response: any) => {
            setIsInitializingPayment(false);
            const verifyRef = response?.reference || initResult.reference;

            // Show exactly 6-second checking animation
            setMode('payment_checking');
            const verifyPromise = verifyPayment(verifyRef!);

            setTimeout(async () => {
              const verifyResult = await verifyPromise;
              if (verifyResult.success && verifyResult.userId) {
                setRevealedUserId(verifyResult.userId);
                setUserIdInput(verifyResult.userId);
                saveRememberedUserId(verifyResult.userId);
                playSuccessSound(true);
                setMode('user_id_revealed');
              } else {
                setPaymentError(verifyResult.error || 'Payment was not approved');
                playFailSound(true);
                setMode('payment_not_approved');
              }
            }, 6000);
          },
          // CRITICAL: If user closes without paying, run 6-second animation then show Payment Not Approved!
          onClose: () => {
            setIsInitializingPayment(false);
            setMode('payment_checking');
            setTimeout(() => {
              playFailSound(true);
              setMode('payment_not_approved');
            }, 6000);
          }
        });

        handler.openIframe();
        return;
      } catch (err) {
        console.warn('Paystack inline modal fallback to redirect:', err);
      }
    }

    // Fallback: Redirect to Paystack Checkout URL
    if (initResult.authorization_url) {
      window.location.href = initResult.authorization_url;
    } else {
      setIsInitializingPayment(false);
      setPaymentError('Paystack authorization URL missing');
    }
  };

  // Copy User ID
  const handleCopyId = () => {
    if (!revealedUserId) return;
    navigator.clipboard.writeText(revealedUserId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Download / Save User ID credentials
  const handleDownloadId = () => {
    if (!revealedUserId) return;
    const content = `==============================\nAVIATOR PREDICTOR PRO\nOFFICIAL USER ACCESS CREDENTIALS\n==============================\n\nYour Authentic Numeric User ID: ${revealedUserId}\nAccess Duration: 12 Days (1 week + 5 days)\nSubscription Fee: ₦3,000 NGN\nActivated: ${new Date().toLocaleString()}\n\nIMPORTANT SECURITY WARNING:\nDo not share your User ID with anyone. Anyone with access to your User ID may be able to access your bot account.\n==============================`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Aviator_User_ID_${revealedUserId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#06070B] overflow-y-auto selection:bg-red-600/30 selection:text-white">
      {/* Ambient background glows with deep red primary accents */}
      <div className="absolute top-[-10%] left-[-15%] w-[480px] h-[480px] rounded-full bg-red-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[440px] h-[440px] rounded-full bg-rose-900/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      {/* Main Spacious iPhone-Inspired Container */}
      <div className="relative w-full max-w-md mx-auto my-auto py-6">
        {/* Top Header & Branding */}
        <div className="text-center mb-7 space-y-2">
          {/* Logo Plane Badge */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-red-800 shadow-xl shadow-red-600/35 border border-red-400/40 p-2 mb-2">
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
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase italic">
            Aviator Predictor Pro
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-medium">
            Official Access & Subscription Verification
          </p>
        </div>

        {/* Dynamic Card States */}
        <AnimatePresence mode="wait">
          {/* ========================================================== */}
          {/* STATE 1: MAIN USER ID INPUT SCREEN */}
          {/* ========================================================== */}
          {mode === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* Large Glass Card */}
              <div className="relative rounded-[32px] bg-[#11131E]/90 border border-white/10 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl space-y-6">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

                {/* Card Title & Status Indicator */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      Enter Your User ID
                    </h2>
                    <p className="text-xs text-neutral-400">
                      Numbers only (e.g. 9130619144 or 4827193056)
                    </p>
                  </div>

                  {/* USER ID STATUS LIGHT INDICATOR:
                      When numbers are removed, NO COLOR is shown! */}
                  <div className="flex items-center gap-2 shrink-0 min-h-[26px]">
                    {statusLight === 'red' && userIdInput && (
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 text-[11px] font-bold shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span>Invalid / Expired</span>
                      </motion.div>
                    )}
                    {statusLight === 'yellow' && userIdInput && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[11px] font-bold shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>Awaiting Activation</span>
                      </div>
                    )}
                    {statusLight === 'green' && userIdInput && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Active ID</span>
                      </div>
                    )}
                    {/* When statusLight is 'none' or input is empty: Absolutely NO color is rendered! */}
                  </div>
                </div>

                {/* Form Input */}
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={userIdInput}
                      onChange={handleInputChange}
                      placeholder="Enter ID number"
                      className="w-full text-center text-2xl sm:text-3xl font-mono font-black tracking-wider py-4 px-5 rounded-2xl bg-[#090A11] border-2 border-white/10 focus:border-red-500/80 focus:ring-4 focus:ring-red-500/20 text-white placeholder-neutral-700 outline-none transition-all shadow-[inset_0_2px_8px_rgba(0,0,0,0.7)]"
                    />
                  </div>

                  {userIdInput && statusMessage && (
                    <div className="text-center text-xs font-medium text-neutral-400">
                      {statusMessage}
                    </div>
                  )}

                  {paymentError && (
                    <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between pt-1 px-1">
                    <label className="flex items-center gap-2.5 text-xs text-neutral-300 font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-700 text-red-600 focus:ring-red-500/30 bg-[#090A11] cursor-pointer"
                      />
                      <span>Remember me</span>
                    </label>

                    {userIdInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserIdInput('');
                          clearRememberedUserId();
                          setStatusLight('none');
                          setStatusMessage('');
                        }}
                        className="text-[11px] text-neutral-500 hover:text-neutral-300 cursor-pointer underline transition-colors"
                      >
                        Clear saved ID
                      </button>
                    )}
                  </div>

                  {/* Primary Action Button: VERIFY */}
                  <button
                    type="submit"
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] text-white font-black text-base tracking-widest uppercase shadow-xl shadow-red-600/35 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>VERIFY</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </div>

              {/* Buy User ID Area */}
              <div className="text-center space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('info_modal')}
                  className="w-full py-4 px-6 rounded-2xl bg-[#141724] hover:bg-[#1B2032] border border-white/10 active:scale-[0.98] text-white font-extrabold text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2.5 shadow-lg group cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Buy User ID — ₦3,000</span>
                </button>
                <p className="text-[11px] text-neutral-400">
                  Instant 12-Day Access (1 week + 5 days) with real Paystack verification
                </p>
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* STATE 2: 4-SECOND VERIFICATION RADAR SCANNER */}
          {/* ========================================================== */}
          {mode === 'verifying' && (
            <motion.div
              key="verifying"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-[36px] bg-[#11131E]/95 border border-white/10 p-8 shadow-2xl backdrop-blur-2xl text-center space-y-6 py-12"
            >
              {/* Premium Radar Glowing Scanner */}
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping opacity-60" />
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-red-500 border-r-amber-400 animate-spin" />
                <div className="absolute inset-5 rounded-full border border-dashed border-red-400/40 animate-spin-reverse" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-950 via-rose-900 to-[#121420] border border-red-500/60 flex items-center justify-center shadow-[0_0_35px_rgba(225,29,72,0.4)]">
                  <Shield className="w-9 h-9 text-amber-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Verifying User ID
                </h3>
                <p className="text-xs text-neutral-400 max-w-[280px] mx-auto leading-relaxed">
                  Querying backend ledger and checking subscription authorization...
                </p>
                <div className="font-mono text-base text-amber-300 font-extrabold pt-1">
                  ID: {userIdInput}
                </div>
              </div>

              {/* Progress Line */}
              <div className="w-56 mx-auto h-2 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-white/5">
                <div className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 animate-pulse w-full rounded-full" />
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* STATE 2B: ANIMATED GREEN CHECKMARK - ID VERIFIED! */}
          {/* ========================================================== */}
          {mode === 'verified_success' && (
            <motion.div
              key="verified_success"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-[36px] bg-[#11131E]/95 border border-emerald-500/40 p-8 shadow-[0_0_60px_rgba(16,185,129,0.3)] backdrop-blur-2xl text-center space-y-6 py-10"
            >
              {/* Big Animated Green Circle with Checkmark */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: [0, 1.25, 1], rotate: [0, 10, -5, 0] }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-28 h-28 mx-auto rounded-full bg-gradient-to-tr from-emerald-700 via-emerald-500 to-teal-400 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.6)] border-3 border-emerald-300/60"
              >
                <div className="absolute inset-[-8px] rounded-full border-2 border-emerald-400/40 animate-ping opacity-75" />
                <Check className="w-16 h-16 text-white stroke-[3.5]" />
              </motion.div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wider uppercase">
                  {verifiedSession?.isAdmin ? (
                    <>
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin Master Key</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ID Verified</span>
                    </>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {verifiedSession?.isAdmin ? 'Admin ID Verified!' : 'ID Verified!'}
                </h2>
                <p className="text-xs text-neutral-300 max-w-[280px] mx-auto leading-relaxed">
                  {verifiedSession?.isAdmin
                    ? 'Permanent Lifetime Master Access Granted. Welcome, Administrator.'
                    : '12-Day Active Subscription Verified. Welcome to Aviator Predictor Pro!'}
                </p>
                <div className="font-mono text-base font-extrabold text-emerald-300 pt-1">
                  ID: {verifiedSession?.userId}
                </div>
              </div>

              {/* Progress Countdown entering bot */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1 font-semibold">
                  <span>Launching Bot Dashboard...</span>
                  <span className="text-emerald-400 font-bold">Access Granted</span>
                </div>
                <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-white/5">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.6, ease: 'easeInOut' }}
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-green-300 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* STATE 3: ANIMATED RED X - WRONG / INVALID USER ID */}
          {/* ========================================================== */}
          {mode === 'invalid' && (
            <motion.div
              key="invalid"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[36px] bg-[#11131E]/95 border border-red-500/40 p-8 shadow-[0_0_50px_rgba(239,68,68,0.3)] backdrop-blur-2xl text-center space-y-6 py-10"
            >
              {/* Red Animated X Mark with Shake */}
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{
                  scale: [0, 1.25, 1],
                  rotate: [0, -12, 12, -6, 6, 0]
                }}
                transition={{ duration: 0.6 }}
                className="relative w-28 h-28 mx-auto rounded-full bg-gradient-to-tr from-red-700 via-red-600 to-rose-500 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.55)] border-3 border-red-400/60"
              >
                <div className="absolute inset-[-8px] rounded-full border-2 border-red-500/40 animate-ping opacity-75" />
                <X className="w-16 h-16 text-white stroke-[3.5]" />
              </motion.div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-black tracking-wider uppercase">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Wrong / Invalid ID</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-red-400 tracking-tight">
                  Wrong User ID
                </h2>
                <p className="text-xs text-neutral-300 max-w-[280px] mx-auto leading-relaxed">
                  The User ID <span className="font-mono font-bold text-white">"{userIdInput}"</span> is wrong or does not exist in our database. Please buy a valid User ID to access the bot.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode('info_modal')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Buy User ID — ₦3,000</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserIdInput('');
                    setStatusLight('none');
                    setStatusMessage('');
                    setMode('input');
                  }}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#161926] hover:bg-[#1E2335] active:scale-[0.98] text-neutral-300 font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Another ID</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* STATE 4: SUBSCRIPTION EXPIRED SCREEN */}
          {/* ========================================================== */}
          {mode === 'expired' && (
            <motion.div
              key="expired"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[36px] bg-[#11131E]/95 border border-amber-500/30 p-8 shadow-2xl backdrop-blur-2xl text-center space-y-6 py-10"
            >
              <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-amber-700 via-amber-600 to-rose-600 flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.4)] border-2 border-amber-400/50">
                <Clock className="w-12 h-12 text-white stroke-[2.5]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-amber-400 tracking-tight">
                  Subscription Expired
                </h2>
                <p className="text-xs text-neutral-300 max-w-[280px] mx-auto leading-relaxed">
                  The User ID you're trying to use has an expired subscription. Kindly renew your subscription to continue.
                </p>
                <div className="font-mono text-sm text-neutral-400 pt-1">
                  ID: {expiredUserId}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleStartPaystackPayment('renewal', expiredUserId)}
                  disabled={isInitializingPayment}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-[0.98] text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isInitializingPayment ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>Renew — ₦3,000 (12 Days)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('input')}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#161926] hover:bg-[#1E2335] active:scale-[0.98] text-neutral-300 font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                >
                  <span>Go Back</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* STATE 5: BUY USER ID INFO MODAL */}
          {/* ========================================================== */}
          {mode === 'info_modal' && (
            <motion.div
              key="info_modal"
              initial={{ opacity: 0, scale: 0.93 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-[36px] bg-[#11131E]/95 border border-white/15 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    Buy User ID
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('input')}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Exact user-requested text */}
              <div className="p-4 rounded-2xl bg-[#090A11] border border-white/5 space-y-2">
                <p className="text-neutral-200 text-xs sm:text-sm leading-relaxed">
                  Buying a User ID gives you access to Aviator Predictor Pro. Your access lasts for <strong>12 days (1 week + 5 days)</strong>. After your access expires, you must renew your subscription to continue using the bot.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                  <span className="text-neutral-400">Subscription Price:</span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    ₦3,000 NGN
                  </span>
                </div>
              </div>

              {/* Email Input for Paystack Receipt */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Email Address for Receipt (Optional)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full py-3 px-4 rounded-xl bg-[#090A11] border border-white/10 text-white placeholder-neutral-600 text-xs focus:outline-none focus:border-red-500/80"
                />
              </div>

              {paymentError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Two Requested Buttons: Continue with Payment & Go Back */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleStartPaystackPayment('purchase')}
                  disabled={isInitializingPayment}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-[0.98] text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isInitializingPayment ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>Continue with Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('input')}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#141622] hover:bg-[#1A1E2E] active:scale-[0.98] text-neutral-300 font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                >
                  <span>Go Back</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* STATE 6: 6-SECOND PAYMENT VERIFYING / CHECKING ANIMATION */}
          {/* ========================================================== */}
          {mode === 'payment_checking' && (
            <motion.div
              key="payment_checking"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[36px] bg-[#11131E]/95 border border-white/10 p-8 shadow-2xl backdrop-blur-2xl text-center space-y-6 py-12"
            >
              <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping opacity-60" />
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-amber-400 border-r-red-500 animate-spin" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-950 via-rose-900 to-[#121420] border border-red-500/60 flex items-center justify-center shadow-[0_0_35px_rgba(225,29,72,0.4)]">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Verifying Payment Approval
                </h3>
                <p className="text-xs text-neutral-300 max-w-[280px] mx-auto leading-relaxed">
                  Connecting to Paystack ledger and checking transaction authorization...
                </p>
              </div>

              {/* 6-Second Smooth Animated Progress Bar */}
              <div className="w-56 mx-auto h-2 bg-neutral-900 rounded-full overflow-hidden p-0.5 border border-white/5">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 6, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 rounded-full"
                />
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* STATE 7: PAYMENT NOT APPROVED */}
          {/* ========================================================== */}
          {mode === 'payment_not_approved' && (
            <motion.div
              key="payment_not_approved"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[36px] bg-[#11131E]/95 border border-red-500/30 p-8 shadow-2xl backdrop-blur-2xl text-center space-y-6 py-10"
            >
              {/* Animated Warning Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [0, 1.15, 1], rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.5 }}
                className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-red-700 via-rose-600 to-amber-600 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,0.4)] border-2 border-red-400/50"
              >
                <XCircle className="w-12 h-12 text-white stroke-[2.5]" />
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-red-400 tracking-tight">
                  Payment Not Approved
                </h2>
                <p className="text-xs text-neutral-300 max-w-[280px] mx-auto leading-relaxed">
                  The Paystack transaction was cancelled or not approved. No charge was completed on your account.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleStartPaystackPayment('purchase')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Try Payment Again — ₦3,000</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('input')}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#161926] hover:bg-[#1E2335] active:scale-[0.98] text-neutral-300 font-bold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                >
                  <span>Go Back</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================== */}
          {/* STATE 8: USER ID REVEALED SCREEN (PAYMENT APPROVED!) */}
          {/* ========================================================== */}
          {mode === 'user_id_revealed' && (
            <motion.div
              key="user_id_revealed"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-[36px] bg-[#11131E]/95 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6 text-center"
            >
              {/* Payment Approved Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wider uppercase shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Payment Approved</span>
              </div>

              {/* Top tiny warning requested by user */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Warning:</strong> Do not share your User ID with anyone. Anyone with access to your User ID may be able to access your bot account.
                </span>
              </div>

              <div className="space-y-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Your User ID
                </h2>
                <p className="text-xs text-neutral-400">
                  Active for 12 days (1 week + 5 days)
                </p>
              </div>

              {/* Large User ID Box with Eye Icon */}
              <div className="relative p-5 rounded-2xl bg-[#090A11] border-2 border-emerald-500/40 shadow-inner flex items-center justify-between">
                <div className="flex-1 text-center font-mono font-black text-2xl sm:text-3xl tracking-widest text-emerald-400 select-all">
                  {isIdMasked
                    ? '•'.repeat(revealedUserId.length || 10)
                    : revealedUserId}
                </div>

                {/* Eye toggle icon */}
                <button
                  type="button"
                  onClick={() => setIsIdMasked(!isIdMasked)}
                  aria-label={isIdMasked ? 'Reveal User ID' : 'Hide User ID'}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer ml-2"
                >
                  {isIdMasked ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-amber-400" />
                  )}
                </button>
              </div>

              {/* Actions: Copy & Download */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="py-3 px-4 rounded-xl bg-[#141724] hover:bg-[#1C2032] border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-neutral-400" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadId}
                  className="py-3 px-4 rounded-xl bg-[#141724] hover:bg-[#1C2032] border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-neutral-400" />
                  <span>Download</span>
                </button>
              </div>

              {/* Back Button returning to User ID entry page */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setMode('input')}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-[0.98] text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Back to Enter User ID</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
