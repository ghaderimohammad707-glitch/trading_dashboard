import { BacktestReport, TradeResult, OHLCV } from './types';

/**
 * معیارهای پیشرفته برای ارزیابی استراتژی معاملاتی
 * شامل شاخص‌های ریسک، پایداری و کیفیت ترید
 */

export interface AdvancedMetrics {
  // شاخص‌های اصلی
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  maxDrawdownDuration: number; // بر اساس روز
  
  // نسبت‌های ریسک-بازده
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  sterlingRatio: number;
  burkeRatio: number;
  
  // کیفیت ترید
  winRate: number;
  profitFactor: number;
  payoffRatio: number; // میانگین سود / میانگین زیان
  expectancy: number; // امید ریاضی هر ترید
  
  // آماره‌های ترید
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgTradeDuration: number; // بر اساس روز
  
  // ریسک
  volatility: number; // انحراف معیار بازده‌ها
  downsideDeviation: number;
  valueAtRisk95: number; // VaR در سطح 95%
  conditionalVaR: number; // CVaR / Expected Shortfall
  
  // پایداری
  consecutiveWins: number;
  consecutiveLosses: number;
  recoveryFactor: number;
  rSquared: number; // ضریب تعیین برای خط تعادل سرمایه
}

export interface RiskMetrics {
  var95: number;
  cvar95: number;
  maxConsecutiveLosses: number;
  worstDrawdownPeriod: {
    start: string;
    end: string;
    duration: number;
    drawdown: number;
  };
}

/**
 * محاسبه تمام معیارهای پیشرفته از گزارش بک‌تست
 */
export function calculateAdvancedMetrics(
  report: BacktestReport,
  tradingDaysPerYear: number = 252
): AdvancedMetrics {
  const { trades, equityCurve, totalReturn, maxDrawdown, sharpeRatio, sortinoRatio, profitFactor, winRate } = report;
  
  // محاسبه بازده سالانه
  const days = equityCurve.length > 0 
    ? (new Date(equityCurve[equityCurve.length - 1].date).getTime() - 
       new Date(equityCurve[0].date).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const years = days / 365;
  const annualizedReturn = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;
  
  // محاسبه بازده‌های روزانه
  const dailyReturns = equityCurve.slice(1).map((point, i) => {
    const prevValue = equityCurve[i].value;
    return (point.value - prevValue) / prevValue;
  });
  
  // نوسان‌پذیری (Volatility)
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length || 0;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(tradingDaysPerYear);
  
  // انحراف معیار نزولی (Downside Deviation)
  const negativeReturns = dailyReturns.filter(r => r < 0);
  const downsideDeviation = Math.sqrt(
    negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
  ) * Math.sqrt(tradingDaysPerYear) || 0;
  
  // Calmar Ratio = بازده سالانه / حداکثر افت سرمایه
  const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;
  
  // Sterling Ratio (با استفاده از میانگین افت‌های بزرگ)
  const avgLargeDrawdown = calculateAverageLargeDrawdowns(equityCurve);
  const sterlingRatio = avgLargeDrawdown > 0 ? annualizedReturn / avgLargeDrawdown : 0;
  
  // Burke Ratio (استفاده از جذر مجموع مربعات افت‌ها)
  const burkeRatio = calculateBurkeRatio(equityCurve, annualizedReturn);
  
  // آماره‌های ترید
  const winningTrades = trades.filter(t => t.profit > 0);
  const losingTrades = trades.filter(t => t.profit <= 0);
  
  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + t.profit, 0) / winningTrades.length 
    : 0;
  const avgLoss = losingTrades.length > 0 
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.length) 
    : 0;
  
  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map(t => t.profit)) 
    : 0;
  const largestLoss = losingTrades.length > 0 
    ? Math.min(...losingTrades.map(t => t.profit)) 
    : 0;
  
  // Payoff Ratio = میانگین سود / میانگین زیان
  const payoffRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
  
  // Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
  const lossRate = 1 - winRate;
  const expectancy = (winRate * avgWin) - (lossRate * avgLoss);
  
  // مدت زمان متوسط ترید
  const avgTradeDuration = trades.length > 0
    ? trades.reduce((sum, t) => {
        const entry = new Date(t.entryDate).getTime();
        const exit = new Date(t.exitDate).getTime();
        return sum + (exit - entry) / (1000 * 60 * 60 * 24);
      }, 0) / trades.length
    : 0;
  
  // Value at Risk (VaR) - روش تاریخی
  const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
  const varIndex = Math.floor(sortedReturns.length * 0.05); // 5th percentile
  const var95 = sortedReturns[varIndex] || 0;
  
  // Conditional VaR (Expected Shortfall) - میانگین بدترین 5%
  const worstReturns = sortedReturns.slice(0, varIndex + 1);
  const cvar95 = worstReturns.length > 0 
    ? worstReturns.reduce((a, b) => a + b, 0) / worstReturns.length 
    : 0;
  
  // بیشترین برد/باخت متوالی
  const { maxConsecutiveWins, maxConsecutiveLosses } = calculateConsecutiveStats(trades);
  
  // Recovery Factor = سود خالص / حداکثر افت سرمایه
  const netProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const recoveryFactor = maxDrawdown > 0 ? netProfit / (maxDrawdown * report.equityCurve[0]?.value || 1) : 0;
  
  // R-Squared برای منحنی سرمایه
  const rSquared = calculateRSquared(equityCurve);
  
  // حداکثر مدت افت سرمایه
  const maxDrawdownDuration = calculateMaxDrawdownDuration(equityCurve);
  
  return {
    totalReturn,
    annualizedReturn,
    maxDrawdown,
    maxDrawdownDuration,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    sterlingRatio,
    burkeRatio,
    winRate,
    profitFactor,
    payoffRatio,
    expectancy,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
    avgTradeDuration,
    volatility,
    downsideDeviation,
    valueAtRisk95: Math.abs(var95),
    conditionalVaR: Math.abs(cvar95),
    consecutiveWins: maxConsecutiveWins,
    consecutiveLosses: maxConsecutiveLosses,
    recoveryFactor,
    rSquared
  };
}

