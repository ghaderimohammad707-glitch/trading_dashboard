/**
 * ردیابی عملکرد موتورهای تحلیلی
 * دقت در طول زمان + مقایسه سیگنال با واقعیت
 */

export interface EngineAccuracyRecord {
  date: string;
  engine: string;
  signal: "buy" | "sell";
  symbol: string;
  entryPrice: number;
  actualChange: number; // تغییر واقعی قیمت بعد از ۱/۷/۳۰ روز
  correct: boolean;
}

const STORAGE_KEY = "nabz_engine_performance";

/** دریافت تاریخچه عملکرد */
export function getEnginePerformance(): EngineAccuracyRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

/** ذخیره رکورد عملکرد */
export function recordEnginePerformance(record: EngineAccuracyRecord): void {
  const history = getEnginePerformance();
  history.push(record);
  // حفظ حداکثر ۱۰۰۰ رکورد
  const trimmed = history.slice(-1000);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/** محاسبه دقت هر موتور */
export function getEngineAccuracy(): Record<string, {
  total: number;
  correct: number;
  accuracy: number;
  avgReturn: number;
  buyAccuracy: number;
  sellAccuracy: number;
  recentTrend: "improving" | "declining" | "stable";
}> {
  const history = getEnginePerformance();
  const engines: Record<string, typeof history> = {};

  for (const record of history) {
    if (!engines[record.engine]) engines[record.engine] = [];
    engines[record.engine].push(record);
  }

  const result: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
    avgReturn: number;
    buyAccuracy: number;
    sellAccuracy: number;
    recentTrend: "improving" | "declining" | "stable";
  }> = {};

  for (const [engine, records] of Object.entries(engines)) {
    const correct = records.filter((r) => r.correct).length;
    const buyRecords = records.filter((r) => r.signal === "buy");
    const sellRecords = records.filter((r) => r.signal === "sell");

    const buyCorrect = buyRecords.filter((r) => r.correct).length;
    const sellCorrect = sellRecords.filter((r) => r.correct).length;

    const avgReturn = records.length > 0
      ? records.reduce((s, r) => s + r.actualChange, 0) / records.length
      : 0;

    // تحلیل روند اخیر
    const recent = records.slice(-20);
    const older = records.slice(-40, -20);
    const recentAcc = recent.length > 0 ? recent.filter((r) => r.correct).length / recent.length : 0;
    const olderAcc = older.length > 0 ? older.filter((r) => r.correct).length / older.length : 0;

    let recentTrend: "improving" | "declining" | "stable" = "stable";
    if (recentAcc > olderAcc + 0.05) recentTrend = "improving";
    else if (recentAcc < olderAcc - 0.05) recentTrend = "declining";

    result[engine] = {
      total: records.length,
      correct,
      accuracy: records.length > 0 ? Math.round((correct / records.length) * 1000) / 10 : 0,
      avgReturn: Math.round(avgReturn * 100) / 100,
      buyAccuracy: buyRecords.length > 0 ? Math.round((buyCorrect / buyRecords.length) * 1000) / 10 : 0,
      sellAccuracy: sellRecords.length > 0 ? Math.round((sellCorrect / sellRecords.length) * 1000) / 10 : 0,
      recentTrend,
    };
  }

  return result;
}

/** دریافت داده‌های نمودار عملکرد */
export function getPerformanceChart(days = 30): {
  labels: string[];
  datasets: Record<string, number[]>;
} {
  const history = getEnginePerformance();
  const now = Date.now();
  const labels: string[] = [];
  const datasets: Record<string, number[]> = {};

  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(now - d * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().slice(0, 10);
    labels.push(dateStr);

    const dayRecords = history.filter((r) => r.date === dateStr);

    for (const record of dayRecords) {
      if (!datasets[record.engine]) datasets[record.engine] = [];
    }
  }

  // محاسبه دقت تجمعی
  for (const engine of Object.keys(
    history.reduce((acc, r) => { acc[r.engine] = true; return acc; }, {} as Record<string, boolean>),
  )) {
    const engineRecords = history.filter((r) => r.engine === engine);
    let cumulative = 0;
    datasets[engine] = [];

    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(now - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const dayRecords = engineRecords.filter((r) => r.date === date);
      if (dayRecords.length > 0) {
        const dayCorrect = dayRecords.filter((r) => r.correct).length;
        cumulative = (cumulative * 0.9 + (dayCorrect / dayRecords.length) * 10);
      }
      datasets[engine].push(Math.round(cumulative * 10) / 10);
    }
  }

  return { labels, datasets };
}

/** پاکسازی رکوردهای قدیمی */
export function cleanupOldPerformance(days = 90): number {
  const history = getEnginePerformance();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const filtered = history.filter((r) => r.date >= cutoff);
  const removed = history.length - filtered.length;
  if (removed > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return removed;
}
