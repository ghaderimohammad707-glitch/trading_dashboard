/**
 * موتور بک‌تست حرفه‌ای
 * تست استراتژی‌ها روی داده‌های قیمتی تاریخی واقعی
 */

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  side: "long" | "short";
  pnl: number;
  pnlPct: number;
  exitReason: "take_profit" | "stop_loss" | "signal" | "timeout";
}

export interface BacktestResult {
  trades: BacktestTrade[];
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  totalReturn: number;
  totalReturnPct: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  profitFactor: number;
  expectancy: number;
  avgHoldingPeriod: number; // days
  largestWin: number;
  largestLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  equityCurve: number[];
  monthlyReturns: { month: string; return: number }[];
}

export interface StrategySignal {
  type: "buy" | "sell" | "hold";
  strength: number;
}

export interface BacktestOptions {
  initialCapital?: number;
  riskPerTrade?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  maxHoldingDays?: number;
  commissionPct?: number;
  slippagePct?: number;
  positionSizing?: 'fixed' | 'percent' | 'kelly';
  trailingStopPct?: number;
}

/**
 * استراتژی میانگین متحرک ساده
 */
export function smaStrategy(prices: number[], shortPeriod = 5, longPeriod = 20): StrategySignal[] {
  const signals: StrategySignal[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < longPeriod) {
      signals.push({ type: "hold", strength: 0 });
      continue;
    }
    const shortSMA = prices.slice(i - shortPeriod, i).reduce((a, b) => a + b, 0) / shortPeriod;
    const longSMA = prices.slice(i - longPeriod, i).reduce((a, b) => a + b, 0) / longPeriod;
    const prevShortSMA = prices.slice(i - shortPeriod - 1, i - 1).reduce((a, b) => a + b, 0) / shortPeriod;
    const prevLongSMA = prices.slice(i - longPeriod - 1, i - 1).reduce((a, b) => a + b, 0) / longPeriod;

    if (prevShortSMA <= prevLongSMA && shortSMA > longSMA) {
      signals.push({ type: "buy", strength: 70 });
    } else if (prevShortSMA >= prevLongSMA && shortSMA < longSMA) {
      signals.push({ type: "sell", strength: 70 });
    } else {
      signals.push({ type: "hold", strength: 0 });
    }
  }
  return signals;
}

/**
 * استراتژی RSI
 */
