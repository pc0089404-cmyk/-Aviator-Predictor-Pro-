import { DailyVerificationState, AppSettings, SignalData, WeeklyDayAnalysis, DayOfWeek, HistoricalCategory } from '../types';

const STORAGE_KEYS = {
  VERIFICATION: 'aviator_pro_daily_verification',
  SETTINGS: 'aviator_pro_app_settings',
  SIGNALS: 'aviator_pro_signal_history',
  WEEKLY_CONFIG: 'aviator_pro_weekly_analysis_config'
};

export function getTodayDateKey(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function validateMultiplierFormat(input: string): {
  isValid: boolean;
  error?: string;
  numeric?: number;
  formatted?: string;
} {
  let trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false, error: "Please enter today's multiplier." };
  }

  // If user included 'x' or 'X' at end, normalize
  const hasX = /[xX]$/.test(trimmed);
  const coreNumberStr = hasX ? trimmed.slice(0, -1).trim() : trimmed;

  // Strict check: must contain a decimal point with digits on both sides (e.g. 22.6, 2.50, 22.00)
  if (!/^\d+\.\d+$/.test(coreNumberStr)) {
    if (/^\d+$/.test(coreNumberStr)) {
      return {
        isValid: false,
        error: "Missing decimal point. Format must be a decimal (e.g. 22.6x or 2.50x, not 22x or 2x)."
      };
    }
    return {
      isValid: false,
      error: "Invalid number format. Enter digits with a decimal point (e.g. 22.6x or 2.50x)."
    };
  }

  const numericPart = parseFloat(coreNumberStr);
  if (isNaN(numericPart)) {
    return { isValid: false, error: "Invalid numeric multiplier value." };
  }

  if (numericPart < 1.0) {
    return { isValid: false, error: "Aviator multipliers cannot be lower than 1.00x." };
  }

  if (numericPart > 1000.0) {
    return { isValid: false, error: "Multiplier exceeds standard recorded flight threshold." };
  }

  return {
    isValid: true,
    numeric: numericPart,
    formatted: `${numericPart.toFixed(2)}x`
  };
}

export function loadVerificationState(): DailyVerificationState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VERIFICATION);
    if (!raw) return null;
    const data: DailyVerificationState = JSON.parse(raw);
    const today = getTodayDateKey();
    
    // Check if the verification matches today's calendar day
    if (data.date === today && data.isVerified) {
      return data;
    }
    return null;
  } catch (err) {
    console.error('Failed to load verification state:', err);
    return null;
  }
}

export function saveVerificationState(state: DailyVerificationState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.VERIFICATION, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save verification state:', err);
  }
}

export function clearVerificationState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.VERIFICATION);
  } catch (err) {
    console.error('Failed to clear verification state:', err);
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  sound: true,
  notifications: true,
  signalAlerts: true,
  vibration: true,
  animationEffects: true,
};

export function loadAppSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save app settings:', err);
  }
}

export function loadSignalHistory(): SignalData[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SIGNALS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSignalHistory(history: SignalData[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep last 30 signals
    localStorage.setItem(STORAGE_KEYS.SIGNALS, JSON.stringify(history.slice(0, 30)));
  } catch (err) {
    console.error('Failed to save signal history:', err);
  }
}

/**
 * Weekly historical analysis data specified by the prompt:
 * Monday — Low
 * Tuesday — High
 * Wednesday — Normal
 * Thursday — High
 * Friday — High
 * Saturday — Low
 * Sunday — Normal
 */
export function getWeeklyAnalysisData(): WeeklyDayAnalysis[] {
  const daysOrder: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const categories: Record<DayOfWeek, { category: HistoricalCategory; volatility: string; band: string; score: number }> = {
    Monday: { category: 'Low', volatility: 'Low Volatility Cycle', band: '1.20x – 2.10x', score: 38 },
    Tuesday: { category: 'High', volatility: 'Surge Dispersion Cycle', band: '2.50x – 8.80x', score: 84 },
    Wednesday: { category: 'Normal', volatility: 'Standard Mean Distribution', band: '1.80x – 4.20x', score: 58 },
    Thursday: { category: 'High', volatility: 'Elevated Ascent Trend', band: '2.40x – 7.90x', score: 81 },
    Friday: { category: 'High', volatility: 'Peak Volume Volatility', band: '2.80x – 9.50x', score: 89 },
    Saturday: { category: 'Low', volatility: 'Stabilized Consolidation', band: '1.30x – 2.25x', score: 32 },
    Sunday: { category: 'Normal', volatility: 'Equilibrium Variance', band: '1.75x – 3.80x', score: 54 }
  };

  const currentDayIndex = (new Date().getDay() + 6) % 7; // Convert JS 0 (Sun) - 6 (Sat) to Mon(0) - Sun(6)

  return daysOrder.map((day, idx) => {
    const meta = categories[day];
    return {
      day,
      dayShort: day.substring(0, 3),
      category: meta.category,
      volatilityLabel: meta.volatility,
      historicalBand: meta.band,
      stabilityIndex: meta.score,
      isToday: idx === currentDayIndex
    };
  });
}
