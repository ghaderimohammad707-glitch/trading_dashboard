import { OHLCV, BacktestConfig, TradeResult, BacktestReport, calculateTransactionCosts, Signal } from './types';

/**
 * Engine اصلی بک‌تست با پشتیبانی از:
 * - کارمزد و Slippage واقعی
 * - مدیریت پوزیشن‌های LONG/SHORT
 * - محاسبه دقیق سود/زیان
 * - تولید منحنی سرمایه (Equity Curve)
 */
export class BacktestEngine {
  private config: BacktestConfig;
  private capital: number;
  private position: {
    side: 'LONG' | 'SHORT';
    entryPrice: number;
    quantity: number;
    entryDate: number;
  } | null = null;
  
  private trades: TradeResult[] = [];
  private equityCurve: { date: string; value: number }[] = [];

  constructor(config: BacktestConfig) {
    this.config = config;
    this.capital = config.initialCapital;
  }

  /**
   * پردازش یک کندل و بررسی سیگنال‌ها
   */
  processCandle(candle: OHLCV, signal: Signal): void {
    const dateStr = new Date(candle.timestamp).toISOString().split('T')[0];

    // بستن پوزیشن اگر سیگنال مخالف آمد
    if (this.position && signal.direction !== 'NEUTRAL' && signal.direction !== this.position.side) {
      this.closePosition(candle.close, candle.timestamp, 'SIGNAL_REVERSAL');
    }

    // باز کردن پوزیشن جدید
    if (!this.position && signal.direction !== 'NEUTRAL') {
      this.openPosition(signal, candle.close, candle.timestamp);
    }

    // بررسی Target و Stop Loss
    if (this.position) {
      if (signal.targetPrice && signal.stopLoss) {
        if (this.position.side === 'LONG') {
          if (candle.high >= signal.targetPrice) {
            this.closePosition(signal.targetPrice, candle.timestamp, 'TARGET');
          } else if (candle.low <= signal.stopLoss) {
            this.closePosition(signal.stopLoss, candle.timestamp, 'STOP');
          }
        } else {
          if (candle.low <= signal.targetPrice) {
            this.closePosition(signal.targetPrice, candle.timestamp, 'TARGET');
          } else if (candle.high >= signal.stopLoss) {
            this.closePosition(signal.stopLoss, candle.timestamp, 'STOP');
          }
        }
      }
    }

    // ثبت Equity Curve
    const currentValue = this.calculateEquity(candle.close);
    this.equityCurve.push({ date: dateStr, value: currentValue });
  }

  private openPosition(signal: Signal, price: number, timestamp: number): void {
    const costs = calculateTransactionCosts(price, 1, this.config, true);
    const effectivePrice = costs.effectivePrice;
    
    // اطمینان از اینکه direction فقط LONG یا SHORT باشد
    if (signal.direction === 'NEUTRAL') return;
    
    // محاسبه تعداد بر اساس ریسک مدیریت سرمایه (مثلاً 2% ریسک در هر ترید)
    const riskPerTrade = this.capital * 0.02;
    const stopDistance = signal.stopLoss 
      ? Math.abs(effectivePrice - signal.stopLoss) 
      : effectivePrice * 0.05; // پیش‌فرض 5%
    
    const quantity = Math.floor(riskPerTrade / stopDistance);
    
    if (quantity > 0 && effectivePrice * quantity <= this.capital) {
      this.position = {
        side: signal.direction,
        entryPrice: effectivePrice,
        quantity,
        entryDate: timestamp
      };
      
      this.capital -= effectivePrice * quantity;
    }
  }

  private closePosition(exitPrice: number, timestamp: number, reason: TradeResult['exitReason']): void {
    if (!this.position) return;

    const costs = calculateTransactionCosts(exitPrice, this.position.quantity, this.config, false);
    const effectiveExitPrice = costs.effectivePrice;
    
    let grossProfit: number;
    if (this.position.side === 'LONG') {
      grossProfit = (effectiveExitPrice - this.position.entryPrice) * this.position.quantity;
    } else {
      grossProfit = (this.position.entryPrice - effectiveExitPrice) * this.position.quantity;
    }

    const fees = costs.cost;
    const slippage = costs.slippage;
    const netProfit = grossProfit - fees;

    this.trades.push({
      entryDate: new Date(this.position.entryDate).toISOString().split('T')[0],
      exitDate: new Date(timestamp).toISOString().split('T')[0],
      entryPrice: this.position.entryPrice,
      exitPrice: effectiveExitPrice,
      quantity: this.position.quantity,
      side: this.position.side,
      profit: netProfit,
      profitPercent: (netProfit / (this.position.entryPrice * this.position.quantity)) * 100,
      fees,
      slippage,
      exitReason: reason
    });

    this.capital += effectiveExitPrice * this.position.quantity + netProfit;
    this.position = null;
  }

  private calculateEquity(currentPrice: number): number {
    let equity = this.capital;
    if (this.position) {
      const unrealizedPnL = this.position.side === 'LONG'
        ? (currentPrice - this.position.entryPrice) * this.position.quantity
        : (this.position.entryPrice - currentPrice) * this.position.quantity;
      equity += this.position.entryPrice * this.position.quantity + unrealizedPnL;
    }
    return equity;
  }

  /**
   * تولید گزارش نهایی بک‌تست
   */
  generateReport(): BacktestReport {
    const winningTrades = this.trades.filter(t => t.profit > 0);
    const losingTrades = this.trades.filter(t => t.profit <= 0);
    
    const totalProfit = this.trades.reduce((sum, t) => sum + t.profit, 0);
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));
    
    // محاسبه Max Drawdown
    let maxEquity = this.config.initialCapital;
    let maxDrawdown = 0;
    for (const point of this.equityCurve) {
      if (point.value > maxEquity) {
        maxEquity = point.value;
      }
      const drawdown = (maxEquity - point.value) / maxEquity;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // محاسبه Sharpe Ratio (ساده‌شده)
    const dailyReturns = this.equityCurve.slice(1).map((p, i) => {
      const prev = this.equityCurve[i].value;
      return (p.value - prev) / prev;
    });
    
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length || 0;
    const stdDev = Math.sqrt(
      dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length
    ) || 1;
    
    const sharpeRatio = (avgReturn / stdDev) * Math.sqrt(252); // سالانه
    
    // محاسبه Sortino Ratio (فقط انحراف معیار منفی)
    const negativeReturns = dailyReturns.filter(r => r < 0);
    const downsideDev = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
    ) || 1;
    
    const sortinoRatio = (avgReturn / downsideDev) * Math.sqrt(252);

    return {
      totalTrades: this.trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: this.trades.length > 0 ? winningTrades.length / this.trades.length : 0,
      totalProfit,
      totalReturn: ((this.equityCurve[this.equityCurve.length - 1]?.value || this.config.initialCapital) - this.config.initialCapital) / this.config.initialCapital,
      maxDrawdown,
      sharpeRatio,
      sortinoRatio,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : Infinity,
      trades: this.trades,
      equityCurve: this.equityCurve
    };
  }
}
