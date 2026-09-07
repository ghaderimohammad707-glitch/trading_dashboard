/**
 * Tests for Confidence Engine
 */

import { describe, it, expect } from 'vitest';
import { calculateConfidence, updateHistoricalPerformance, getConfidenceDescription } from '../confidenceEngine';
import type { AnalysisResult } from '../analysisEngines';
import type { Instrument } from '../clientFetch';

// Mock data helpers
const createMockAnalysis = (score: number): AnalysisResult => ({
  signal: score > 15 ? 'buy' : score < -15 ? 'sell' : 'hold',
  score,
  reasons: score > 0 ? ['سیگنال مثبت'] : ['سیگنال منفی'],
  details: {},
});

const createMockInstrument = (changePercent: number): Instrument => ({
  insCode: '123456',
  symbol: 'TEST',
  name: 'تست',
  last: 1000,
  close: 980,
  open: 990,
  high: 1010,
  low: 970,
  change: 20,
  changePercent,
  yesterday: 980,
  volume: 1000000,
  value: 1000000000,
  count: 100,
  bestDemandVol: 10000,
  bestDemandPrice: 995,
  bestSupplyVol: 15000,
  bestSupplyPrice: 1005,
} as Instrument);

describe('Confidence Engine', () => {
  describe('calculateConfidence', () => {
    it('should calculate confidence with all strong factors', () => {
      const technical = createMockAnalysis(80);
      const fundamental = createMockAnalysis(70);
      const volume = createMockAnalysis(75);
      const sentiment = createMockAnalysis(65);
      const instruments = [
        createMockInstrument(2.5),
        createMockInstrument(1.8),
        createMockInstrument(-0.5),
      ];

      const result = calculateConfidence(
        technical,
        fundamental,
        volume,
        sentiment,
        instruments
      );

      expect(result.overallConfidence).toBeGreaterThan(60);
      expect(['very_high', 'high', 'medium']).toContain(result.reliability);
      expect(result.strengths.length).toBeGreaterThan(0);
    });

    it('should calculate confidence with weak factors', () => {
      const technical = createMockAnalysis(-60);
      const fundamental = createMockAnalysis(-40);
      const volume = createMockAnalysis(-30);
      const sentiment = createMockAnalysis(-50);
      const instruments = [
        createMockInstrument(-3.0),
        createMockInstrument(-2.5),
        createMockInstrument(-1.0),
      ];

      const result = calculateConfidence(
        technical,
        fundamental,
        volume,
        sentiment,
        instruments
      );

      expect(result.overallConfidence).toBeLessThan(50);
      expect(result.weaknesses.length).toBeGreaterThan(0);
    });

    it('should apply time decay to old signals', () => {
      const technical = createMockAnalysis(80);
      const fundamental = createMockAnalysis(70);
      const volume = createMockAnalysis(75);
      const sentiment = createMockAnalysis(65);
      const instruments = [createMockInstrument(2.0)];

      // Fresh signal
      const freshResult = calculateConfidence(
        technical,
        fundamental,
        volume,
        sentiment,
        instruments,
        undefined,
        Date.now()
      );

      // Old signal (8 hours ago)
      const oldTimestamp = Date.now() - (8 * 60 * 60 * 1000);
      const oldResult = calculateConfidence(
        technical,
        fundamental,
        volume,
        sentiment,
        instruments,
        undefined,
        oldTimestamp
      );

      expect(oldResult.overallConfidence).toBeLessThan(freshResult.overallConfidence);
      expect(oldResult.factors.timeDecayFactor).toBeLessThan(0.5);
      expect(oldResult.weaknesses.some(w => w.includes('قدیمی'))).toBe(true);
    });

    it('should consider historical accuracy', () => {
      const technical = createMockAnalysis(60);
      const fundamental = createMockAnalysis(50);
      const volume = createMockAnalysis(55);
      const sentiment = createMockAnalysis(50);
      const instruments = [createMockInstrument(1.0)];

      // High historical accuracy
      const highAccPerf = {
        symbol: 'TEST',
        totalSignals: 100,
        accurateSignals: 80,
        accuracyRate: 80,
        avgReturn: 5.2,
        winRate: 75,
        lastUpdated: Date.now(),
      };

      // Low historical accuracy
      const lowAccPerf = {
        symbol: 'TEST',
        totalSignals: 100,
        accurateSignals: 30,
        accuracyRate: 30,
        avgReturn: -2.1,
        winRate: 25,
        lastUpdated: Date.now(),
      };

      const highAccResult = calculateConfidence(
        technical,
        fundamental,
        volume,
        sentiment,
        instruments,
        highAccPerf
      );

      const lowAccResult = calculateConfidence(
        technical,
        fundamental,
        volume,
        sentiment,
        instruments,
        lowAccPerf
      );

      expect(highAccResult.factors.historicalAccuracy).toBe(80);
      expect(lowAccResult.factors.historicalAccuracy).toBe(30);
      expect(highAccResult.overallConfidence).toBeGreaterThan(lowAccResult.overallConfidence);
    });

    it('should provide appropriate recommendations based on confidence', () => {
      const technical = createMockAnalysis(80);
      const fundamental = createMockAnalysis(70);
      const volume = createMockAnalysis(75);
      const sentiment = createMockAnalysis(65);
      const instruments = [createMockInstrument(2.0)];

      const highConfResult = calculateConfidence(
        technical,
        fundamental,
        volume,
        sentiment,
        instruments
      );

      expect(highConfResult.recommendations.some(r => r.includes('اعتماد بالا'))).toBe(true);

      const weakTechnical = createMockAnalysis(-60);
      const lowConfResult = calculateConfidence(
        weakTechnical,
        fundamental,
        volume,
        sentiment,
        instruments
      );

      expect(lowConfResult.recommendations.some(r => 
        r.includes('اعتماد پایین') || r.includes('احتیاط')
      )).toBe(true);
    });

    it('should determine market condition correctly', () => {
      // Bull market
      const bullInstruments = [
        createMockInstrument(3.0),
        createMockInstrument(2.5),
        createMockInstrument(1.8),
      ];
      
      const bullResult = calculateConfidence(
        createMockAnalysis(60),
        createMockAnalysis(50),
        createMockAnalysis(55),
        createMockAnalysis(50),
        bullInstruments
      );

      expect(bullResult.factors.marketConditionScore).toBeGreaterThan(60);

      // Bear market
      const bearInstruments = [
        createMockInstrument(-3.0),
        createMockInstrument(-2.5),
        createMockInstrument(-1.8),
      ];
      
      const bearResult = calculateConfidence(
        createMockAnalysis(60),
        createMockAnalysis(50),
        createMockAnalysis(55),
        createMockAnalysis(50),
        bearInstruments
      );

      expect(bearResult.factors.marketConditionScore).toBeLessThan(40);
    });
  });

  describe('updateHistoricalPerformance', () => {
    it('should update performance metrics correctly', () => {
      let performances = new Map<string, any>();
      
      performances = updateHistoricalPerformance(performances, 'TEST', true, 5.0);
      
      const perf = performances.get('TEST');
      expect(perf.totalSignals).toBe(1);
      expect(perf.accurateSignals).toBe(1);
      expect(perf.accuracyRate).toBe(100);
      expect(perf.avgReturn).toBe(5.0);

      performances = updateHistoricalPerformance(performances, 'TEST', false, -2.0);
      
      const updatedPerf = performances.get('TEST');
      expect(updatedPerf.totalSignals).toBe(2);
      expect(updatedPerf.accurateSignals).toBe(1);
      expect(updatedPerf.accuracyRate).toBe(50);
      expect(updatedPerf.avgReturn).toBe(1.5);
    });

    it('should handle multiple symbols independently', () => {
      let performances = new Map<string, any>();
      
      performances = updateHistoricalPerformance(performances, 'SYM1', true, 3.0);
      performances = updateHistoricalPerformance(performances, 'SYM2', false, -1.5);
      
      const sym1Perf = performances.get('SYM1');
      const sym2Perf = performances.get('SYM2');
      
      expect(sym1Perf.accuracyRate).toBe(100);
      expect(sym2Perf.accuracyRate).toBe(0);
      expect(sym1Perf.symbol).toBe('SYM1');
      expect(sym2Perf.symbol).toBe('SYM2');
    });
  });

  describe('getConfidenceDescription', () => {
    it('should return correct description for different confidence levels', () => {
      expect(getConfidenceDescription(85)).toContain('بسیار بالا');
      expect(getConfidenceDescription(70)).toContain('بالا');
      expect(getConfidenceDescription(55)).toContain('متوسط');
      expect(getConfidenceDescription(40)).toContain('پایین');
      expect(getConfidenceDescription(20)).toContain('بسیار پایین');
    });

    it('should handle edge cases', () => {
      expect(getConfidenceDescription(100)).toBeDefined();
      expect(getConfidenceDescription(0)).toBeDefined();
      expect(getConfidenceDescription(80)).toBeDefined();
      expect(getConfidenceDescription(65)).toBeDefined();
      expect(getConfidenceDescription(50)).toBeDefined();
      expect(getConfidenceDescription(35)).toBeDefined();
    });
  });
});
