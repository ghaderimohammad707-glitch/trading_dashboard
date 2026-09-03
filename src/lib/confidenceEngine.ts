/**
 * Advanced Confidence Scoring Engine for Nabz Bazar
 * Calculates confidence scores for trading signals based on multiple factors
 * 
 * Features:
 * - Multi-factor analysis (technical, fundamental, volume, sentiment)
 * - Historical accuracy tracking
 * - Market condition adjustments
 * - Time-based decay
 * - Volume confirmation
 * - Correlation analysis
 */

import type { Instrument } from "./clientFetch";
import type { AnalysisResult } from "./analysisEngines";

export interface ConfidenceFactors {
  technicalScore: number;      // 0-100
  fundamentalScore: number;    // 0-100
  volumeScore: number;         // 0-100
  sentimentScore: number;      // 0-100
  marketConditionScore: number; // 0-100
  historicalAccuracy: number;  // 0-100
  timeDecayFactor: number;     // 0-1 (1 = fresh, 0 = stale)
}

export interface ConfidenceResult {
  overallConfidence: number;   // 0-100
  weightedScore: number;       // Weighted average
  reliability: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  factors: ConfidenceFactors;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  timestamp: number;
  validUntil: number;
}

export interface HistoricalPerformance {
  symbol: string;
  totalSignals: number;
  accurateSignals: number;
  accuracyRate: number;
  avgReturn: number;
  winRate: number;
  lastUpdated: number;
}

/**
 * Default weights for different market conditions
 */
const DEFAULT_WEIGHTS = {
  bull: {
    technical: 0.30,
    fundamental: 0.20,
    volume: 0.20,
    sentiment: 0.15,
    marketCondition: 0.15,
  },
  bear: {
    technical: 0.35,
    fundamental: 0.15,
    volume: 0.25,
    sentiment: 0.10,
    marketCondition: 0.15,
  },
  sideways: {
    technical: 0.40,
    fundamental: 0.10,
    volume: 0.20,
    sentiment: 0.15,
    marketCondition: 0.15,
  },
};

/**
 * Calculate individual factor scores
 */
function calculateTechnicalScore(technical: AnalysisResult): number {
  if (!technical || technical.score === 0) return 50;
  
  // Normalize score to 0-100 range
  const normalized = ((technical.score + 100) / 200) * 100;
  
  // Bonus for strong signals
  let bonus = 0;
  if (Math.abs(technical.score) > 80) bonus = 10;
  else if (Math.abs(technical.score) > 60) bonus = 5;
  
  // Penalty for conflicting indicators
  const conflictPenalty = technical.reasons.some(r => 
    r.includes('⚠️') || r.includes('محتاط')
  ) ? -10 : 0;
  
  return Math.max(0, Math.min(100, normalized + bonus + conflictPenalty));
}

function calculateFundamentalScore(fundamental: AnalysisResult): number {
  if (!fundamental || fundamental.score === 0) return 50;
  
  const normalized = ((fundamental.score + 100) / 200) * 100;
  
  // P/E ratio consideration
  const peRatio = fundamental.details?.pe as number | undefined;
  let peAdjustment = 0;
  if (peRatio !== undefined) {
    if (peRatio > 0 && peRatio < 5) peAdjustment = 10;  // Very attractive
    else if (peRatio >= 5 && peRatio < 10) peAdjustment = 5;  // Good
    else if (peRatio > 20) peAdjustment = -10;  // Expensive
  }
  
  // EPS growth
  const epsGrowth = fundamental.details?.epsGrowth as number | undefined;
  const epsAdjustment = epsGrowth !== undefined 
    ? Math.max(-10, Math.min(10, epsGrowth))
    : 0;
  
  return Math.max(0, Math.min(100, normalized + peAdjustment + epsAdjustment));
}

function calculateVolumeScore(volume: AnalysisResult): number {
  if (!volume || volume.score === 0) return 50;
  
  const normalized = ((volume.score + 100) / 200) * 100;
  
  // Volume surge bonus
  const volumeSurge = volume.details?.volumeSurge as number | undefined;
  const surgeBonus = volumeSurge !== undefined && volumeSurge > 2 ? 15 : 0;
  
  // Volume trend
  const volumeTrend = volume.details?.volumeTrend as string | undefined;
  const trendBonus = volumeTrend === 'increasing' ? 10 : volumeTrend === 'decreasing' ? -10 : 0;
  
  return Math.max(0, Math.min(100, normalized + surgeBonus + trendBonus));
}

