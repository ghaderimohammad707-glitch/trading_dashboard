/**
 * ردیابی عملکرد سیگنال‌ها — ثبت تاریخچه و محاسبه دقت
 */

export interface SignalOutcome {
  checkedAt: string;
  exitPrice: number;
  pnlPct: number;
  hitTarget: boolean;
  hitStopLoss: boolean;
  result: "win" | "loss" | "breakeven" | "expired" | "pending";
}

export interface SignalRecord {
  id: string;
  symbol: string;
  name: string;
  signal: "buy" | "sell" | "hold";
  strength: number;
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  reasons: string[];
  compositeScore: number;
  technicalScore: number;
  fundamentalScore: number;
  volumeScore: number;
  tablouKhaniScore: number;
  sentimentScore: number;
  createdAt: string;
  outcome?: SignalOutcome;
}

const STORAGE_KEY = "nabz_signal_performance";

export function getSignalHistory(): SignalRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSignalRecord(record: Omit<SignalRecord, "id" | "createdAt">): SignalRecord[] {
  const history = getSignalHistory();
  const newRecord: SignalRecord = {
    ...record,
    id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  // Keep last 500 records
  const merged = [newRecord, ...history].slice(0, 500);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
  return merged;
}

export function updateSignalOutcome(
  signalId: string,
  outcome: "win" | "loss" | "breakeven",
  exitPrice: number,
  notes?: string,
): SignalRecord[] {
  const history = getSignalHistory().map((r) => {
    if (r.id !== signalId) return r;
    const pnlPct = r.signal === "buy"
      ? ((exitPrice - r.entryPrice) / r.entryPrice) * 100
      : r.signal === "sell"
        ? ((r.entryPrice - exitPrice) / r.entryPrice) * 100
        : 0;
    return {
      ...r,
      outcome: {
        checkedAt: new Date().toISOString(),
        exitPrice,
        pnlPct: Math.round(pnlPct * 100) / 100,
        hitTarget: false,
        hitStopLoss: false,
        result: outcome,
      },
      notes,
    };
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
  return history;
}

export interface PerformanceStats {
  totalSignals: number;
  activeSignals: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalPnL: number;
  maxDrawdown: number;
  sharpeApprox: number;
  byEngine: {
    technical: { win: number; loss: number; accuracy: number };
    fundamental: { win: number; loss: number; accuracy: number };
    volume: { win: number; loss: number; accuracy: number };
    tablouKhani: { win: number; loss: number; accuracy: number };
    sentiment: { win: number; loss: number; accuracy: number };
  };
  recentPerformance: Array<{
    date: string;
    wins: number;
    losses: number;
    pnl: number;
  }>;
}

export function getPerformanceStats(): PerformanceStats {
  const history = getSignalHistory();
  const resolved = history.filter((h) => h.outcome && h.outcome.result !== "expired" && h.outcome.result !== "pending");

  const winCount = resolved.filter((h) => h.outcome?.result === "win").length;
  const lossCount = resolved.filter((h) => h.outcome?.result === "loss").length;
  const total = winCount + lossCount;
  const winRate = total > 0 ? (winCount / total) * 100 : 0;

  const wins = resolved.filter((h) => h.outcome?.result === "win");
  const losses = resolved.filter((h) => h.outcome?.result === "loss");

  const avgWin = wins.length > 0
    ? wins.reduce((sum, h) => sum + (h.outcome?.pnlPct || 0), 0) / wins.length
    : 0;
  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((sum, h) => sum + (h.outcome?.pnlPct || 0), 0) / losses.length)
    : 0;

  const totalWinAmount = wins.reduce((sum, h) => sum + (h.outcome?.pnlPct || 0), 0);
  const totalLossAmount = Math.abs(losses.reduce((sum, h) => sum + (h.outcome?.pnlPct || 0), 0));
  const profitFactor = totalLossAmount > 0 ? totalWinAmount / totalLossAmount : totalWinAmount > 0 ? 999 : 0;

  const totalPnL = resolved.reduce((sum, h) => sum + (h.outcome?.pnlPct || 0), 0);

  // Max drawdown
  let peak = 0;
  let maxDD = 0;
  let cumPnL = 0;
  for (const r of [...resolved].reverse()) {
    cumPnL += r.outcome?.pnlPct || 0;
    if (cumPnL > peak) peak = cumPnL;
    const dd = peak - cumPnL;
    if (dd > maxDD) maxDD = dd;
  }

  // Per-engine accuracy
  const engineStats = (engine: "technical" | "fundamental" | "volume" | "tablouKhani" | "sentiment") => {
    const positive = resolved.filter((h) => {
      const score = engine === "technical" ? h.technicalScore :
                    engine === "fundamental" ? h.fundamentalScore :
                    engine === "volume" ? h.volumeScore :
                    engine === "tablouKhani" ? h.tablouKhaniScore :
                    h.sentimentScore;
      return (h.signal === "buy" && score > 0) || (h.signal === "sell" && score < 0);
    });
    const wins = positive.filter((h) => h.outcome?.result === "win").length;
    const total = positive.length;
    return { win: wins, loss: total - wins, accuracy: total > 0 ? Math.round((wins / total) * 100) : 0 };
  };

  // Recent 7 days performance
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const recentPerformance: PerformanceStats["recentPerformance"] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = now - (i + 1) * dayMs;
    const dayEnd = now - i * dayMs;
    const dayRecords = resolved.filter((h) => {
      const createdAt = new Date(h.createdAt).getTime();
      return createdAt >= dayStart && createdAt < dayEnd;
    });
    recentPerformance.push({
      date: new Date(dayEnd).toLocaleDateString("fa-IR"),
      wins: dayRecords.filter((h) => h.outcome?.result === "win").length,
      losses: dayRecords.filter((h) => h.outcome?.result === "loss").length,
      pnl: dayRecords.reduce((sum, h) => sum + (h.outcome?.pnlPct || 0), 0),
    });
  }

  return {
    totalSignals: history.length,
    activeSignals: history.filter((h) => !h.outcome || h.outcome.result === "pending").length,
    winCount,
    lossCount,
    winRate: Math.round(winRate * 10) / 10,
    avgWin: Math.round(avgWin * 10) / 10,
    avgLoss: Math.round(avgLoss * 10) / 10,
    profitFactor: Math.round(profitFactor * 100) / 100,
    totalPnL: Math.round(totalPnL * 10) / 10,
    maxDrawdown: Math.round(maxDD * 10) / 10,
    sharpeApprox: avgLoss > 0 ? Math.round((avgWin / avgLoss) * 100) / 100 : 0,
    byEngine: {
      technical: engineStats("technical"),
      fundamental: engineStats("fundamental"),
      volume: engineStats("volume"),
      tablouKhani: engineStats("tablouKhani"),
      sentiment: engineStats("sentiment"),
    },
    recentPerformance,
  };
}

/**
 * پاک کردن تاریخچه قدیمی (بیش از 30 روز)
 */
export function cleanupOldRecords(): void {
  const history = getSignalHistory();
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const cleaned = history.filter((h) => {
    const createdAt = new Date(h.createdAt).getTime();
    return createdAt > cutoff || !h.outcome || h.outcome.result === "pending";
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {}
}
