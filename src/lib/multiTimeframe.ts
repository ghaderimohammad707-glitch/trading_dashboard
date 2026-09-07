/**
 * تحلیل چند تایم‌فریم + اعتبارسنجی سیگنال — نسخه واقعی
 * ترکیب سیگنال‌های روزانه/هفتگی/ماهانه از داده‌های تاریخی OHLC
 */

import type { Instrument } from "./clientFetch";
import { analyzeTechnical, analyzeVolume, analyzeTablouKhani } from "./analysisEngines";
import { fetchHistoricalOHLC, type OHLCBar, computeRSI, computeEMA, computeMACD } from "./historicalData";

export type Timeframe = "daily" | "weekly" | "monthly";

export interface TimeframeSignal {
  timeframe: Timeframe;
  signal: "buy" | "sell" | "hold";
  strength: number;
  reasons: string[];
  dataQuality: "real" | "estimated";
  indicators?: {
    rsi?: number;
    ema?: number;
    macd?: { macdLine: number; signal: number; histogram: number };
    trend?: string;
  };
}

export interface MultiTimeframeResult {
  symbol: string;
  signals: TimeframeSignal[];
  consensus: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  confidence: number;
  alignedTimeframes: number;
  totalReasons: string[];
  dataQuality: "real" | "estimated";
}

/**
 * تبدیل داده روزانه OHLC به هفتگی
 */
function aggregateWeekly(bars: OHLCBar[]): OHLCBar[] {
  if (bars.length === 0) return [];
  const weekly: OHLCBar[] = [];
  let weekStart = 0;

  for (let i = 1; i <= bars.length; i++) {
    const isNewWeek = i === bars.length || 
      (bars[i] && bars[i].date.substring(0, 6) !== bars[weekStart].date.substring(0, 6));
    
    if (isNewWeek) {
      const slice = bars.slice(weekStart, i);
      if (slice.length > 0) {
        weekly.push({
          date: slice[0].date,
          open: slice[0].open,
          high: Math.max(...slice.map(b => b.high)),
          low: Math.min(...slice.map(b => b.low)),
          close: slice[slice.length - 1].close,
          volume: slice.reduce((s, b) => s + b.volume, 0),
          value: slice.reduce((s, b) => s + b.value, 0),
          tradeCount: slice.reduce((s, b) => s + b.tradeCount, 0),
        });
      }
      weekStart = i;
    }
  }
  return weekly;
}

/**
 * تبدیل داده روزانه OHLC به ماهانه
 */
function aggregateMonthly(bars: OHLCBar[]): OHLCBar[] {
  if (bars.length === 0) return [];
  const monthly: OHLCBar[] = [];
  let monthStart = 0;

  for (let i = 1; i <= bars.length; i++) {
    const isNewMonth = i === bars.length ||
      (bars[i] && bars[i].date.substring(0, 6) !== bars[monthStart].date.substring(0, 6));
    
    if (isNewMonth) {
      const slice = bars.slice(monthStart, i);
      if (slice.length > 0) {
        monthly.push({
          date: slice[0].date,
          open: slice[0].open,
          high: Math.max(...slice.map(b => b.high)),
          low: Math.min(...slice.map(b => b.low)),
          close: slice[slice.length - 1].close,
          volume: slice.reduce((s, b) => s + b.volume, 0),
          value: slice.reduce((s, b) => s + b.value, 0),
          tradeCount: slice.reduce((s, b) => s + b.tradeCount, 0),
        });
      }
      monthStart = i;
    }
  }
  return monthly;
}

/**
 * تحلیل یک تایم‌فریم خاص با داده واقعی
 */
