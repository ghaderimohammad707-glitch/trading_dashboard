import { BacktestEngine } from './engine';
import { OHLCV, Signal, BacktestConfig, generateHistoricalData } from './types';
import { calculateAdvancedMetrics, calculateStrategyScore, analyzeRisk, AdvancedMetrics } from './metrics';

describe('Advanced Metrics - Phase 2: Performance Analysis', () => {
  const baseConfig: BacktestConfig = {
    initialCapital: 100000,
    commissionRate: 0.0008,
    slippageRate: 0.001,
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    symbol: 'TEST'
  };

  // تولید داده تستی با روند صعودی
  const generateBullishData = (length: number): { candles: OHLCV[], signals: Signal[] } => {
    const data = generateHistoricalData('2023-01-01', `2023-01-${length}`, 100, 0.02, 0.001);
    const signals: Signal[] = data.map((candle, i) => {
      if (i < 5) {
        return { timestamp: candle.timestamp, direction: 'NEUTRAL', confidence: 0.5 };
      }
      // استراتژی مومنتوم ساده
      const pastPrice = data[i - 5].close;
      const change = (candle.close - pastPrice) / pastPrice;
      
      if (change > 0.02) {
        return {
          timestamp: candle.timestamp,
          direction: 'LONG',
          confidence: 0.75,
          targetPrice: candle.close * 1.05,
          stopLoss: candle.close * 0.95
        };
      } else if (change < -0.02) {
        return {
          timestamp: candle.timestamp,
          direction: 'SHORT',
          confidence: 0.75,
          targetPrice: candle.close * 0.95,
          stopLoss: candle.close * 1.05
        };
      }
      return { timestamp: candle.timestamp, direction: 'NEUTRAL', confidence: 0.5 };
    });
    
    return { candles: data, signals };
  };

  it('should calculate advanced metrics from backtest report', () => {
    const { candles, signals } = generateBullishData(60);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    // بررسی وجود تمام معیارها
    expect(metrics).toBeDefined();
    expect(typeof metrics.totalReturn).toBe('number');
    expect(typeof metrics.annualizedReturn).toBe('number');
    expect(typeof metrics.maxDrawdown).toBe('number');
    expect(typeof metrics.sharpeRatio).toBe('number');
    expect(typeof metrics.sortinoRatio).toBe('number');
    expect(typeof metrics.calmarRatio).toBe('number');
    expect(typeof metrics.winRate).toBe('number');
    expect(typeof metrics.profitFactor).toBe('number');
    expect(typeof metrics.expectancy).toBe('number');
    expect(typeof metrics.volatility).toBe('number');
    expect(typeof metrics.valueAtRisk95).toBe('number');
    expect(typeof metrics.conditionalVaR).toBe('number');
    expect(typeof metrics.rSquared).toBe('number');
    
    // محدوده‌های منطقی
    expect(metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(metrics.maxDrawdown).toBeLessThanOrEqual(1);
    expect(metrics.winRate).toBeGreaterThanOrEqual(0);
    expect(metrics.winRate).toBeLessThanOrEqual(1);
    expect(metrics.rSquared).toBeGreaterThanOrEqual(0);
    expect(metrics.rSquared).toBeLessThanOrEqual(1);
  });

  it('should calculate strategy score between 0-100', () => {
    const { candles, signals } = generateBullishData(60);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    const score = calculateStrategyScore(metrics);
    
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(typeof score).toBe('number');
  });

  it('should analyze risk metrics', () => {
    const { candles, signals } = generateBullishData(60);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const riskMetrics = analyzeRisk(report);
    
    expect(riskMetrics).toBeDefined();
    expect(typeof riskMetrics.var95).toBe('number');
    expect(typeof riskMetrics.cvar95).toBe('number');
    expect(typeof riskMetrics.maxConsecutiveLosses).toBe('number');
    expect(riskMetrics.worstDrawdownPeriod).toBeDefined();
    
    // VaR و CVaR باید مثبت باشند (به صورت قدر مطلق)
    expect(riskMetrics.var95).toBeGreaterThanOrEqual(0);
    expect(riskMetrics.cvar95).toBeGreaterThanOrEqual(0);
    
    // CVaR باید بزرگتر یا مساوی VaR باشد
    expect(riskMetrics.cvar95).toBeGreaterThanOrEqual(riskMetrics.var95);
  });

  it('should handle empty trades gracefully', () => {
    const candles: OHLCV[] = [
      { timestamp: Date.parse('2023-01-02'), open: 100, high: 101, low: 99, close: 100, volume: 1000 },
      { timestamp: Date.parse('2023-01-03'), open: 100, high: 101, low: 99, close: 100, volume: 1000 },
    ];
    
    const signals: Signal[] = [
      { timestamp: Date.parse('2023-01-02'), direction: 'NEUTRAL', confidence: 0.5 },
      { timestamp: Date.parse('2023-01-03'), direction: 'NEUTRAL', confidence: 0.5 },
    ];
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    expect(metrics.totalTrades).toBe(0);
    expect(metrics.winRate).toBe(0);
    expect(metrics.avgWin).toBe(0);
    expect(metrics.avgLoss).toBe(0);
  });

  it('should calculate payoff ratio correctly', () => {
    const candles: OHLCV[] = [];
    const signals: Signal[] = [];
    
    // ایجاد سناریوی مشخص: ۲ ترید سودده و ۱ ترید زیان‌ده
    let price = 100;
    for (let i = 0; i < 10; i++) {
      const timestamp = Date.parse(`2023-01-${(i + 1).toString().padStart(2, '0')}`);
      const change = i % 3 === 0 ? -5 : 3; // هر سومین روز منفی، بقیه مثبت
      const close = price * (1 + change / 100);
      
      candles.push({
        timestamp,
        open: price,
        high: Math.max(price, close) * 1.01,
        low: Math.min(price, close) * 0.99,
        close,
        volume: 1000000
      });
      
      signals.push({
        timestamp,
        direction: change > 0 ? 'LONG' : 'SHORT',
        confidence: 0.8,
        targetPrice: close * 1.03,
        stopLoss: close * 0.97
      });
      
      price = close;
    }
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    // Payoff Ratio باید محاسبه شود
    expect(typeof metrics.payoffRatio).toBe('number');
    
    // Expectancy باید محاسبه شود
    expect(typeof metrics.expectancy).toBe('number');
  });

  it('should track consecutive wins and losses', () => {
    const { candles, signals } = generateBullishData(100);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    expect(typeof metrics.consecutiveWins).toBe('number');
    expect(typeof metrics.consecutiveLosses).toBe('number');
    expect(metrics.consecutiveWins).toBeGreaterThanOrEqual(0);
    expect(metrics.consecutiveLosses).toBeGreaterThanOrEqual(0);
  });

  it('should calculate recovery factor', () => {
    const { candles, signals } = generateBullishData(80);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    expect(typeof metrics.recoveryFactor).toBe('number');
    
    // Recovery Factor می‌تواند منفی یا مثبت باشد
    if (report.totalProfit > 0) {
      expect(metrics.recoveryFactor).toBeGreaterThan(0);
    }
  });

  it('should calculate R-squared for equity curve stability', () => {
    const { candles, signals } = generateBullishData(60);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    expect(typeof metrics.rSquared).toBe('number');
    expect(metrics.rSquared).toBeGreaterThanOrEqual(0);
    expect(metrics.rSquared).toBeLessThanOrEqual(1);
  });

  it('should calculate downside deviation separately', () => {
    const { candles, signals } = generateBullishData(60);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    expect(typeof metrics.downsideDeviation).toBe('number');
    expect(metrics.downsideDeviation).toBeGreaterThanOrEqual(0);
    
    // Downside Deviation باید کمتر یا مساوی Volatility کل باشد
    expect(metrics.downsideDeviation).toBeLessThanOrEqual(metrics.volatility);
  });

  it('should calculate max drawdown duration', () => {
    const { candles, signals } = generateBullishData(60);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    expect(typeof metrics.maxDrawdownDuration).toBe('number');
    expect(metrics.maxDrawdownDuration).toBeGreaterThanOrEqual(0);
  });

  it('should provide detailed trade statistics', () => {
    const { candles, signals } = generateBullishData(80);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    expect(metrics.totalTrades).toBe(report.trades.length);
    expect(metrics.winningTrades + metrics.losingTrades).toBe(metrics.totalTrades);
    
    if (metrics.totalTrades > 0) {
      expect(typeof metrics.avgWin).toBe('number');
      expect(typeof metrics.avgLoss).toBe('number');
      expect(typeof metrics.largestWin).toBe('number');
      expect(typeof metrics.largestLoss).toBe('number');
      expect(typeof metrics.avgTradeDuration).toBe('number');
    }
  });

  it('should calculate Calmar, Sterling, and Burke ratios', () => {
    const { candles, signals } = generateBullishData(60);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    expect(typeof metrics.calmarRatio).toBe('number');
    expect(typeof metrics.sterlingRatio).toBe('number');
    expect(typeof metrics.burkeRatio).toBe('number');
  });

  it('should calculate Value at Risk (VaR) and Conditional VaR', () => {
    const { candles, signals } = generateBullishData(100);
    
    const engine = new BacktestEngine(baseConfig);
    candles.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    expect(typeof metrics.valueAtRisk95).toBe('number');
    expect(typeof metrics.conditionalVaR).toBe('number');
    
    // هر دو باید مثبت باشند (به صورت قدر مطلق)
    expect(metrics.valueAtRisk95).toBeGreaterThanOrEqual(0);
    expect(metrics.conditionalVaR).toBeGreaterThanOrEqual(0);
  });

  it('should annualize returns correctly', () => {
    const shortData = generateHistoricalData('2023-01-01', '2023-01-30', 100, 0.02, 0.001);
    const signals: Signal[] = shortData.map(candle => ({
      timestamp: candle.timestamp,
      direction: 'LONG' as const,
      confidence: 0.7,
      targetPrice: candle.close * 1.05,
      stopLoss: candle.close * 0.95
    }));
    
    const engine = new BacktestEngine({
      ...baseConfig,
      startDate: '2023-01-01',
      endDate: '2023-01-30'
    });
    
    shortData.forEach((candle, i) => {
      engine['processCandle'](candle, signals[i]);
    });
    
    const report = engine.generateReport();
    const metrics = calculateAdvancedMetrics(report);
    
    expect(typeof metrics.annualizedReturn).toBe('number');
  });
});
