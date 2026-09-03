/**
 * سیستم تاریخچه سیگنال‌ها
 * ذخیره سیگنال‌ها + ردیابی نتیجه + اندازه‌گیری دقت
 */

import { getCachedInstruments } from "./clientFetch";
import type { CompositeSignal } from "./analysisEngines";

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
  // نتیجه واقعی (بعد از ۱ هفته پر می‌شه)
  outcome?: {
    checkedAt: string;
    exitPrice: number;
    pnlPct: number;
    hitTarget: boolean;
    hitStopLoss: boolean;
    result: "win" | "loss" | "breakeven" | "expired";
  };
}

const STORAGE_KEY = "nabz_signal_history";
const CHECK_INTERVAL_DAYS = 7; // بررسی نتیجه بعد از ۷ روز

/** دریافت تاریخچه سیگنال‌ها */
export function getSignalHistory(): SignalRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

/** ذخیره تاریخچه */
function saveSignalHistory(history: SignalRecord[]): void {
  // حفظ حداکثر ۵۰۰ سیگنال آخر
  const trimmed = history.slice(-500);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/** ذخیره سیگنال جدید از موتورهای تحلیلی */
export function recordSignal(signal: CompositeSignal): SignalRecord | null {
  if (signal.signal === "hold") return null;

  const history = getSignalHistory();

  // جلوگیری از ذخیره سیگنال تکراری (همون نماد + همون جهت در ۲۴ ساعت اخیر)
  const recentDuplicate = history.find(
    (h) =>
      h.symbol === signal.symbol &&
      h.signal === signal.signal &&
      Date.now() - new Date(h.createdAt).getTime() < 24 * 60 * 60 * 1000,
  );
  if (recentDuplicate) return null;

  const record: SignalRecord = {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    symbol: signal.symbol,
    name: signal.name,
    signal: signal.signal,
    strength: signal.strength,
    entryPrice: signal.entryPrice || 0,
    targetPrice: signal.targetPrice,
    stopLoss: signal.stopLoss,
    reasons: signal.reasons.slice(0, 5),
    compositeScore: signal.compositeScore,
    technicalScore: signal.technical.score,
    fundamentalScore: signal.fundamental.score,
    volumeScore: signal.volume.score,
    tablouKhaniScore: signal.tablouKhani.score,
    sentimentScore: signal.sentiment.score,
    createdAt: new Date().toISOString(),
  };

  history.push(record);
  saveSignalHistory(history);

  console.log(`[SignalHistory] ذخیره شد: ${record.signal} ${record.symbol} (قدرت: ${record.strength})`);
  return record;
}

/** بررسی نتیجه سیگنال‌های قدیمی */
export function checkSignalOutcomes(): SignalRecord[] {
  const history = getSignalHistory();
  const instruments = getCachedInstruments();
  const updatedRecords: SignalRecord[] = [];

  for (const record of history) {
    // فقط سیگنال‌هایی که هنوز نتیجه ندارن و ۷ روز از创建شون گذشته
    if (record.outcome) continue;

    const createdAt = new Date(record.createdAt).getTime();
    const daysSinceCreation = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);

    if (daysSinceCreation < CHECK_INTERVAL_DAYS) continue;

    const inst = instruments.find((i) => i.symbol === record.symbol);
    if (!inst || inst.last <= 0) continue;

    const currentPrice = inst.last;
    const pnlPct = record.signal === "buy"
      ? ((currentPrice - record.entryPrice) / record.entryPrice) * 100
      : ((record.entryPrice - currentPrice) / record.entryPrice) * 100;

    let hitTarget = false;
    let hitStopLoss = false;

    if (record.targetPrice) {
      hitTarget = record.signal === "buy"
        ? currentPrice >= record.targetPrice
        : currentPrice <= record.targetPrice;
    }

    if (record.stopLoss) {
      hitStopLoss = record.signal === "buy"
        ? currentPrice <= record.stopLoss
        : currentPrice >= record.stopLoss;
    }

    let result: "win" | "loss" | "breakeven" | "expired";
    if (hitTarget) result = "win";
    else if (hitStopLoss) result = "loss";
    else if (Math.abs(pnlPct) < 0.5) result = "breakeven";
    else result = pnlPct > 0 ? "win" : "loss";

    record.outcome = {
      checkedAt: new Date().toISOString(),
      exitPrice: currentPrice,
      pnlPct: Math.round(pnlPct * 100) / 100,
      hitTarget,
      hitStopLoss,
      result,
    };

    updatedRecords.push(record);
  }

  if (updatedRecords.length > 0) {
    saveSignalHistory(history);
    console.log(`[SignalHistory] ${updatedRecords.length} سیگنال بررسی شد`);
  }

  return updatedRecords;
}