async function analyzeTimeframeWithData(
  inst: Instrument,
  timeframe: Timeframe,
): Promise<TimeframeSignal> {
  const reasons: string[] = [];
  let score = 0;
  const indicators: TimeframeSignal["indicators"] = {};
  let dataQuality: "real" | "estimated" = "estimated";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insCode = (inst as any).rawInsCode as string | undefined;

  if (insCode) {
    try {
      const allBars = await fetchHistoricalOHLC(insCode, timeframe === "monthly" ? 180 : timeframe === "weekly" ? 90 : 60);
      if (allBars.length >= 10) {
        dataQuality = "real";

        // Aggregate bars based on timeframe
        let bars: OHLCBar[];
        if (timeframe === "daily") {
          bars = allBars.slice(-60);
        } else if (timeframe === "weekly") {
          bars = aggregateWeekly(allBars);
        } else {
          bars = aggregateMonthly(allBars);
        }

        if (bars.length >= 5) {
          // Real RSI
          const period = timeframe === "monthly" ? 10 : timeframe === "weekly" ? 12 : 14;
          const rsi = computeRSI(bars, period);
          if (rsi !== null) {
            indicators.rsi = rsi;
            if (rsi < 30) {
              score += 20;
              reasons.push(`RSI اشباع فروش (${rsi.toFixed(1)})`);
            } else if (rsi < 40) {
              score += 10;
              reasons.push(`RSI نزدیک ناحیه اشباع (${rsi.toFixed(1)})`);
            } else if (rsi > 70) {
              score -= 20;
              reasons.push(`RSI اشباع خرید (${rsi.toFixed(1)})`);
            } else if (rsi > 60) {
              score -= 10;
              reasons.push(`RSI بالا (${rsi.toFixed(1)})`);
            }
          }

          // Real EMA
          const emaPeriod = timeframe === "monthly" ? 5 : timeframe === "weekly" ? 8 : 12;
          const ema = computeEMA(bars, emaPeriod);
          if (ema !== null && bars.length > 0) {
            indicators.ema = ema;
            const lastClose = bars[bars.length - 1].close;
            const emaDistance = ((lastClose - ema) / ema) * 100;

            if (emaDistance > 3) {
              score += 15;
              reasons.push(`قیمت بالای EMA${emaPeriod} (+${emaDistance.toFixed(1)}%)`);
            } else if (emaDistance > 0) {
              score += 5;
              reasons.push(`قیمت نزدیک بالای EMA${emaPeriod}`);
            } else if (emaDistance < -3) {
              score -= 15;
              reasons.push(`قیمت زیر EMA${emaPeriod} (${emaDistance.toFixed(1)}%)`);
            } else if (emaDistance < 0) {
              score -= 5;
              reasons.push(`قیمت نزدیک زیر EMA${emaPeriod}`);
            }
          }

          // Real MACD (for daily timeframe)
          if (timeframe === "daily" && bars.length >= 35) {
            const macd = computeMACD(bars);
            if (macd) {
              indicators.macd = macd;
              if (macd.histogram > 0 && macd.macdLine > macd.signal) {
                score += 15;
                reasons.push("MACD صعودی — تقاطع مثبت");
              } else if (macd.histogram < 0 && macd.macdLine < macd.signal) {
                score -= 15;
                reasons.push("MACD نزولی — تقاطع منفی");
              } else if (macd.histogram > 0) {
                score += 5;
                reasons.push("MACD در حال رشد");
              } else {
                score -= 5;
                reasons.push("MACD در حال افت");
              }
            }
          }

          // Price trend from actual data
          if (bars.length >= 5) {
            const recentClose = bars[bars.length - 1].close;
            const fiveBarBack = bars[Math.max(0, bars.length - 5)].close;
            const trendPct = ((recentClose - fiveBarBack) / fiveBarBack) * 100;

            if (trendPct > 5) {
              indicators.trend = "strong_up";
              score += 10;
              reasons.push(`📈 روند صعودی قوی (+${trendPct.toFixed(1)}%)`);
            } else if (trendPct > 1) {
              indicators.trend = "up";
              score += 5;
              reasons.push(`📈 روند صعودی (+${trendPct.toFixed(1)}%)`);
            } else if (trendPct < -5) {
              indicators.trend = "strong_down";
              score -= 10;
              reasons.push(`📉 روند نزولی قوی (${trendPct.toFixed(1)}%)`);
            } else if (trendPct < -1) {
              indicators.trend = "down";
              score -= 5;
              reasons.push(`📉 روند نزولی (${trendPct.toFixed(1)}%)`);
            } else {
              indicators.trend = "sideways";
              reasons.push("↔️ روند خنثی");
            }
          }
        }
      }
    } catch {
      // Fallback to sync analysis below
    }
  }

  // Fallback: sync analysis if no real data
  if (dataQuality === "estimated") {
    const technical = analyzeTechnical(inst);
    const volume = analyzeVolume(inst);
    const tablouKhani = analyzeTablouKhani(inst);

    const weights = {
      daily: { technical: 0.4, volume: 0.3, tablou: 0.3 },
      weekly: { technical: 0.5, volume: 0.25, tablou: 0.25 },
      monthly: { technical: 0.6, volume: 0.2, tablou: 0.2 },
    };
    const w = weights[timeframe];
    score = technical.score * w.technical + volume.score * w.volume + tablouKhani.score * w.tablou;

    reasons.push(...technical.reasons.slice(0, 2));
    if (timeframe !== "monthly") reasons.push(...volume.reasons.slice(0, 1));
  }

  const clamped = Math.max(-100, Math.min(100, Math.round(score)));
  const signal = clamped > 15 ? "buy" : clamped < -15 ? "sell" : "hold";

  return {
    timeframe,
    signal,
    strength: Math.abs(clamped),
    reasons,
    dataQuality,
    indicators,
  };
}

