/**
 * سیستم معاملات مجازی (Paper Trading)
 * معامله با پول فرضی + ردیابی عملکرد + گزارش
 */

import { getCachedInstruments } from "./clientFetch";

export interface PaperTrade {
  id: string;
  symbol: string;
  name: string;
  side: "buy" | "sell";
  entryPrice: number;
  quantity: number;
  entryDate: string;
  exitPrice?: number;
  exitDate?: string;
  pnl?: number;
  pnlPct?: number;
  status: "open" | "closed" | "stopped";
  stopLoss?: number;
  takeProfit?: number;
  notes?: string;
  signalId?: string; // اتصال به سیگنال اصلی
}

export interface PaperPortfolio {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  trades: PaperTrade[];
  createdAt: string;
  updatedAt: string;
}

export interface PaperPerformance {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winTrades: number;
  lossTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPct: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  avgHoldingPeriod: number; // days
  bestTrade: PaperTrade | null;
  worstTrade: PaperTrade | null;
  currentEquity: number;
  peakEquity: number;
}

const STORAGE_KEY = "nabz_paper_portfolio";
const INITIAL_BALANCE = 100000000; // ۱۰۰ میلیون تومان

/** دریافت یا ایجاد پرتفوی مجازی */
export function getPaperPortfolio(): PaperPortfolio {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}

  const portfolio: PaperPortfolio = {
    id: "paper-1",
    name: "پرتفوی مجازی",
    initialBalance: INITIAL_BALANCE,
    currentBalance: INITIAL_BALANCE,
    trades: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  savePaperPortfolio(portfolio);
  return portfolio;
}

/** ذخیره پرتفوی */
export function savePaperPortfolio(portfolio: PaperPortfolio): void {
  portfolio.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
}

/** باز کردن معامله جدید */
export function openPaperTrade(
  symbol: string,
  side: "buy" | "sell",
  quantity: number,
  options: {
    stopLoss?: number;
    takeProfit?: number;
    notes?: string;
    signalId?: string;
  } = {},
): PaperTrade | null {
  const portfolio = getPaperPortfolio();
  const instruments = getCachedInstruments();
  const inst = instruments.find((i) => i.symbol === symbol);

  if (!inst || inst.last <= 0) return null;

  const entryPrice = inst.last;
  const tradeValue = entryPrice * quantity;

  // بررسی موجودی کافی
  if (side === "buy" && tradeValue > portfolio.currentBalance) {
    console.warn("[PaperTrading] موجودی کافی نیست");
    return null;
  }

  const trade: PaperTrade = {
    id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    symbol,
    name: inst.name,
    side,
    entryPrice,
    quantity,
    entryDate: new Date().toISOString(),
    status: "open",
    stopLoss: options.stopLoss,
    takeProfit: options.takeProfit,
    notes: options.notes,
    signalId: options.signalId,
  };

  portfolio.trades.push(trade);
  portfolio.currentBalance -= tradeValue; // کسر از موجودی
  savePaperPortfolio(portfolio);

  console.log(`[PaperTrade] باز شد: ${side} ${quantity}× ${symbol} @ ${entryPrice}`);
  return trade;
}

/** بستن معامله */
export function closePaperTrade(
  tradeId: string,
  exitPrice?: number,
): PaperTrade | null {
  const portfolio = getPaperPortfolio();
  const trade = portfolio.trades.find((t) => t.id === tradeId);

  if (!trade || trade.status !== "open") return null;

  const instruments = getCachedInstruments();
  const inst = instruments.find((i) => i.symbol === trade.symbol);
  const price = exitPrice || inst?.last || trade.entryPrice;

  trade.exitPrice = price;
  trade.exitDate = new Date().toISOString();
  trade.status = "closed";

  // محاسبه سود/زیان
  if (trade.side === "buy") {
    trade.pnl = (price - trade.entryPrice) * trade.quantity;
    trade.pnlPct = ((price - trade.entryPrice) / trade.entryPrice) * 100;
  } else {
    trade.pnl = (trade.entryPrice - price) * trade.quantity;
    trade.pnlPct = ((trade.entryPrice - price) / trade.entryPrice) * 100;
  }

  // بازگشت پول + سود/زیان
  const tradeValue = trade.entryPrice * trade.quantity;
  portfolio.currentBalance += tradeValue + (trade.pnl || 0);

  savePaperPortfolio(portfolio);
  console.log(`[PaperTrade] بسته شد: ${trade.symbol} | P/L: ${trade.pnl?.toFixed(0)} (${trade.pnlPct?.toFixed(2)}٪)`);
  return trade;
}