/** آمار عملکرد سیگنال‌ها */
export function getSignalStats(): {
  total: number;
  checked: number;
  pending: number;
  wins: number;
  losses: number;
  winRate: number;
  avgPnl: number;
  bestSignal: SignalRecord | null;
  worstSignal: SignalRecord | null;
  byEngine: {
    technical: { correct: number; total: number };
    fundamental: { correct: number; total: number };
    volume: { correct: number; total: number };
    tablouKhani: { correct: number; total: number };
    sentiment: { correct: number; total: number };
  };
} {
  const history = getSignalHistory();
  const checked = history.filter((h) => h.outcome);
  const wins = checked.filter((h) => h.outcome?.result === "win");
  const losses = checked.filter((h) => h.outcome?.result === "loss");

  const avgPnl = checked.length > 0
    ? checked.reduce((s, h) => s + (h.outcome?.pnlPct || 0), 0) / checked.length
    : 0;

  const sorted = [...checked].sort((a, b) => (b.outcome?.pnlPct || 0) - (a.outcome?.pnlPct || 0));
  const bestSignal = sorted[0] || null;
  const worstSignal = sorted[sorted.length - 1] || null;

  // آمار هر موتور تحلیلی
  const byEngine = {
    technical: { correct: 0, total: 0 },
    fundamental: { correct: 0, total: 0 },
    volume: { correct: 0, total: 0 },
    tablouKhani: { correct: 0, total: 0 },
    sentiment: { correct: 0, total: 0 },
  };

  for (const sig of checked) {
    if (!sig.outcome) continue;
    const isWin = sig.outcome.result === "win";

    // اگه موتور در جهت درست امتیاز داده باشه
    if (sig.signal === "buy") {
      if (sig.technicalScore > 0) { byEngine.technical.total++; if (isWin) byEngine.technical.correct++; }
      if (sig.fundamentalScore > 0) { byEngine.fundamental.total++; if (isWin) byEngine.fundamental.correct++; }
      if (sig.volumeScore > 0) { byEngine.volume.total++; if (isWin) byEngine.volume.correct++; }
      if (sig.tablouKhaniScore > 0) { byEngine.tablouKhani.total++; if (isWin) byEngine.tablouKhani.correct++; }
      if (sig.sentimentScore > 0) { byEngine.sentiment.total++; if (isWin) byEngine.sentiment.correct++; }
    } else {
      if (sig.technicalScore < 0) { byEngine.technical.total++; if (isWin) byEngine.technical.correct++; }
      if (sig.fundamentalScore < 0) { byEngine.fundamental.total++; if (isWin) byEngine.fundamental.correct++; }
      if (sig.volumeScore < 0) { byEngine.volume.total++; if (isWin) byEngine.volume.correct++; }
      if (sig.tablouKhaniScore < 0) { byEngine.tablouKhani.total++; if (isWin) byEngine.tablouKhani.correct++; }
      if (sig.sentimentScore < 0) { byEngine.sentiment.total++; if (isWin) byEngine.sentiment.correct++; }
    }
  }

  return {
    total: history.length,
    checked: checked.length,
    pending: history.length - checked.length,
    wins: wins.length,
    losses: losses.length,
    winRate: checked.length > 0 ? Math.round((wins.length / checked.length) * 1000) / 10 : 0,
    avgPnl: Math.round(avgPnl * 100) / 100,
    bestSignal,
    worstSignal,
    byEngine,
  };
}

/** حذف سیگنال‌های منقضی (بیش از ۳۰ روز) */
export function cleanupExpiredSignals(): number {
  const history = getSignalHistory();
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const filtered = history.filter(
    (h) => h.outcome || new Date(h.createdAt).getTime() > thirtyDaysAgo,
  );
  const removed = history.length - filtered.length;
  if (removed > 0) saveSignalHistory(filtered);
  return removed;
}