/**
 * تحلیل چند تایم‌فریم — نسخه async با داده واقعی
 */
export async function analyzeMultiTimeframeAsync(
  inst: Instrument,
): Promise<MultiTimeframeResult> {
  const [daily, weekly, monthly] = await Promise.all([
    analyzeTimeframeWithData(inst, "daily"),
    analyzeTimeframeWithData(inst, "weekly"),
    analyzeTimeframeWithData(inst, "monthly"),
  ]);

  const signals = [daily, weekly, monthly];
  const buyCount = signals.filter((s) => s.signal === "buy").length;
  const sellCount = signals.filter((s) => s.signal === "sell").length;

  let consensus: MultiTimeframeResult["consensus"];
  let confidence = 0;

  if (buyCount === 3) { consensus = "strong_buy"; confidence = 95; }
  else if (buyCount === 2) { consensus = "buy"; confidence = 75; }
  else if (sellCount === 3) { consensus = "strong_sell"; confidence = 95; }
  else if (sellCount === 2) { consensus = "sell"; confidence = 75; }
  else { consensus = "hold"; confidence = 50; }

  const avgStrength = signals.reduce((s, sig) => s + sig.strength, 0) / 3;
  confidence = Math.round(confidence * (avgStrength / 100));

  // Boost confidence if data is real
  const hasRealData = signals.some((s) => s.dataQuality === "real");
  if (hasRealData) confidence = Math.min(100, confidence + 10);

  const totalReasons = [
    ...daily.reasons.map((r) => `📅 روزانه: ${r}`),
    ...weekly.reasons.map((r) => `📆 هفتگی: ${r}`),
    ...monthly.reasons.map((r) => `🗓️ ماهانه: ${r}`),
  ];

  const overallQuality = signals.every((s) => s.dataQuality === "real")
    ? "real" as const
    : "estimated" as const;

  return {
    symbol: inst.symbol,
    signals,
    consensus,
    confidence: Math.min(100, Math.max(0, confidence)),
    alignedTimeframes: Math.max(buyCount, sellCount),
    totalReasons,
    dataQuality: overallQuality,
  };
}

/**
 * تحلیل چند تایم‌فریم — نسخه sync (legacy)
 */
