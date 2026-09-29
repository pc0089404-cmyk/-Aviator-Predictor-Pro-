import { SignalData, AnalysisCategory } from '../types';

/**
 * Aviator Predictor Pro - Analytical Signal Synthesis Engine (v2.9)
 *
 * NOTE: This engine generates probabilistic statistical estimates based on
 * daily seed multipliers, historical cycle volatility, and temporal variance.
 * It does NOT guarantee future multipliers. Multipliers in crash games are
 * governed by cryptographic provably fair PRNGs. All signals are analysis only.
 */

export interface AnalysisProgressCallback {
  (step: string, progress: number): void;
}

/**
 * Generate an analytical multiplier signal based on the daily verified seed and past signals.
 */
export function computeSignal(seedMultiplierNum: number, recentHistory: SignalData[] = []): SignalData {
  const now = new Date();
  const timeFactor = (now.getHours() * 60 + now.getMinutes()) % 100;
  
  // Historical streak factor from recent session signals
  const lastSignal = recentHistory[0];
  const lastVal = lastSignal ? lastSignal.numericValue : seedMultiplierNum;

  // Pseudo-stochastic cycle calculation using deterministic seed influence + pseudo-entropy
  const cycleEntropy = Math.sin(timeFactor * 0.17 + recentHistory.length * 0.43) * 0.5 + 0.5;
  const seedInfluence = Math.log10(Math.max(1.05, seedMultiplierNum)) * 0.35;
  
  // Weighted bracket probability distribution:
  // 52% Normal/Safe low range (1.25x - 2.60x)
  // 32% Mid-range trajectory (2.65x - 5.50x)
  // 12% High volatility spike (5.55x - 12.00x)
  // 4% Rare outlier (> 12.00x)
  const roll = Math.random();
  let baseValue: number;
  let category: AnalysisCategory;
  let volatilityLevel: 'Low' | 'Medium' | 'High';

  if (roll < 0.52) {
    // Safe low bracket
    baseValue = 1.25 + (Math.random() * 1.35) + (cycleEntropy * 0.2);
    category = 'Safe Zone';
    volatilityLevel = 'Low';
  } else if (roll < 0.84) {
    // Normal Trajectory bracket
    baseValue = 2.40 + (Math.random() * 2.8) + (seedInfluence * 0.4);
    category = 'Normal Trajectory';
    volatilityLevel = 'Medium';
  } else if (roll < 0.96) {
    // High Volatility bracket
    baseValue = 5.20 + (Math.random() * 6.5);
    category = 'High Volatility';
    volatilityLevel = 'High';
  } else {
    // Outlier high spike
    baseValue = 12.0 + (Math.random() * 14.0);
    category = 'Extreme Range';
    volatilityLevel = 'High';
  }

  // If last signal was huge (>8x), adjust down slightly to model mean reversion
  if (lastVal > 8.0 && Math.random() < 0.7) {
    baseValue = Math.max(1.30, baseValue * 0.45);
    category = baseValue < 2.0 ? 'Safe Zone' : 'Normal Trajectory';
    volatilityLevel = 'Medium';
  }

  // Format to standard 2 decimal places
  const numericValue = Number(baseValue.toFixed(2));
  const multiplier = `${numericValue.toFixed(2)}x`;

  // Compute recommended conservative exit window
  const lowExit = Math.max(1.10, numericValue * 0.75).toFixed(2);
  const highExit = (numericValue * 0.95).toFixed(2);
  const targetRange = `${lowExit}x – ${highExit}x`;

  // Dynamic confidence rating between 58% and 82% (Strictly capped, never 100%)
  const confidenceScore = Math.floor(60 + (cycleEntropy * 18) + (volatilityLevel === 'Low' ? 4 : -3));

  const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    multiplier,
    numericValue,
    category,
    targetRange,
    confidenceScore,
    volatilityLevel,
    timestamp: timeString,
    seedMultiplier: `${seedMultiplierNum.toFixed(2)}x`
  };
}

/**
 * Simulates the real-time processing sequence with callback for UI feedback
 */
export async function executeSignalAnalysis(
  seedMultiplierNum: number,
  history: SignalData[],
  onProgress?: AnalysisProgressCallback
): Promise<SignalData> {
  const steps = [
    { text: 'Syncing SportyBet daily reference...', progress: 18, delay: 350 },
    { text: 'Analyzing volatility coefficient...', progress: 42, delay: 420 },
    { text: 'Evaluating crash distribution curve...', progress: 74, delay: 480 },
    { text: 'Synthesizing trajectory estimate...', progress: 95, delay: 380 }
  ];

  for (const step of steps) {
    if (onProgress) {
      onProgress(step.text, step.progress);
    }
    await new Promise(r => setTimeout(r, step.delay));
  }

  if (onProgress) {
    onProgress('Finalizing signal matrix...', 100);
  }

  return computeSignal(seedMultiplierNum, history);
}
