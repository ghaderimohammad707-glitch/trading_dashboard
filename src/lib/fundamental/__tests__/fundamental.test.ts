import { describe, it, expect } from 'vitest';
import { calculateGrossMargin, calculateROE, calculateCurrentRatio } from '../ratioCalculator.js';
import { determineValuationStatus } from '../valuator.js';
import { calculateFundamentalScore, determineRecommendation } from '../scorer.js';

describe('Fundamental Analysis', () => {
  it('calculates gross margin', () => {
    expect(calculateGrossMargin(1000, 600)).toBe(0.4);
  });

  it('calculates ROE', () => {
    expect(calculateROE(100, 1000)).toBe(0.1);
  });

  it('calculates current ratio', () => {
    expect(calculateCurrentRatio(2000, 1000)).toBe(2);
  });

  it('determines valuation status', () => {
    // قیمت 80، ارزش منصفه 100، حاشیه اطمینان 20% = زیرارزشی (تخفیف 20%)
    expect(determineValuationStatus(80, 100, 0.15).status).toBe('UNDERVALUED');
  });

  it('calculates fundamental score', () => {
    const ratios = {
      profitability: { grossMargin: 0.4, operatingMargin: 0.2, netMargin: 0.15, roe: 0.18, roa: 0.08, roc: 0.1, roi: 0.12 },
      liquidity: { currentRatio: 2.5, quickRatio: 1.8, cashRatio: 0.5, workingCapital: 2500 },
      leverage: { debtToEquity: 0.4, debtToAssets: 0.3, interestCoverage: 8, debtServiceCoverage: 3 },
      efficiency: { assetTurnover: 1.2, inventoryTurnover: 8, receivablesTurnover: 10, payablesTurnover: 8, cashConversionCycle: 45 },
      valuation: { peRatio: 12, pbRatio: 1.8, psRatio: 2, pcfRatio: 10, evToEbitda: 8, evToRevenue: 2.5, pegRatio: 1.2 },
      growth: { revenueGrowth1Y: 0.12, revenueGrowth3Y: 0.1, revenueGrowth5Y: 0.08, epsGrowth1Y: 0.15, epsGrowth3Y: 0.12, epsGrowth5Y: 0.1, dividendGrowth1Y: 0.05, dividendGrowth3Y: 0.04 },
    };
    const score = calculateFundamentalScore(ratios);
    expect(score.totalScore).toBeGreaterThan(0);
    expect(score.percentage).toBeGreaterThan(0);
  });

  it('determines recommendation', () => {
    const score = { percentage: 85, totalScore: 85, maxScore: 100, breakdown: { profitability: 20, financialHealth: 20, growth: 18, valuation: 18, efficiency: 9 }, grade: 'A' as const };
    expect(determineRecommendation(score, 'UNDERVALUED')).toBe('BUY_STRONG');
  });
});
