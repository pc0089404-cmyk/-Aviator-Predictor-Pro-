export interface DailyVerificationState {
  date: string; // ISO date string YYYY-MM-DD
  firstMultiplier: string; // e.g. "22.6x"
  numericMultiplier: number;
  isVerified: boolean;
  verifiedAt: string;
}

export type AnalysisCategory = 'Safe Zone' | 'Normal Trajectory' | 'High Volatility' | 'Extreme Range';

export interface SignalData {
  id: string;
  multiplier: string; // e.g. "2.40x"
  numericValue: number;
  category: AnalysisCategory;
  targetRange: string;
  confidenceScore: number; // e.g. 72%
  volatilityLevel: 'Low' | 'Medium' | 'High';
  timestamp: string;
  seedMultiplier: string;
}

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type HistoricalCategory = 'Low' | 'Normal' | 'High';

export interface WeeklyDayAnalysis {
  day: DayOfWeek;
  dayShort: string;
  category: HistoricalCategory;
  volatilityLabel: string;
  historicalBand: string;
  stabilityIndex: number; // 0 - 100
  isToday: boolean;
}

export interface AppSettings {
  sound: boolean;
  notifications: boolean;
  signalAlerts: boolean;
  vibration: boolean;
  animationEffects: boolean;
}

export type AppTab = 'dashboard' | 'stats' | 'profile';

export type UserAccessStatus = 'active' | 'expired' | 'pending' | 'not_found';

export interface UserAccessSession {
  userId: string;
  status: UserAccessStatus;
  isAdmin?: boolean;
  isLifetime?: boolean;
  daysRemaining?: number;
  expiryDate?: string | null;
  purchaseDate?: string;
  activationDate?: string;
  verifiedAt: string;
}

export interface PaymentInitResponse {
  success: boolean;
  authorization_url?: string;
  access_code?: string;
  reference?: string;
  publicKey?: string;
  error?: string;
}