function calculateSentimentScore(sentiment: AnalysisResult): number {
  if (!sentiment || sentiment.score === 0) return 50;
  
  const normalized = ((sentiment.score + 100) / 200) * 100;
  
  // News sentiment adjustment
  const newsScore = sentiment.details?.newsScore as number | undefined;
  const newsAdjustment = newsScore !== undefined ? newsScore * 0.1 : 0;
  
  return Math.max(0, Math.min(100, normalized + newsAdjustment));
}

function calculateMarketConditionScore(instruments: Instrument[]): number {
  if (!instruments || instruments.length === 0) return 50;
  
  // Calculate market breadth
  const advancing = instruments.filter(i => i.changePercent > 0).length;
  const declining = instruments.filter(i => i.changePercent < 0).length;
  const total = advancing + declining;
  
  if (total === 0) return 50;
  
  const advanceDeclineRatio = advancing / total;
  
  // Market momentum
  const avgChange = instruments.reduce((sum, i) => sum + i.changePercent, 0) / total;
  
  let score = 50 + (advanceDeclineRatio - 0.5) * 100;
  
  // Momentum adjustment
  if (avgChange > 2) score += 10;
  else if (avgChange < -2) score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

function determineMarketCondition(marketScore: number): 'bull' | 'bear' | 'sideways' {
  if (marketScore > 60) return 'bull';
  if (marketScore < 40) return 'bear';
  return 'sideways';
}

/**
 * Calculate time decay factor
 * Signals lose confidence over time
 */
function calculateTimeDecay(signalTimestamp: number): number {
  const now = Date.now();
  const ageInHours = (now - signalTimestamp) / (1000 * 60 * 60);
  
  // Decay curve: 100% at 0h, 50% at 4h, 25% at 8h, 10% at 24h
  if (ageInHours <= 0) return 1.0;
  if (ageInHours >= 24) return 0.1;
  
  // Exponential decay
  return Math.exp(-0.173 * ageInHours);
}

/**
 * Main confidence calculation engine
 */
export function calculateConfidence(
  technical: AnalysisResult,
  fundamental: AnalysisResult,
  volume: AnalysisResult,
  sentiment: AnalysisResult,
  instruments: Instrument[],
  historicalPerformance?: HistoricalPerformance,
  signalTimestamp: number = Date.now()
): ConfidenceResult {
  // Calculate individual scores
  const techScore = calculateTechnicalScore(technical);
  const fundScore = calculateFundamentalScore(fundamental);
  const volScore = calculateVolumeScore(volume);
  const sentScore = calculateSentimentScore(sentiment);
  const marketScore = calculateMarketConditionScore(instruments);
  
  // Determine market condition and get appropriate weights
  const marketCondition = determineMarketCondition(marketScore);
  const weights = DEFAULT_WEIGHTS[marketCondition];
  
  // Calculate time decay
  const timeDecay = calculateTimeDecay(signalTimestamp);
  
  // Historical accuracy factor
  const histAccuracy = historicalPerformance?.accuracyRate ?? 50;
  
  // Calculate weighted score
  const weightedScore = 
    techScore * weights.technical +
    fundScore * weights.fundamental +
    volScore * weights.volume +
    sentScore * weights.sentiment +
    marketScore * weights.marketCondition;
  
  // Apply historical accuracy modifier
  const histModifier = histAccuracy > 50 ? 1 + (histAccuracy - 50) / 200 : 1 - (50 - histAccuracy) / 200;
  
  // Apply time decay
  const finalScore = weightedScore * histModifier * timeDecay;
  
  // Clamp to 0-100
  const overallConfidence = Math.max(0, Math.min(100, finalScore));
  
  // Determine reliability level
  let reliability: ConfidenceResult['reliability'];
  if (overallConfidence >= 80) reliability = 'very_high';
  else if (overallConfidence >= 65) reliability = 'high';
  else if (overallConfidence >= 50) reliability = 'medium';
  else if (overallConfidence >= 35) reliability = 'low';
  else reliability = 'very_low';
  
  // Identify strengths and weaknesses
  const factors: ConfidenceFactors = {
    technicalScore: Math.round(techScore),
    fundamentalScore: Math.round(fundScore),
    volumeScore: Math.round(volScore),
    sentimentScore: Math.round(sentScore),
    marketConditionScore: Math.round(marketScore),
    historicalAccuracy: Math.round(histAccuracy),
    timeDecayFactor: Math.round(timeDecay * 100) / 100,
  };
  
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  
  // Analyze factors
  if (techScore >= 70) strengths.push('تحلیل تکنیکال قوی');
  else if (techScore < 40) weaknesses.push('تحلیل تکنیکال ضعیف');
  
  if (fundScore >= 70) strengths.push('بنیادین جذاب');
  else if (fundScore < 40) weaknesses.push('بنیادین ضعیف');
  
  if (volScore >= 70) strengths.push('حجم معاملات تأییدکننده');
  else if (volScore < 40) weaknesses.push('حجم معاملات پایین');
  
  if (sentScore >= 70) strengths.push('احساسات مثبت بازار');
  else if (sentScore < 40) weaknesses.push('احساسات منفی بازار');
  
  if (marketScore >= 70) {
    strengths.push('شرایط کلی بازار مطلوب');
    recommendations.push('با روند بازار معامله کنید');
  } else if (marketScore < 40) {
    weaknesses.push('شرایط کلی بازار نامناسب');
    recommendations.push('احتیاط کنید یا در حاشیه بمانید');
  }
  
  if (timeDecay < 0.5) {
    weaknesses.push('سیگنال قدیمی شده است');
    recommendations.push('منتظر سیگنال تازه‌تر باشید');
  }
  
  if (histAccuracy < 40) {
    weaknesses.push('دقت تاریخی پایین برای این نماد');
    recommendations.push('با حجم کمتر معامله کنید');
  } else if (histAccuracy > 70) {
    strengths.push('سابقه خوب سیگنال‌های گذشته');
  }
  
  // Generate recommendations based on confidence level
  if (overallConfidence >= 75) {
    recommendations.push('اعتماد بالا - می‌توان با حجم مناسب وارد شد');
  } else if (overallConfidence >= 50) {
    recommendations.push('اعتماد متوسط - با احتیاط و حجم کمتر وارد شوید');
  } else {
    recommendations.push('اعتماد پایین - از ورود خودداری کنید یا منتظر بمانید');
  }
  
  // Valid until time (based on confidence)
  const validHours = overallConfidence >= 75 ? 4 : overallConfidence >= 50 ? 2 : 1;
  const validUntil = signalTimestamp + (validHours * 60 * 60 * 1000);
  
  return {
    overallConfidence: Math.round(overallConfidence),
    weightedScore: Math.round(weightedScore),
    reliability,
    factors,
    strengths,
    weaknesses,
    recommendations,
    timestamp: signalTimestamp,
    validUntil,
  };
}

/**
 * Track historical performance of signals
 */
export function updateHistoricalPerformance(
  performances: Map<string, HistoricalPerformance>,
  symbol: string,
  wasAccurate: boolean,
  actualReturn: number
): Map<string, HistoricalPerformance> {
  const existing = performances.get(symbol) || {
    symbol,
    totalSignals: 0,
    accurateSignals: 0,
    accuracyRate: 50,
    avgReturn: 0,
    winRate: 0,
    lastUpdated: 0,
  };
  
  const newTotal = existing.totalSignals + 1;
  const newAccurate = existing.accurateSignals + (wasAccurate ? 1 : 0);
  const newAccuracyRate = (newAccurate / newTotal) * 100;
  const newAvgReturn = ((existing.avgReturn * existing.totalSignals) + actualReturn) / newTotal;
  const newWinRate = (newAccurate / newTotal) * 100;
  
  performances.set(symbol, {
    ...existing,
    totalSignals: newTotal,
    accurateSignals: newAccurate,
    accuracyRate: Math.round(newAccuracyRate),
    avgReturn: Math.round(newAvgReturn * 100) / 100,
    winRate: Math.round(newWinRate),
    lastUpdated: Date.now(),
  });
  
  return performances;
}

/**
 * Get confidence level description in Persian
 */
export function getConfidenceDescription(confidence: number): string {
  if (confidence >= 80) return 'بسیار بالا - اطمینان زیاد به سیگنال';
  if (confidence >= 65) return 'بالا - سیگنال قابل اعتماد';
  if (confidence >= 50) return 'متوسط - نیاز به احتیاط';
  if (confidence >= 35) return 'پایین - ریسک بالا';
  return 'بسیار پایین - عدم اطمینان';
}

/**
 * Export for use in other modules
 */
export const confidenceEngine = {
  calculateConfidence,
  updateHistoricalPerformance,
  getConfidenceDescription,
  DEFAULT_WEIGHTS,
};
