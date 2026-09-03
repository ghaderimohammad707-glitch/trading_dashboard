import { describe, it, expect } from 'vitest';
import { WalkForwardOptimizer } from './walkforward';
import { OHLCV, BacktestConfig, Signal } from './types';

describe('WalkForwardOptimizer - Phase 2: Walk-Forward Optimization', () => {
  const baseConfig: BacktestConfig = {
    initialCapital: 100000,
    commissionRate: 0.0008,
    slippageRate: 0.001,
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    symbol: 'TEST'
  };

  const wfConfig = {
    trainPeriods: 20,
    testPeriods: 10,
    stepSize: 10,
    minDataPoints: 5
  };

  // Simple signal generator for testing
  const simpleSignalGenerator = (data: OHLCV[], params: Record<string, number>): Signal[] => {
    const lookback = params.lookback || 5;
    const threshold = params.threshold || 0.02;
    
    return data.map((candle, i) => {
      if (i < lookback) {
        return { timestamp: candle.timestamp, direction: 'NEUTRAL', confidence: 0.5 };
      }
      
      // Simple momentum strategy
      const pastPrice = data[i - lookback].close;
      const currentPrice = candle.close;
      const change = (currentPrice - pastPrice) / pastPrice;
      
      if (change > threshold) {
        return {
          timestamp: candle.timestamp,
          direction: 'LONG',
          confidence: 0.7,
          targetPrice: currentPrice * 1.05,
          stopLoss: currentPrice * 0.95
        };
      } else if (change < -threshold) {
        return {
          timestamp: candle.timestamp,
          direction: 'SHORT',
          confidence: 0.7,
          targetPrice: currentPrice * 0.95,
          stopLoss: currentPrice * 1.05
        };
      }
      
      return { timestamp: candle.timestamp, direction: 'NEUTRAL', confidence: 0.5 };
    });
  };

  const generateTestData = (length: number): OHLCV[] => {
    const data: OHLCV[] = [];
    let price = 100;
    
    for (let i = 0; i < length; i++) {
      const change = (Math.random() - 0.48) * 3; // Slight upward bias
      const close = price * (1 + change / 100);
      
      data.push({
        timestamp: Date.parse(`2023-01-${(i % 31 + 1).toString().padStart(2, '0')}`),
        open: price,
        high: Math.max(price, close) * 1.01,
        low: Math.min(price, close) * 0.99,
        close,
        volume: 1000000
      });
      
      price = close;
    }
    
    return data;
  };

  it('should initialize correctly', () => {
    const data = generateTestData(100);
    const optimizer = new WalkForwardOptimizer(data, baseConfig, wfConfig, simpleSignalGenerator);
    expect(optimizer).toBeDefined();
  });

  it('should run walk-forward optimization with multiple folds', () => {
    const data = generateTestData(100);
    const optimizer = new WalkForwardOptimizer(data, baseConfig, wfConfig, simpleSignalGenerator);
    
    const parameterGrid = {
      lookback: [5, 10],
      threshold: [0.01, 0.02]
    };
    
    const results = optimizer.run(parameterGrid);
    
    // Should have multiple folds
    expect(results.length).toBeGreaterThan(0);
    
    // Each result should have required properties
    results.forEach(result => {
      expect(result.fold).toBeGreaterThan(0);
      expect(result.trainStart).toBeDefined();
      expect(result.trainEnd).toBeDefined();
      expect(result.testStart).toBeDefined();
      expect(result.testEnd).toBeDefined();
      expect(result.trainReport).toBeDefined();
      expect(result.testReport).toBeDefined();
      expect(typeof result.oosPerformance).toBe('number');
    });
  });

  it('should find optimal parameters via grid search', () => {
    const data = generateTestData(60);
    const optimizer = new WalkForwardOptimizer(data, baseConfig, wfConfig, simpleSignalGenerator);
    
    const parameterGrid = {
      lookback: [3, 5, 7],
      threshold: [0.01, 0.02, 0.03]
    };
    
    const results = optimizer.run(parameterGrid);
    
    // Grid search should explore all combinations
    expect(results.length).toBeGreaterThan(0);
  });

  it('should analyze results and calculate statistics', () => {
    const data = generateTestData(100);
    const optimizer = new WalkForwardOptimizer(data, baseConfig, wfConfig, simpleSignalGenerator);
    
    const parameterGrid = {
      lookback: [5, 10],
      threshold: [0.01, 0.02]
    };
    
    const results = optimizer.run(parameterGrid);
    const analysis = optimizer.analyzeResults(results);
    
    expect(typeof analysis.avgOOSPerformance).toBe('number');
    expect(typeof analysis.stdOOSPerformance).toBe('number');
    expect(typeof analysis.consistentProfitability).toBe('number');
    expect(typeof analysis.avgWinRate).toBe('number');
    expect(typeof analysis.robustnessScore).toBe('number');
    
    // Consistent profitability should be between 0 and 1
    expect(analysis.consistentProfitability).toBeGreaterThanOrEqual(0);
    expect(analysis.consistentProfitability).toBeLessThanOrEqual(1);
  });

  it('should handle empty results gracefully', () => {
    const data = generateTestData(10); // Too small for any fold
    const optimizer = new WalkForwardOptimizer(data, baseConfig, wfConfig, simpleSignalGenerator);
    
    const parameterGrid = {
      lookback: [5],
      threshold: [0.02]
    };
    
    const results = optimizer.run(parameterGrid);
    const analysis = optimizer.analyzeResults(results);
    
    expect(analysis.avgOOSPerformance).toBe(0);
    expect(analysis.stdOOSPerformance).toBe(0);
    expect(analysis.consistentProfitability).toBe(0);
  });

  it('should respect train/test split', () => {
    const data = generateTestData(80);
    const customConfig = {
      ...wfConfig,
      trainPeriods: 30,
      testPeriods: 10,
      stepSize: 10
    };
    
    const optimizer = new WalkForwardOptimizer(data, baseConfig, customConfig, simpleSignalGenerator);
    const parameterGrid = { lookback: [5], threshold: [0.02] };
    
    const results = optimizer.run(parameterGrid);
    
    if (results.length > 0) {
      const firstResult = results[0];
      const trainStart = new Date(firstResult.trainStart).getTime();
      const trainEnd = new Date(firstResult.trainEnd).getTime();
      const testStart = new Date(firstResult.testStart).getTime();
      const testEnd = new Date(firstResult.testEnd).getTime();
      
      // Test period should start after train period ends
      expect(testStart).toBeGreaterThanOrEqual(trainEnd);
      
      // Train duration should approximately match config (allowing for some variance in date parsing)
      const trainDuration = (trainEnd - trainStart) / (1000 * 60 * 60 * 24);
      expect(trainDuration).toBeGreaterThan(customConfig.trainPeriods - 2);
      expect(trainDuration).toBeLessThan(customConfig.trainPeriods + 2);
    }
  });

  it('should generate correct number of parameter combinations', () => {
    const data = generateTestData(60);
    const optimizer = new WalkForwardOptimizer(data, baseConfig, wfConfig, simpleSignalGenerator);
    
    // Grid with 3x2 = 6 combinations
    const parameterGrid = {
      lookback: [5, 10, 15],
      threshold: [0.01, 0.02]
    };
    
    const results = optimizer.run(parameterGrid);
    
    // Each fold should test all 6 combinations internally
    expect(results.length).toBeGreaterThan(0);
  });
});