export function rsiStrategy(prices: number[], period = 14, oversold = 30, overbought = 70): StrategySignal[] {
  const signals: StrategySignal[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  for (let i = 0; i < prices.length; i++) {
    if (i < period + 1) {
      signals.push({ type: "hold", strength: 0 });
      continue;
    }
    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    if (rsi < oversold) {
      signals.push({ type: "buy", strength: Math.round((oversold - rsi) * 2) });
    } else if (rsi > overbought) {
      signals.push({ type: "sell", strength: Math.round((rsi - overbought) * 2) });
    } else {
      signals.push({ type: "hold", strength: 0 });
    }
  }
  return signals;
}

/**
 * اجرای بک‌تست حرفه‌ای با محاسبه کارمزد، Slippage و Trailing Stop
 */
export function runBacktest(
  prices: number[],
  signals: StrategySignal[],
  options: BacktestOptions = {},
): BacktestResult {
  const {
    initialCapital = 100000000, // ۱۰۰ میلیون تومان
    riskPerTrade = 2,
    stopLossPct = 5,
    takeProfitPct = 10,
    maxHoldingDays = 30,
    commissionPct = 0.0004, // ۰.۰۴٪ کارمزد معاملات
    slippagePct = 0.001, // ۰.۱٪ Slippage
    positionSizing = 'fixed',
    trailingStopPct = 0,
  } = options;

  const trades: BacktestTrade[] = [];
  let capital = initialCapital;
  let inPosition = false;
  let entryPrice = 0;
  let entryIndex = 0;
  let side: "long" | "short" = "long";
  let equity: number[] = [initialCapital];
  let peakEquity = initialCapital;
  let maxDD = 0;
  let largestWin = 0;
  let largestLoss = 0;
  let currentConsecutiveWins = 0;
  let currentConsecutiveLosses = 0;
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let highestPriceInTrade = 0;
  let winStreak = 0;
  let lossStreak = 0;

  for (let i = 0; i < prices.length && i < signals.length; i++) {
    const sig = signals[i];
    const currentPrice = prices[i];

    if (!inPosition && sig.type === "buy") {
      // ورود به پوزیشن با محاسبه اندازه موقعیت
      let positionSize: number;
      if (positionSizing === 'fixed') {
        positionSize = capital * 0.1; // ۱۰٪ سرمایه در هر معامله
      } else if (positionSizing === 'percent') {
        positionSize = capital * (riskPerTrade / 100);
      } else {
        // Kelly Criterion ساده‌شده
        const winRate = trades.length > 0 ? trades.filter(t => t.pnl > 0).length / trades.length : 0.5;
        const avgWinLoss = trades.length > 0 
          ? Math.abs(trades.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnlPct, 0) / 
                     Math.max(1, trades.filter(t => t.pnl > 0).length)) /
            Math.abs(trades.filter(t => t.pnl <= 0).reduce((s, t) => s + t.pnlPct, 0) / 
                     Math.max(1, trades.filter(t => t.pnl <= 0).length))
          : 1;
        const kelly = winRate - ((1 - winRate) / avgWinLoss);
        positionSize = capital * Math.max(0, Math.min(0.25, kelly)); // حداکثر ۲۵٪
      }

      // اعمال Slippage هنگام ورود
      const entryPriceWithSlippage = entryPrice * (1 + slippagePct);
      
      entryPrice = currentPrice;
      entryIndex = i;
      side = "long";
      inPosition = true;
      highestPriceInTrade = currentPrice;
    } else if (inPosition) {
      const daysHeld = i - entryIndex;
      let exitReason: BacktestTrade["exitReason"] | null = null;
      let exitPrice = currentPrice;

      // بروزرسانی بالاترین قیمت برای Trailing Stop
      if (currentPrice > highestPriceInTrade) {
        highestPriceInTrade = currentPrice;
      }

      // Trailing Stop
      const trailingStopPrice = highestPriceInTrade * (1 - trailingStopPct / 100);
      if (trailingStopPct > 0 && currentPrice <= trailingStopPrice) {
        exitReason = "stop_loss";
        exitPrice = trailingStopPrice;
      }
      // خروج با حد ضرر معمولی
      else if (side === "long" && currentPrice <= entryPrice * (1 - stopLossPct / 100)) {
        exitReason = "stop_loss";
      }
      // خروج با حد سود
      else if (side === "long" && currentPrice >= entryPrice * (1 + takeProfitPct / 100)) {
        exitReason = "take_profit";
      }
      // خروج با سیگنال فروش
      else if (sig.type === "sell") {
        exitReason = "signal";
      }
      // خروج بعد از مهلت زمانی
      else if (daysHeld >= maxHoldingDays) {
        exitReason = "timeout";
      }

      if (exitReason) {
        // اعمال Slippage و کارمزد هنگام خروج
        const exitPriceWithSlippage = exitPrice * (1 - slippagePct);
        const grossPnlPct = side === "long"
          ? ((exitPriceWithSlippage - entryPrice * (1 + slippagePct)) / entryPrice) * 100
          : ((entryPrice * (1 - slippagePct) - exitPriceWithSlippage) / entryPrice) * 100;

        // کسر کارمزد از سود
        const commissionCost = commissionPct * 2; // خرید و فروش
        const netPnlPct = grossPnlPct - commissionCost;

        const pnl = capital * (netPnlPct / 100);
        capital += pnl;

        // بروزرسانی آمار
        if (pnl > 0) {
          currentConsecutiveWins++;
          currentConsecutiveLosses = 0;
          maxConsecutiveWins = Math.max(maxConsecutiveWins, currentConsecutiveWins);
          if (pnl > largestWin) largestWin = pnl;
          winStreak++;
        } else {
          currentConsecutiveLosses++;
          currentConsecutiveWins = 0;
          maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
          if (pnl < largestLoss) largestLoss = pnl;
          lossStreak++;
        }

        trades.push({
          entryDate: `Day ${entryIndex}`,
          exitDate: `Day ${i}`,
          entryPrice: entryPrice * (1 + slippagePct),
          exitPrice: exitPriceWithSlippage,
          side,
          pnl: Math.round(pnl),
          pnlPct: Math.round(netPnlPct * 100) / 100,
          exitReason,
        });

        inPosition = false;
      }
    }

    equity.push(capital);
    
    // محاسبه Max Drawdown به صورت لحظه‌ای
    if (capital > peakEquity) {
      peakEquity = capital;
    }
    const dd = ((peakEquity - capital) / peakEquity) * 100;
    if (dd > maxDD) maxDD = dd;
  }

  // محاسبه آمار پیشرفته
  const winTrades = trades.filter((t) => t.pnl > 0);
  const lossTrades = trades.filter((t) => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winTrades.length / trades.length) * 100 : 0;
  const totalReturn = capital - initialCapital;
  const totalReturnPct = (totalReturn / initialCapital) * 100;
  const avgWin = winTrades.length > 0 ? winTrades.reduce((s, t) => s + t.pnlPct, 0) / winTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + Math.abs(t.pnlPct), 0) / lossTrades.length : 0;

  // Profit Factor
  const grossProfit = winTrades.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(lossTrades.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Sharpe Ratio
  const returns = trades.map((t) => t.pnlPct / 100);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 1
    ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
    : 1;
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Sortino Ratio (فقط انحراف معیار بازده‌های منفی)
  const negativeReturns = returns.filter(r => r < 0);
  const downsideDev = negativeReturns.length > 0
    ? Math.sqrt(negativeReturns.reduce((s, r) => s + Math.pow(r, 2), 0) / negativeReturns.length)
    : 1;
  const sortinoRatio = downsideDev > 0 ? (avgReturn / downsideDev) * Math.sqrt(252) : 0;

  // Calmar Ratio (بازده سالانه تقسیم بر حداکثر افت سرمایه)
  const annualizedReturn = totalReturnPct * (252 / Math.max(1, trades.length));
  const calmarRatio = maxDD > 0 ? annualizedReturn / maxDD : 0;

  // Expectancy
  const expectancy = trades.length > 0 ? totalReturn / trades.length : 0;

  // Avg Holding Period
  const avgHolding = trades.length > 0
    ? trades.reduce((s, t) => {
        const entry = parseInt(t.entryDate.replace("Day ", ""));
        const exit = parseInt(t.exitDate.replace("Day ", ""));
        return s + (exit - entry);
      }, 0) / trades.length
    : 0;

  // Monthly Returns (ساده‌سازی شده)
  const monthlyReturns: { month: string; return: number }[] = [];
  if (trades.length > 0) {
    const months: Record<string, number[]> = {};
    trades.forEach((t, i) => {
      const month = `Month ${Math.floor(i / 20) + 1}`;
      if (!months[month]) months[month] = [];
      months[month].push(t.pnlPct);
    });
    Object.entries(months).forEach(([month, rets]) => {
      monthlyReturns.push({
        month,
        return: Math.round(rets.reduce((a, b) => a + b, 0) * 100) / 100,
      });
    });
  }

  return {
    trades,
    totalTrades: trades.length,
    winTrades: winTrades.length,
    lossTrades: lossTrades.length,
    winRate: Math.round(winRate * 10) / 10,
    totalReturn: Math.round(totalReturn),
    totalReturnPct: Math.round(totalReturnPct * 100) / 100,
    avgWin: Math.round(avgWin * 10) / 10,
    avgLoss: Math.round(Math.abs(avgLoss) * 10) / 10,
    maxDrawdown: Math.round(maxDD * 10) / 10,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sortinoRatio: Math.round(sortinoRatio * 100) / 100,
    calmarRatio: Math.round(calmarRatio * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    expectancy: Math.round(expectancy),
    avgHoldingPeriod: Math.round(avgHolding),
    largestWin: Math.round(largestWin),
    largestLoss: Math.round(largestLoss),
    consecutiveWins: maxConsecutiveWins,
    consecutiveLosses: maxConsecutiveLosses,
    equityCurve: equity,
    monthlyReturns,
  };
}