export function analyzeMultiTimeframe(inst: Instrument): MultiTimeframeResult {
  const reasons: string[] = [];
  const technical = analyzeTechnical(inst);
  const volume = analyzeVolume(inst);
  const tablouKhani = analyzeTablouKhani(inst);

  // Run sync analysis with different weights for each "timeframe"
  const dailyScore = technical.score * 0.4 + volume.score * 0.3 + tablouKhani.score * 0.3;
  const weeklyScore = technical.score * 0.5 + volume.score * 0.25 + tablouKhani.score * 0.25;
  const monthlyScore = technical.score * 0.6 + volume.score * 0.2 + tablouKhani.score * 0.2;

  const makeSignal = (timeframe: Timeframe, score: number): TimeframeSignal => {
    const tfReasons: string[] = [];
    if (timeframe === "daily") {
      tfReasons.push(...technical.reasons.slice(0, 3));
      tfReasons.push(...volume.reasons.slice(0, 2));
    } else if (timeframe === "weekly") {
      if (inst.changePercent > 0) tfReasons.push("📈 روند مثبت هفتگی");
      else if (inst.changePercent < 0) tfReasons.push("📉 روند منفی هفتگی");
    } else {
      if (inst.pe && inst.pe > 0 && inst.pe < 15) tfReasons.push("💎 ارزشمند بلندمدت");
    }

    const clamped = Math.max(-100, Math.min(100, Math.round(score)));
    return {
      timeframe,
      signal: clamped > 15 ? "buy" : clamped < -15 ? "sell" : "hold",
      strength: Math.abs(clamped),
      reasons: tfReasons,
      dataQuality: "estimated" as const,
    };
  };

  const daily = makeSignal("daily", dailyScore);
  const weekly = makeSignal("weekly", weeklyScore);
  const monthly = makeSignal("monthly", monthlyScore);

  const signals = [daily, weekly, monthly];
  const buyCount = signals.filter((s) => s.signal === "buy").length;
  const sellCount = signals.filter((s) => s.signal === "sell").length;

  let consensus: MultiTimeframeResult["consensus"];
  let confidence = 0;

  if (buyCount === 3) { consensus = "strong_buy"; confidence = 95; }
  else if (buyCount === 2) { consensus = "buy"; confidence = 75; }
  else if (sellCount === 3) { consensus = "strong_sell"; confidence = 95; }
  else if (sellCount === 2) { consensus = "sell"; confidence = 75; }
  else { consensus = "hold"; confidence = 50; }

  const avgStrength = signals.reduce((s, sig) => s + sig.strength, 0) / 3;
  confidence = Math.round(confidence * (avgStrength / 100));

  const totalReasons = [
    ...daily.reasons.map((r) => `📅 روزانه: ${r}`),
    ...weekly.reasons.map((r) => `📆 هفتگی: ${r}`),
    ...monthly.reasons.map((r) => `🗓️ ماهانه: ${r}`),
  ];

  return {
    symbol: inst.symbol,
    signals,
    consensus,
    confidence: Math.min(100, Math.max(0, confidence)),
    alignedTimeframes: Math.max(buyCount, sellCount),
    totalReasons,
    dataQuality: "estimated",
  };
}

/**
 * فیلتر سیگنال‌ها — حذف سیگنال‌های ضعیف
 */
export function validateSignals(
  signals: Array<{
    symbol: string;
    signal: "buy" | "sell";
    strength: number;
    compositeScore: number;
    technicalScore: number;
    volumeScore: number;
    tablouKhaniScore: number;
  }>,
  instruments: Instrument[],
): Array<{
  symbol: string;
  signal: "buy" | "sell";
  strength: number;
  validationScore: number;
  isValid: boolean;
  reasons: string[];
}> {
  return signals.map((sig) => {
    const inst = instruments.find((i) => i.symbol === sig.symbol);
    const reasons: string[] = [];
    let validationScore = 0;

    // فیلتر ۱: حداقل قدرت
    if (sig.strength < 20) {
      reasons.push("⚠️ قدرت سیگنال پایین");
      validationScore -= 20;
    }

    // فیلتر ۲: هم‌جهتی موتورها
    const engineScores = [sig.technicalScore, sig.volumeScore, sig.tablouKhaniScore];
    const sameDirection = engineScores.every((s) => (sig.signal === "buy" ? s > 0 : s < 0));
    if (sameDirection) {
      validationScore += 15;
      reasons.push("✅ تمام موتورها هم‌جهت");
    } else {
      const opposingCount = engineScores.filter((s) => (sig.signal === "buy" ? s < 0 : s > 0)).length;
      if (opposingCount >= 2) {
        validationScore -= 25;
        reasons.push("❌ بیش از ۲ موتور مخالف");
      }
    }

    // فیلتر ۳: حجم مشکوک
    if (inst && inst.volume > 3000000 && Math.abs(inst.changePercent) < 1) {
      validationScore += 10;
      reasons.push("🔍 حجم مشکوک — تأیید");
    }

    // فیلتر ۴: نزدیک حمایت/مقاومت
    if (inst && inst.bestBuy1 && inst.bestSell1) {
      const mid = (inst.bestBuy1 + inst.bestSell1) / 2;
      const distPct = Math.abs((inst.last - mid) / mid) * 100;
      if (distPct < 1) {
        validationScore += 5;
        reasons.push("📍 نزدیک نقطه تعادل");
      }
    }

    // فیلتر ۵: P/E مناسب
    if (sig.signal === "buy" && inst?.pe && inst.pe > 0 && inst.pe < 15) {
      validationScore += 10;
      reasons.push("💎 P/E مناسب");
    }

    const totalScore = sig.strength + validationScore;
    const isValid = totalScore >= 30 && reasons.filter((r) => r.startsWith("❌")).length === 0;

    return {
      symbol: sig.symbol,
      signal: sig.signal,
      strength: sig.strength,
      validationScore: totalScore,
      isValid,
      reasons,
    };
  });
}