/**
 * محاسبه میانگین افت‌های بزرگ برای Sterling Ratio
 */
function calculateAverageLargeDrawdowns(equityCurve: { date: string; value: number }[]): number {
  if (equityCurve.length === 0) return 0;
  
  let maxEquity = equityCurve[0].value;
  const drawdowns: number[] = [];
  
  for (const point of equityCurve) {
    if (point.value > maxEquity) {
      maxEquity = point.value;
    }
    const drawdown = (maxEquity - point.value) / maxEquity;
    if (drawdown > 0.01) { // فقط افت‌های بیشتر از 1%
      drawdowns.push(drawdown);
    }
  }
  
  if (drawdowns.length === 0) return 0;
  
  // میانگین 5 افت بزرگ
  const sorted = drawdowns.sort((a, b) => b - a);
  const top5 = sorted.slice(0, Math.min(5, sorted.length));
  return top5.reduce((a, b) => a + b, 0) / top5.length;
}

/**
 * محاسبه Burke Ratio
 */
function calculateBurkeRatio(
  equityCurve: { date: string; value: number }[],
  annualizedReturn: number
): number {
  if (equityCurve.length === 0) return 0;
  
  let maxEquity = equityCurve[0].value;
  const squaredDrawdowns: number[] = [];
  
  for (const point of equityCurve) {
    if (point.value > maxEquity) {
      maxEquity = point.value;
    }
    const drawdown = (maxEquity - point.value) / maxEquity;
    squaredDrawdowns.push(Math.pow(drawdown, 2));
  }
  
  const sumSqrt = squaredDrawdowns.reduce((sum, dd) => sum + Math.sqrt(dd), 0);
  const denominator = sumSqrt / equityCurve.length;
  
  return denominator > 0 ? annualizedReturn / denominator : 0;
}

/**
 * محاسبه بیشترین برد/باخت متوالی
 */
function calculateConsecutiveStats(trades: TradeResult[]): {
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
} {
  let maxWins = 0;
  let maxLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  
  for (const trade of trades) {
    if (trade.profit > 0) {
      currentWins++;
      currentLosses = 0;
      maxWins = Math.max(maxWins, currentWins);
    } else {
      currentLosses++;
      currentWins = 0;
      maxLosses = Math.max(maxLosses, currentLosses);
    }
  }
  
  return { maxConsecutiveWins: maxWins, maxConsecutiveLosses: maxLosses };
}

/**
 * محاسبه R-Squared برای منحنی سرمایه
 */
function calculateRSquared(equityCurve: { date: string; value: number }[]): number {
  if (equityCurve.length < 2) return 0;
  
  const values = equityCurve.map(p => p.value);
  const n = values.length;
  
  // ایجاد خط رگرسیون ساده
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = values[i] - yMean;
    numerator += xDiff * yDiff;
    denominatorX += xDiff * xDiff;
    denominatorY += yDiff * yDiff;
  }
  
  if (denominatorX === 0 || denominatorY === 0) return 0;
  
  const r = numerator / Math.sqrt(denominatorX * denominatorY);
  return Math.pow(r, 2);
}

/**
 * محاسبه حداکثر مدت افت سرمایه
 */