/** بررسی خودکار حد ضرر/سود */
export function checkPaperTradeExits(): PaperTrade[] {
  const portfolio = getPaperPortfolio();
  const instruments = getCachedInstruments();
  const closedTrades: PaperTrade[] = [];

  for (const trade of portfolio.trades) {
    if (trade.status !== "open") continue;

    const inst = instruments.find((i) => i.symbol === trade.symbol);
    if (!inst || inst.last <= 0) continue;

    const currentPrice = inst.last;
    let shouldClose = false;

    // حد ضرر
    if (trade.stopLoss) {
      if (trade.side === "buy" && currentPrice <= trade.stopLoss) {
        shouldClose = true;
      } else if (trade.side === "sell" && currentPrice >= trade.stopLoss) {
        shouldClose = true;
      }
    }

    // حد سود
    if (trade.takeProfit) {
      if (trade.side === "buy" && currentPrice >= trade.takeProfit) {
        shouldClose = true;
      } else if (trade.side === "sell" && currentPrice <= trade.takeProfit) {
        shouldClose = true;
      }
    }

    if (shouldClose) {
      const closed = closePaperTrade(trade.id, currentPrice);
      if (closed) {
        closed.status = "stopped";
        closedTrades.push(closed);
      }
    }
  }

  return closedTrades;
}

/** محاسبه عملکرد */
export function calculatePaperPerformance(): PaperPerformance {
  const portfolio = getPaperPortfolio();
  const closedTrades = portfolio.trades.filter((t) => t.status === "closed" || t.status === "stopped");
  const openTrades = portfolio.trades.filter((t) => t.status === "open");

  const winTrades = closedTrades.filter((t) => (t.pnl || 0) > 0);
  const lossTrades = closedTrades.filter((t) => (t.pnl || 0) <= 0);

  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  const totalPnlPct = portfolio.initialBalance > 0 ? (totalPnl / portfolio.initialBalance) * 100 : 0;

  const avgWin = winTrades.length > 0 ? winTrades.reduce((s, t) => s + (t.pnlPct || 0), 0) / winTrades.length : 0;
  const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((s, t) => s + Math.abs(t.pnlPct || 0), 0) / lossTrades.length : 0;

  const grossProfit = winTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  const grossLoss = Math.abs(lossTrades.reduce((s, t) => s + (t.pnl || 0), 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Max Drawdown
  let maxDD = 0;
  let peak = portfolio.initialBalance;
  let currentEquity = portfolio.initialBalance;
  const equityCurve: number[] = [portfolio.initialBalance];

  for (const trade of closedTrades) {
    currentEquity += trade.pnl || 0;
    equityCurve.push(currentEquity);
    if (currentEquity > peak) peak = currentEquity;
    const dd = ((peak - currentEquity) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }

  // Sharpe Ratio
  const returns = closedTrades.map((t) => (t.pnlPct || 0) / 100);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdDev = returns.length > 1
    ? Math.sqrt(returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
    : 1;
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

  // Avg Holding Period
  const avgHolding = closedTrades.length > 0
    ? closedTrades.reduce((s, t) => {
        const entry = new Date(t.entryDate).getTime();
        const exit = new Date(t.exitDate || t.entryDate).getTime();
        return s + (exit - entry) / (1000 * 60 * 60 * 24);
      }, 0) / closedTrades.length
    : 0;

  // Best/Worst Trade
  const sorted = [...closedTrades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
  const bestTrade = sorted[0] || null;
  const worstTrade = sorted[sorted.length - 1] || null;

  return {
    totalTrades: portfolio.trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    winTrades: winTrades.length,
    lossTrades: lossTrades.length,
    winRate: closedTrades.length > 0 ? (winTrades.length / closedTrades.length) * 100 : 0,
    totalPnl: Math.round(totalPnl),
    totalPnlPct: Math.round(totalPnlPct * 100) / 100,
    avgWin: Math.round(avgWin * 10) / 10,
    avgLoss: Math.round(avgLoss * 10) / 10,
    profitFactor: Math.round(profitFactor * 100) / 100,
    maxDrawdown: Math.round(maxDD * 10) / 10,
    maxDrawdownPct: Math.round(maxDD * 10) / 10,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    avgHoldingPeriod: Math.round(avgHolding * 10) / 10,
    bestTrade,
    worstTrade,
    currentEquity: Math.round(currentEquity),
    peakEquity: Math.round(peak),
  };
}

/** ریست پرتفوی */
export function resetPaperPortfolio(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log("[PaperTrading] Portfolio reset");
}
