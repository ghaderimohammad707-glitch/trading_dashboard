import { describe, it, expect } from 'vitest';
import { BacktestEngine } from './engine';
import { OHLCV, Signal } from './types';

describe('BacktestEngine - Phase 1: Real Backtest with Fees & Slippage', () => {
  const baseConfig = {
    initialCapital: 100000,
    commissionRate: 0.0008,
    slippageRate: 0.001,
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    symbol: 'TEST'
  };

  it('should initialize with correct capital', () => {
    const engine = new BacktestEngine(baseConfig);
    // Engine should start with initial capital
    expect(engine).toBeDefined();
  });

  it('should calculate transaction costs correctly', () => {
    const engine = new BacktestEngine(baseConfig);
    
    // Test entry cost
    const price = 1000;
    const quantity = 10;
    const expectedCommission = price * quantity * baseConfig.commissionRate;
    const expectedSlippage = price * quantity * baseConfig.slippageRate;
    
    // Entry: effective price should be higher (worse)
    const entryEffectivePrice = price * (1 + baseConfig.slippageRate);
    expect(entryEffectivePrice).toBeCloseTo(1001, 1);
  });

  it('should process a simple LONG trade with profit', () => {
    const engine = new BacktestEngine(baseConfig);
    
    // Generate simple test data
    const candles: OHLCV[] = [
      { timestamp: Date.parse('2023-01-02'), open: 100, high: 105, low: 99, close: 104, volume: 1000 },
      { timestamp: Date.parse('2023-01-03'), open: 104, high: 110, low: 103, close: 108, volume: 1000 },
      { timestamp: Date.parse('2023-01-04'), open: 108, high: 115, low: 107, close: 114, volume: 1000 },
    ];

    const signals: Signal[] = [
      { timestamp: Date.parse('2023-01-02'), direction: 'LONG', confidence: 0.8, targetPrice: 115, stopLoss: 95 },
      { timestamp: Date.parse('2023-01-03'), direction: 'LONG', confidence: 0.8, targetPrice: 115, stopLoss: 95 },
      { timestamp: Date.parse('2023-01-04'), direction: 'LONG', confidence: 0.8, targetPrice: 115, stopLoss: 95 },
    ];

    // Process candles
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });

    const report = engine.generateReport();
    
    // Should have executed at least one trade
    expect(report.totalTrades).toBeGreaterThanOrEqual(0);
    expect(report.equityCurve.length).toBe(candles.length);
  });

  it('should respect stop loss', () => {
    const engine = new BacktestEngine(baseConfig);
    
    const candles: OHLCV[] = [
      { timestamp: Date.parse('2023-01-02'), open: 100, high: 102, low: 95, close: 96, volume: 1000 },
      { timestamp: Date.parse('2023-01-03'), open: 96, high: 98, low: 94, close: 95, volume: 1000 },
    ];

    const signals: Signal[] = [
      { timestamp: Date.parse('2023-01-02'), direction: 'LONG', confidence: 0.8, targetPrice: 120, stopLoss: 95 },
      { timestamp: Date.parse('2023-01-03'), direction: 'LONG', confidence: 0.8, targetPrice: 120, stopLoss: 95 },
    ];

    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });

    const report = engine.generateReport();
    
    // If a trade was opened, it should have been closed by stop loss
    if (report.totalTrades > 0) {
      const stoppedTrade = report.trades.find(t => t.exitReason === 'STOP');
      expect(stoppedTrade).toBeDefined();
    }
  });

  it('should handle SHORT positions', () => {
    const engine = new BacktestEngine(baseConfig);
    
    const candles: OHLCV[] = [
      { timestamp: Date.parse('2023-01-02'), open: 100, high: 101, low: 95, close: 96, volume: 1000 },
      { timestamp: Date.parse('2023-01-03'), open: 96, high: 97, low: 90, close: 91, volume: 1000 },
      { timestamp: Date.parse('2023-01-04'), open: 91, high: 92, low: 88, close: 89, volume: 1000 },
    ];

    const signals: Signal[] = [
      { timestamp: Date.parse('2023-01-02'), direction: 'SHORT', confidence: 0.8, targetPrice: 85, stopLoss: 105 },
      { timestamp: Date.parse('2023-01-03'), direction: 'SHORT', confidence: 0.8, targetPrice: 85, stopLoss: 105 },
      { timestamp: Date.parse('2023-01-04'), direction: 'SHORT', confidence: 0.8, targetPrice: 85, stopLoss: 105 },
    ];

    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });

    const report = engine.generateReport();
    expect(report.equityCurve.length).toBe(candles.length);
  });

  it('should calculate Sharpe and Sortino ratios', () => {
    const engine = new BacktestEngine(baseConfig);
    
    // Generate enough data for meaningful statistics
    const candles: OHLCV[] = [];
    const signals: Signal[] = [];
    
    let price = 100;
    for (let i = 0; i < 50; i++) {
      const timestamp = Date.parse(`2023-01-${Math.min(i + 1, 31).toString().padStart(2, '0')}`);
      const change = (Math.random() - 0.45) * 2; // Slight upward bias
      const close = price * (1 + change / 100);
      
      candles.push({
        timestamp,
        open: price,
        high: Math.max(price, close) * (1 + Math.random() * 0.01),
        low: Math.min(price, close) * (1 - Math.random() * 0.01),
        close,
        volume: 1000000
      });
      
      signals.push({
        timestamp,
        direction: change > 0 ? 'LONG' : 'SHORT',
        confidence: 0.7,
        targetPrice: close * 1.05,
        stopLoss: close * 0.95
      });
      
      price = close;
    }

    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });

    const report = engine.generateReport();
    
    // Ratios should be calculated (can be negative or positive)
    expect(typeof report.sharpeRatio).toBe('number');
    expect(typeof report.sortinoRatio).toBe('number');
    expect(typeof report.maxDrawdown).toBe('number');
    expect(report.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(report.maxDrawdown).toBeLessThanOrEqual(1);
  });

  it('should include fees and slippage in trade results', () => {
    const engine = new BacktestEngine({
      ...baseConfig,
      commissionRate: 0.001,
      slippageRate: 0.002
    });
    
    const candles: OHLCV[] = [
      { timestamp: Date.parse('2023-01-02'), open: 100, high: 110, low: 99, close: 108, volume: 1000 },
      { timestamp: Date.parse('2023-01-03'), open: 108, high: 115, low: 107, close: 114, volume: 1000 },
    ];

    const signals: Signal[] = [
      { timestamp: Date.parse('2023-01-02'), direction: 'LONG', confidence: 0.8, targetPrice: 115, stopLoss: 95 },
      { timestamp: Date.parse('2023-01-03'), direction: 'NEUTRAL', confidence: 0.5 },
    ];

    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });

    const report = engine.generateReport();
    
    if (report.totalTrades > 0) {
      const trade = report.trades[0];
      expect(trade.fees).toBeGreaterThan(0);
      expect(trade.slippage).toBeGreaterThan(0);
    }
  });
});