function calculateMaxDrawdownDuration(equityCurve: { date: string; value: number }[]): number {
  if (equityCurve.length === 0) return 0;
  
  let maxEquity = equityCurve[0].value;
  let peakDate = new Date(equityCurve[0].date).getTime();
  let maxDuration = 0;
  let currentDuration = 0;
  
  for (const point of equityCurve) {
    const currentDate = new Date(point.date).getTime();
    
    if (point.value > maxEquity) {
      maxEquity = point.value;
      peakDate = currentDate;
      currentDuration = 0;
    } else {
      currentDuration = (currentDate - peakDate) / (1000 * 60 * 60 * 24);
      maxDuration = Math.max(maxDuration, currentDuration);
    }
  }
  
  return maxDuration;
}

/**
 * امتیاز کلی استراتژی بر اساس معیارهای مختلف
 * @returns عدد بین 0 تا 100
 */
export function calculateStrategyScore(metrics: AdvancedMetrics): number {
  let score = 0;
  let weightSum = 0;
  
  // Sharpe Ratio (وزن: 20)
  if (metrics.sharpeRatio > 0) {
    score += Math.min(metrics.sharpeRatio / 2, 1) * 20;
  }
  weightSum += 20;
  
  // Max Drawdown (وزن: 15) - کمتر بهتر است
  if (metrics.maxDrawdown < 0.5) {
    score += (1 - metrics.maxDrawdown * 2) * 15;
  }
  weightSum += 15;
  
  // Win Rate (وزن: 15)
  if (metrics.winRate > 0.3) {
    score += Math.min((metrics.winRate - 0.3) / 0.4, 1) * 15;
  }
  weightSum += 15;
  
  // Profit Factor (وزن: 15)
  if (metrics.profitFactor > 1) {
    score += Math.min((metrics.profitFactor - 1) / 1, 1) * 15;
  }
  weightSum += 15;
  
  // Recovery Factor (وزن: 10)
  if (metrics.recoveryFactor > 0) {
    score += Math.min(metrics.recoveryFactor / 3, 1) * 10;
  }
  weightSum += 10;
  
  // R-Squared (پایداری) (وزن: 10)
  score += metrics.rSquared * 10;
  weightSum += 10;
  
  // Consecutive Losses (وزن: 10) - کمتر بهتر است
  if (metrics.consecutiveLosses < 10) {
    score += (1 - metrics.consecutiveLosses / 10) * 10;
  }
  weightSum += 10;
  
  // نرمال‌سازی به مقیاس 0-100
  return Math.round((score / weightSum) * 100);
}

/**
 * تحلیل جامع ریسک استراتژی
 */
export function analyzeRisk(report: BacktestReport): RiskMetrics {
  const { trades, equityCurve } = report;
  
  // محاسبه VaR و CVaR
  const dailyReturns = equityCurve.slice(1).map((point, i) => {
    const prevValue = equityCurve[i].value;
    return (point.value - prevValue) / prevValue;
  });
  
  const sortedReturns = [...dailyReturns].sort((a, b) => a - b);
  const varIndex = Math.floor(sortedReturns.length * 0.05);
  const var95 = sortedReturns[varIndex] || 0;
  
  const worstReturns = sortedReturns.slice(0, varIndex + 1);
  const cvar95 = worstReturns.length > 0 
    ? worstReturns.reduce((a, b) => a + b, 0) / worstReturns.length 
    : 0;
  
  // بیشترین باخت متوالی
  let maxConsecutiveLosses = 0;
  let currentLosses = 0;
  
  for (const trade of trades) {
    if (trade.profit <= 0) {
      currentLosses++;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
    } else {
      currentLosses = 0;
    }
  }
  
  // بدترین دوره افت سرمایه
  let maxEquity = equityCurve[0]?.value || 0;
  let maxDrawdown = 0;
  let worstStart = '';
  let worstEnd = '';
  let currentDrawdownStart = equityCurve[0]?.date || '';
  
  for (const point of equityCurve) {
    if (point.value > maxEquity) {
      maxEquity = point.value;
    }
    const drawdown = (maxEquity - point.value) / maxEquity;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      worstStart = currentDrawdownStart;
      worstEnd = point.date;
    }
    
    if (drawdown === 0) {
      currentDrawdownStart = point.date;
    }
  }
  
  const duration = worstStart && worstEnd
    ? (new Date(worstEnd).getTime() - new Date(worstStart).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  
  return {
    var95: Math.abs(var95),
    cvar95: Math.abs(cvar95),
    maxConsecutiveLosses,
    worstDrawdownPeriod: {
      start: worstStart,
      end: worstEnd,
      duration,
      drawdown: maxDrawdown
    }
  };
}
