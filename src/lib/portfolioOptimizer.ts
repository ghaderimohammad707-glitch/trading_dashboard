/**
 * ماتریس همبستگی + بهینه‌سازی پرتفوی — نسخه واقعی
 * از داده‌های تاریخی OHLC TSETMC
 */

import type { Instrument } from "./clientFetch";
import { fetchHistoricalOHLC, type OHLCBar } from "./historicalData";

// Cache for correlation data
let _correlationCache: {
  symbols: string[];
  matrix: number[][];
  ts: number;
} | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 min

/**
 * محاسبه ماتریس همبستگی واقعی از بازده‌های تاریخی
 */
export async function calculateCorrelationMatrix(
  instruments: Instrument[],
  topN = 15,
): Promise<{
  symbols: string[];
  matrix: number[][];
}> {
  // Check cache
  if (
    _correlationCache &&
    Date.now() - _correlationCache.ts < CACHE_TTL &&
    _correlationCache.symbols.length >= Math.min(topN, instruments.length)
  ) {
    return _correlationCache;
  }

  // Select top instruments by volume
  const sorted = [...instruments]
    .filter((i) => (i.segment === "tse" || i.segment === "ifb") && i.volume > 100000)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, topN);

  if (sorted.length < 3) {
    return { symbols: [], matrix: [] };
  }

  const symbols = sorted.map((i) => i.symbol);

  // Fetch historical data for each symbol (concurrent)
  const historicalData = new Map<string, number[]>();

  const fetchPromises = sorted.map(async (inst) => {
    if (!inst.rawInsCode) return;
    try {
      const bars = await fetchHistoricalOHLC(inst.rawInsCode, 60);
      if (bars.length >= 20) {
        // Compute daily log returns
        const returns: number[] = [];
        for (let i = 1; i < bars.length; i++) {
          if (bars[i - 1].close > 0 && bars[i].close > 0) {
            returns.push(Math.log(bars[i].close / bars[i - 1].close));
          }
        }
        historicalData.set(inst.symbol, returns);
      }
    } catch {
      // silent
    }
  });

  await Promise.allSettled(fetchPromises);

  // Compute pairwise Pearson correlation
  const matrix: number[][] = [];
  for (let i = 0; i < symbols.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < symbols.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else if (j < i) {
        matrix[i][j] = matrix[j][i];
      } else {
        matrix[i][j] = pearsonCorrelation(
          historicalData.get(symbols[i]) || [],
          historicalData.get(symbols[j]) || [],
        );
      }
    }
  }

  _correlationCache = { symbols, matrix, ts: Date.now() };
  return { symbols, matrix };
}

/**
 * محاسبه همبستگی Pearson بین دو سری بازدهی
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 5) return 0;

  // Use only overlapping values
  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const meanX = xSlice.reduce((a, b) => a + b, 0) / n;
  const meanY = ySlice.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - meanX;
    const dy = ySlice[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denominator = Math.sqrt(denomX * denomY);
  if (denominator === 0) return 0;

  return Math.max(-1, Math.min(1, numerator / denominator));
}

/**
 * محاسبه بازده سالانه و ریسک (انحراف معیار)
 */
function computeRiskReturn(returns: number[]): {
  annualizedReturn: number;
  annualizedRisk: number;
  sharpe: number;
} {
  if (returns.length < 5) {
    return { annualizedReturn: 0, annualizedRisk: 0, sharpe: 0 };
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);

  const dailyStd = Math.sqrt(variance);
  const annualizedReturn = mean * 252;
  const annualizedRisk = dailyStd * Math.sqrt(252);
  const riskFreeRate = 0.25; // Iranian rate approx
  const sharpe =
    annualizedRisk > 0
      ? (annualizedReturn - riskFreeRate) / annualizedRisk
      : 0;

  return { annualizedReturn, annualizedRisk, sharpe };
}

/**
 * بهینه‌سازی پرتفوی — بهترین ترکیب وزن‌ها
 * با استفاده از داده واقعی تاریخی
 */
