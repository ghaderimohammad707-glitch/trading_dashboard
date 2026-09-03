/**
 * Signal Engine with ATR-based Dynamic Stop Loss / Take Profit
 * Replaces fixed percentage SL/TP with volatility-adjusted levels
 */

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Signal {
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  timestamp: number;
  atr?: number;
  atrMultiplier?: number;
}

interface SignalConfig {
  atrPeriod: number;
  atrMultiplierSL: number;
  atrMultiplierTP: number;
  minConfidence: number;
}

const DEFAULT_CONFIG: SignalConfig = {
  atrPeriod: 14,
  atrMultiplierSL: 2.0,
  atrMultiplierTP: 3.0,
  minConfidence: 60,
};

class SignalEngine {
  private config: SignalConfig;

  constructor(config: Partial<SignalConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate ATR (Average True Range) from candle data
   */
  calculateATR(candles: Candle[], period: number = 14): number {
    if (candles.length < period + 1) {
      // Not enough data, use available candles
      period = Math.max(2, candles.length - 1);
    }

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];

      const highLow = current.high - current.low;
      const highClose = Math.abs(current.high - previous.close);
      const lowClose = Math.abs(current.low - previous.close);

      const trueRange = Math.max(highLow, highClose, lowClose);
      trueRanges.push(trueRange);
    }

    // Calculate simple average of last `period` true ranges
    const recentTRs = trueRanges.slice(-period);
    const atr = recentTRs.reduce((sum, tr) => sum + tr, 0) / recentTRs.length;

    return parseFloat(atr.toFixed(2));
  }

  /**
   * Calculate dynamic Stop Loss based on ATR
   */
  calculateStopLoss(entryPrice: number, atr: number, direction: 'buy' | 'sell'): number {
    const multiplier = this.config.atrMultiplierSL;
    
    if (direction === 'buy') {
      // For long positions, SL is below entry
      return parseFloat((entryPrice - (atr * multiplier)).toFixed(2));
    } else {
      // For short positions, SL is above entry
      return parseFloat((entryPrice + (atr * multiplier)).toFixed(2));
    }
  }

  /**
   * Calculate dynamic Take Profit based on ATR
   */
  calculateTakeProfit(entryPrice: number, atr: number, direction: 'buy' | 'sell'): number {
    const multiplier = this.config.atrMultiplierTP;
    
    if (direction === 'buy') {
      // For long positions, TP is above entry
      return parseFloat((entryPrice + (atr * multiplier)).toFixed(2));
    } else {
      // For short positions, TP is below entry
      return parseFloat((entryPrice - (atr * multiplier)).toFixed(2));
    }
  }

  /**
   * Generate a signal with ATR-based SL/TP
   */
  generateSignal(
    symbol: string,
    direction: 'buy' | 'sell',
    entryPrice: number,
    candles: Candle[],
    confidence: number
  ): Signal | null {
    if (confidence < this.config.minConfidence) {
      return null;
    }

    const atr = this.calculateATR(candles, this.config.atrPeriod);
    
    // Prevent division by zero or extremely small ATR
    if (atr <= 0 || atr > entryPrice * 0.5) {
      console.warn(`Invalid ATR for ${symbol}: ${atr}`);
      return null;
    }

    const stopLoss = this.calculateStopLoss(entryPrice, atr, direction);
    const takeProfit = this.calculateTakeProfit(entryPrice, atr, direction);

    // Validate SL/TP makes sense
    if (direction === 'buy' && (stopLoss >= entryPrice || takeProfit <= entryPrice)) {
      return null;
    }
    if (direction === 'sell' && (stopLoss <= entryPrice || takeProfit >= entryPrice)) {
      return null;
    }

    return {
      symbol,
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      confidence,
      timestamp: Date.now(),
      atr,
      atrMultiplier: this.config.atrMultiplierSL,
    };
  }

  /**
   * Get risk-reward ratio for a signal
   */
  getRiskRewardRatio(signal: Signal): number {
    const risk = Math.abs(signal.entryPrice - signal.stopLoss);
    const reward = Math.abs(signal.takeProfit - signal.entryPrice);
    
    if (risk === 0) return 0;
    return parseFloat((reward / risk).toFixed(2));
  }

  /**
   * Analyze signal quality
   */
  analyzeSignal(signal: Signal): {
    riskReward: number;
    riskPercent: number;
    rewardPercent: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const riskReward = this.getRiskRewardRatio(signal);
    const riskPercent = (Math.abs(signal.entryPrice - signal.stopLoss) / signal.entryPrice) * 100;
    const rewardPercent = (Math.abs(signal.takeProfit - signal.entryPrice) / signal.entryPrice) * 100;

    let quality: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (riskReward >= 2.0 && signal.confidence >= 80) {
      quality = 'excellent';
    } else if (riskReward >= 1.5 && signal.confidence >= 70) {
      quality = 'good';
    } else if (riskReward >= 1.0 && signal.confidence >= 60) {
      quality = 'fair';
    } else {
      quality = 'poor';
    }

    return {
      riskReward,
      riskPercent: parseFloat(riskPercent.toFixed(2)),
      rewardPercent: parseFloat(rewardPercent.toFixed(2)),
      quality,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SignalConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const signalEngine = new SignalEngine();
export { Signal, SignalConfig };