export async function optimizePortfolio(
  instruments: Instrument[],
  riskTolerance: "low" | "medium" | "high" = "medium",
  topN = 10,
): Promise<{
  weights: number[];
  symbols: string[];
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  diversificationScore: number;
}> {
  // Get top instruments
  const sorted = [...instruments]
    .filter((i) => (i.segment === "tse" || i.segment === "ifb") && i.volume > 100000)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, topN);

  if (sorted.length < 3) {
    const equal = 1 / sorted.length;
    return {
      weights: sorted.map(() => equal),
      symbols: sorted.map((i) => i.symbol),
      expectedReturn: 0,
      expectedRisk: 0,
      sharpeRatio: 0,
      diversificationScore: 0,
    };
  }

  const symbols = sorted.map((i) => i.symbol);

  // Fetch historical data and compute risk/return per asset
  const riskReturns: { annualizedReturn: number; annualizedRisk: number }[] = [];

  for (const inst of sorted) {
    if (!inst.rawInsCode) {
      riskReturns.push({ annualizedReturn: 0, annualizedRisk: 0.5 });
      continue;
    }
    try {
      const bars = await fetchHistoricalOHLC(inst.rawInsCode, 60);
      if (bars.length >= 20) {
        const returns: number[] = [];
        for (let i = 1; i < bars.length; i++) {
          if (bars[i - 1].close > 0 && bars[i].close > 0) {
            returns.push(Math.log(bars[i].close / bars[i - 1].close));
          }
        }
        riskReturns.push(computeRiskReturn(returns));
      } else {
        riskReturns.push({ annualizedReturn: 0, annualizedRisk: 0.5 });
      }
    } catch {
      riskReturns.push({ annualizedReturn: 0, annualizedRisk: 0.5 });
    }
  }

  // Get correlation matrix
  const { matrix: corrMatrix } = await calculateCorrelationMatrix(instruments, topN);

  // Simple optimization based on risk tolerance
  const riskTargets = { low: 0.15, medium: 0.25, high: 0.40 };
  const targetRisk = riskTargets[riskTolerance];

  // Strategy: inverse-volatility weighted with diversification bonus
  const invVol = sorted.map((_, i) => {
    const risk = riskReturns[i]?.annualizedRisk || 0.5;
    return 1 / Math.max(risk, 0.1);
  });
  const totalInvVol = invVol.reduce((a, b) => a + b, 0);
  let weights = invVol.map((v) => v / totalInvVol);

  // Diversification bonus: reduce weight of highly correlated assets
  for (let i = 0; i < weights.length; i++) {
    let correlationPenalty = 0;
    for (let j = 0; j < weights.length; j++) {
      if (i !== j && corrMatrix[i]?.[j]) {
        correlationPenalty += Math.abs(corrMatrix[i][j]) * weights[j];
      }
    }
    weights[i] *= 1 - correlationPenalty * 0.3;
  }

  // Normalize weights to sum to 1
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight > 0) {
    weights = weights.map((w) => w / totalWeight);
  }

  // Compute portfolio metrics
  let expectedReturn = 0;
  for (let i = 0; i < weights.length; i++) {
    expectedReturn += weights[i] * (riskReturns[i]?.annualizedReturn || 0);
  }

  // Portfolio variance: w' * Cov * w
  let portfolioVariance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      const covIJ =
        (riskReturns[i]?.annualizedRisk || 0.5) *
        (riskReturns[j]?.annualizedRisk || 0.5) *
        (corrMatrix[i]?.[j] || (i === j ? 1 : 0));
      portfolioVariance += weights[i] * weights[j] * covIJ;
    }
  }
  const expectedRisk = Math.sqrt(Math.max(0, portfolioVariance));

  const riskFreeRate = 0.25;
  const sharpeRatio =
    expectedRisk > 0 ? (expectedReturn - riskFreeRate) / expectedRisk : 0;

  // Diversification score: 1 - average correlation
  let avgCorr = 0;
  let pairs = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = i + 1; j < weights.length; j++) {
      if (corrMatrix[i]?.[j] !== undefined) {
        avgCorr += Math.abs(corrMatrix[i][j]);
        pairs++;
      }
    }
  }
  avgCorr = pairs > 0 ? avgCorr / pairs : 0;
  const diversificationScore = Math.round((1 - avgCorr) * 100);

  return {
    weights: weights.map((w) => Math.round(w * 1000) / 1000),
    symbols,
    expectedReturn: Math.round(expectedReturn * 100) / 100,
    expectedRisk: Math.round(expectedRisk * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    diversificationScore,
  };
}

/**
 * پیشنهاد بازچینی پرتفوی
 */
export async function suggestRebalance(
  currentPositions: { symbol: string; weight: number }[],
  instruments: Instrument[],
): Promise<{
  current: { symbol: string; weight: number; suggested: number; action: string }[];
  reason: string;
}> {
  const optimized = await optimizePortfolio(instruments, "medium");
  const symbolToWeight = new Map<string, number>(
    optimized.symbols.map((s, i) => [s, optimized.weights[i] || 0]),
  );

  const result = currentPositions.map((pos) => {
    const suggested = symbolToWeight.get(pos.symbol) || 0;
    const diff = suggested - pos.weight;
    const action =
      Math.abs(diff) < 0.02
        ? "نگهداری"
        : diff > 0
        ? `افزایش ${(diff * 100).toFixed(1)}٪`
        : `کاهش ${(Math.abs(diff) * 100).toFixed(1)}٪`;
    return { ...pos, suggested, action };
  });

  const totalDiff = result.reduce((sum, r) => sum + Math.abs(r.suggested - r.weight), 0);
  const reason =
    totalDiff < 0.1
      ? "پرتفوی شما تقریباً بهینه است."
      : `بازچینی پیشنهادی بر اساس Modern Portfolio Theory با ریسک متوسط.`;

  return { current: result, reason };
}
