/**
 * موتورهای تحلیلی پیشرفته نبض بازار
 * Phase 3: Enhanced Technical, Tablou-khani, Fundamental, Options Greeks, Sentiment+Risk, Gem Hunter
 */

import type { Instrument } from "@/lib/clientFetch";
import { analyzeTablouKhaniFull } from "./tablouKhaniEngine";
import { analyzeFundamentalFull } from "./fundamentalEngine";
import {
  fetchHistoricalOHLC,
  getCachedOHLC,
  computeRSI,
  computeEMA,
  computeMACD,
  computeATR,
  computeBollingerBands,
  computeVWAP,
  computeStochastic,
  computeImpliedVolatility,
  type OHLCBar,
} from "./historicalData";

// ═══════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════

export type SignalType = "buy" | "sell" | "hold";

export interface AnalysisResult {
  signal: SignalType;
  score: number; // -100 to 100
  reasons: string[];
  details: Record<string, string | number>;
}

export interface CompositeSignal {
  symbol: string;
  name: string;
  signal: SignalType;
  strength: number; // 0 to 100
  technical: AnalysisResult;
  fundamental: AnalysisResult;
  volume: AnalysisResult;
  tablouKhani: AnalysisResult;
  sentiment: AnalysisResult;
  compositeScore: number;
  reasons: string[];
  gemScore?: number; // Gem Hunter score for treasure finding
  riskLevel?: string;
  targetPrice?: number; // Take profit target
  stopLoss?: number; // Stop loss level
  entryPrice?: number; // Entry price at signal time
  riskRewardRatio?: number; // Risk/Reward ratio
  confidence?: number; // Confidence score for AI assistant
}

// ═══════════════════════════════════════════════════════
//  Utility Functions
// ═══════════════════════════════════════════════════════

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function signalFromScore(score: number, threshold = 15): SignalType {
  return score > threshold ? "buy" : score < -threshold ? "sell" : "hold";
}

// ═══════════════════════════════════════════════════════
//  1. موتور تحلیل تکنیکال پیشرفته
//  RSI, EMA, MACD, ATR, Support/Resistance, Price Action, Trend Strength
// ═══════════════════════════════════════════════════════

export function analyzeTechnical(inst: Instrument): AnalysisResult {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  const { last, close, open, high, low, change, changePercent, yesterday } = inst;
  const prevClose = yesterday || close;
  if (prevClose <= 0 || last <= 0) {
    return { signal: "hold", score: 0, reasons: ["داده کافی نیست"], details: {} };
  }

  // ─── 1. Trend Detection & Strength ───
  const trendPct = ((last - prevClose) / prevClose) * 100;
  const trend =
    trendPct > 3 ? "strong_up" : trendPct > 1 ? "up" : trendPct < -3 ? "strong_down" : trendPct < -1 ? "down" : "flat";
  details.trend = trend;
  details.trendPercent = Math.round(trendPct * 100) / 100;

  if (trend === "strong_up") { score += 35; reasons.push("🔥 روند صعودی قوی (>" + trendPct.toFixed(1) + "%)"); }
  else if (trend === "up") { score += 18; reasons.push("📈 روند صعودی (" + trendPct.toFixed(1) + "%)"); }
  else if (trend === "strong_down") { score -= 35; reasons.push("💥 روند نزولی قوی (" + trendPct.toFixed(1) + "%)"); }
  else if (trend === "down") { score -= 18; reasons.push("📉 روند نزولی (" + trendPct.toFixed(1) + "%)"); }  // ─── 2. RSI — استفاده از داده واقعی اگر در کش موجود باشد ───
  const cachedBars = inst.rawInsCode ? getCachedOHLC(inst.rawInsCode) : null;
  let dataQuality: "real" | "estimated" = "estimated";

  if (cachedBars && cachedBars.length >= 14) {
    // Use REAL indicators from historical data
    dataQuality = "real";

    const rsi = computeRSI(cachedBars, 14);
    if (rsi !== null) {
      details.rsi = Math.round(rsi);
      if (rsi > 80) { score -= 20; reasons.push("⚠️ RSI واقعی اشباع خرید (" + Math.round(rsi) + ")"); }
      else if (rsi > 70) { score -= 10; reasons.push("RSI واقعی بالا (" + Math.round(rsi) + ") — محتاط باشید"); }
      else if (rsi < 20) { score += 20; reasons.push("✅ RSI واقعی اشباع فروش (" + Math.round(rsi) + ") — فرصت خرید"); }
      else if (rsi < 30) { score += 10; reasons.push("RSI واقعی پایین (" + Math.round(rsi) + ") — احتمال بازگشت"); }
    }

    const ema12 = computeEMA(cachedBars, 12);
    const ema26 = computeEMA(cachedBars, 26);
    if (ema12 !== null && ema26 !== null) {
      details.shortEMA = Math.round(ema12);
      details.longEMA = Math.round(ema26);
      if (ema12 > ema26 * 1.005) {
        score += 10;
        reasons.push("📈 EMA واقعی صعودی — EMA12 بالای EMA26");
      } else if (ema12 < ema26 * 0.995) {
        score -= 10;
        reasons.push("📉 EMA واقعی نزولی — EMA12 زیر EMA26");
      }
    }

    const macdResult = computeMACD(cachedBars);
    if (macdResult) {
      details.macd = Math.round(macdResult.macdLine * 100) / 100;
      details.macdSignal = Math.round(macdResult.signal * 100) / 100;
      details.macdHistogram = Math.round(macdResult.histogram * 100) / 100;
      if (macdResult.macdLine > macdResult.signal) {
        score += 8;
        reasons.push("⚡ MACD واقعی مثبت — مومنتوم صعودی");
      } else if (macdResult.macdLine < macdResult.signal) {
        score -= 8;
        reasons.push("⚡ MACD واقعی منفی — مومنتوم نزولی");
      }
    }

    const atr = computeATR(cachedBars, 14);
    if (atr !== null) {
      const atrPct = (atr / last) * 100;
      details.atr = Math.round(atr);
      details.atrPercent = Math.round(atrPct * 100) / 100;
      if (atrPct > 7) { reasons.push("🌊 نوسان بسیار بالا (ATR " + atrPct.toFixed(1) + "%) — ریسک بالا"); }
      else if (atrPct < 1.5) { reasons.push("⚓ نوسان کم (ATR " + atrPct.toFixed(1) + "%) — ثبات"); }
    }
  } else {
    // Fallback: Simulated RSI (price position based)
    if (high > low && high !== low) {
      const pricePosition = ((last - low) / (high - low)) * 100;
      details.pricePosition = Math.round(pricePosition);
      const rsi = clamp(pricePosition * 1.0 + (changePercent > 0 ? 10 : -10), 0, 100);
      details.rsi = Math.round(rsi);

      if (rsi > 80) { score -= 20; reasons.push("⚠️ RSI تقریبی اشباع خرید (" + Math.round(rsi) + ")"); }
      else if (rsi > 70) { score -= 10; reasons.push("RSI تقریبی بالا (" + Math.round(rsi) + ") — محتاط باشید"); }
      else if (rsi < 20) { score += 20; reasons.push("✅ RSI تقریبی اشباع فروش (" + Math.round(rsi) + ") — فرصت خرید"); }
      else if (rsi < 30) { score += 10; reasons.push("RSI تقریبی پایین (" + Math.round(rsi) + ") — احتمال بازگشت"); }
    }

    // Fallback: Simulated EMA
    if (open > 0 && prevClose > 0) {
      const shortEMA = (open * 0.3 + last * 0.7);
      const longEMA = prevClose;
      details.shortEMA = Math.round(shortEMA);
      details.longEMA = Math.round(longEMA);

      if (shortEMA > longEMA * 1.005 && changePercent > 0) {
        score += 10;
        reasons.push("📈 EMA تقریبی صعودی — میانگین کوتاه بالای بلند");
      } else if (shortEMA < longEMA * 0.995 && changePercent < 0) {
        score -= 10;
        reasons.push("📉 EMA تقریبی نزولی — میانگین کوتاه زیر بلند");
      }
    }

    // Fallback: Simulated MACD
    if (changePercent !== 0 && high !== low) {
      const macdLine = changePercent * 2 - (high - low) / last * 50;
      const macdSignal = changePercent;
      details.macd = Math.round(macdLine * 100) / 100;

      if (macdLine > 0 && macdLine > macdSignal) {
        score += 8;
        reasons.push("⚡ MACD تقریبی مثبت — مومنتوم صعودی");
      } else if (macdLine < 0 && macdLine < macdSignal) {
        score -= 8;
        reasons.push("⚡ MACD تقریبی منفی — مومنتوم نزولی");
      }
    }

    // Fallback: ATR from high-low
    if (high > 0 && low > 0 && last > 0) {
      const atr = high - low;
      const atrPct = (atr / last) * 100;
      details.atr = Math.round(atr);
      details.atrPercent = Math.round(atrPct * 100) / 100;

      if (atrPct > 7) { reasons.push("🌊 نوسان بسیار بالا (ATR " + atrPct.toFixed(1) + "%) — ریسک بالا"); }
      else if (atrPct < 1.5) { reasons.push("⚓ نوسان کم (ATR " + atrPct.toFixed(1) + "%) — ثبات"); }
    }
  }

  details.dataQuality = dataQuality;

  // ─── 6. Support & Resistance (based on H/L/Close) ───
  if (high > low && low > 0) {
    const pivot = (high + low + last) / 3;
    const r1 = 2 * pivot - low;
    const s1 = 2 * pivot - high;
    details.resistance = Math.round(r1);
    details.support = Math.round(s1);
    details.pivot = Math.round(pivot);

    const distToR = ((r1 - last) / last) * 100;
    const distToS = ((last - s1) / last) * 100;

    if (distToS < 1.5 && distToS >= 0) {
      score += 15;
      reasons.push("🟢 نزدیک حمایت (" + distToS.toFixed(1) + "% فاصله) — فرصت ورود");
    }
    if (distToR < 1.5 && distToR >= 0) {
      score -= 10;
      reasons.push("🔴 نزدیک مقاومت (" + distToR.toFixed(1) + "% فاصله) — احتمال اصلاح");
    }
  }

  // ─── 7. Price Action Patterns ───
  if (open > 0) {
    const bodySize = Math.abs(close - open);
    const totalRange = high - low;
    const bodyRatio = totalRange > 0 ? bodySize / totalRange : 0;
    const upperWick = high - Math.max(open, close);
    const lowerWick = Math.min(open, close) - low;
    details.bodyRatio = Math.round(bodyRatio * 100);

    // Strong bullish candle
    if (bodyRatio > 0.7 && close > open && lowerWick > upperWick * 2) {
      score += 15;
      reasons.push("🟢 کندل چکش صعودی — برگشت قیمت");
    }
    // Strong bearish candle
    else if (bodyRatio > 0.7 && close < open && upperWick > lowerWick * 2) {
      score -= 15;
      reasons.push("🔴 کندل ستاره دنباله‌دار — برگشت نزولی");
    }
    // Doji
    else if (bodyRatio < 0.15) {
      reasons.push("⚖️ کندل دوجی — عدم قطعیت بازار");
    }
    // Engulfing
    else if (bodyRatio > 0.8 && close > open && Math.abs(change) > prevClose * 0.03) {
      score += 12;
      reasons.push("🟢 الگوی پوشای صعودی");
    }
    else if (bodyRatio > 0.8 && close < open && Math.abs(change) > prevClose * 0.03) {
      score -= 12;
      reasons.push("🔴 الگوی پوشای نزولی");
    }
  }

  // ─── 8. Gap Analysis ───
  if (open > 0 && prevClose > 0) {
    const gapPct = ((open - prevClose) / prevClose) * 100;
    details.gapPercent = Math.round(gapPct * 100) / 100;
    if (gapPct > 3) { score += 10; reasons.push("🚀 گپ مثبت بازگشایی (" + gapPct.toFixed(1) + "%)"); }
    else if (gapPct < -3) { score -= 10; reasons.push("⬇️ گپ منفی بازگشایی (" + gapPct.toFixed(1) + "%)"); }
  }

  // ─── 9. Momentum ───
  if (Math.abs(changePercent) > 7) {
    const pts = changePercent > 0 ? 15 : -15;
    score += pts;
    reasons.push((pts > 0 ? "🔥" : "💥") + " مومنتوم " + (pts > 0 ? "صعودی" : "نزولی") + " شدید (>" + Math.abs(changePercent).toFixed(1) + "%)");
  }

  const clamped = clamp(score, -100, 100);
  return { signal: signalFromScore(clamped), score: clamped, reasons, details };
}

// ═══════════════════════════════════════════════════════
//  1b. موتور تکنیکال واقعی (Async — از داده تاریخی TSETMC)
//  RSI واقعی، EMA واقعی، MACD واقعی، ATR، Bollinger، Stochastic، VWAP
// ═══════════════════════════════════════════════════════

export interface TechnicalResult extends AnalysisResult {
  indicators: {
    rsi?: number;
    ema12?: number;
    ema26?: number;
    macd?: { macdLine: number; signal: number; histogram: number };
    atr?: number;
    bollinger?: { upper: number; middle: number; lower: number };
    stochastic?: { k: number; d: number };
    vwap?: number;
    atrPercent?: number;
    dataQuality: "real" | "estimated";
  };
}

/**
 * تحلیل تکنیکال واقعی با داده‌های تاریخی TSETMC
 * اگر داده تاریخی در دسترس نباشد، از تحلیل تقریبی استفاده می‌شود
 */
export async function analyzeTechnicalAsync(inst: Instrument): Promise<TechnicalResult> {
  // Get historical OHLC data from TSETMC
  let bars: OHLCBar[] = [];
  try {
    if (inst.rawInsCode) {
      bars = await fetchHistoricalOHLC(inst.rawInsCode, 60);
    }
  } catch {
    // silent — fall back to estimated
  }

  // If no historical data, fall back to sync version
  if (bars.length < 15) {
    const fallback = analyzeTechnical(inst);
    return { ...fallback, indicators: { dataQuality: "estimated" } };
  }

  // Compute real indicators from historical data
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  const { last, close, open, high, low, changePercent, yesterday } = inst;
  const prevClose = yesterday || close;

  // ─── 1. Real RSI (14) ───
  const rsi = computeRSI(bars, 14);
  let ema12Val: number | undefined;
  let ema26Val: number | undefined;
  let macdResult: { macdLine: number; signal: number; histogram: number } | undefined;
  let atrVal: number | undefined;
  let bollingerVal: { upper: number; middle: number; lower: number } | undefined;
  let stochasticVal: { k: number; d: number } | undefined;
  let vwapVal: number | undefined;

  if (rsi !== null) {
    details.rsi = Math.round(rsi * 10) / 10;
    details.rsiSource = "real-14d";

    if (rsi > 80) { score -= 20; reasons.push("⚠️ RSI اشباع خرید (" + rsi.toFixed(1) + ") — اصلاح نزولی محتمل"); }
    else if (rsi > 70) { score -= 10; reasons.push("RSI بالا (" + rsi.toFixed(1) + ") — محتاط باشید"); }
    else if (rsi < 20) { score += 20; reasons.push("✅ RSI اشباع فروش (" + rsi.toFixed(1) + ") — فرصت خرید"); }
    else if (rsi < 30) { score += 10; reasons.push("RSI پایین (" + rsi.toFixed(1) + ") — احتمال بازگشت"); }
    else if (rsi > 55) { score += 3; }
    else if (rsi < 45) { score -= 3; }
  }

  // ─── 2. Real EMA (12 & 26) ───
  const ema12 = computeEMA(bars, 12);
  const ema26 = computeEMA(bars, 26);
  if (ema12 !== null) { ema12Val = ema12; details.ema12 = Math.round(ema12); }
  if (ema26 !== null) { ema26Val = ema26; details.ema26 = Math.round(ema26); }

  if (ema12 !== null && ema26 !== null) {
    const emaDiff = ((ema12 - ema26) / ema26) * 100;
    details.emaCrossover = Math.round(emaDiff * 100) / 100;

    if (ema12 > ema26 && changePercent > 0) {
      score += 15;
      reasons.push("📈 EMA صعودی — EMA12 بالای EMA26 (" + emaDiff.toFixed(2) + "%)");
    } else if (ema12 < ema26 && changePercent < 0) {
      score -= 15;
      reasons.push("📉 EMA نزولی — EMA12 زیر EMA26 (" + emaDiff.toFixed(2) + "%)");
    }
  }

  // ─── 3. Real MACD ───
  const macd = computeMACD(bars);
  if (macd) {
    macdResult = macd;
    details.macdLine = Math.round(macd.macdLine * 100) / 100;
    details.macdSignal = Math.round(macd.signal * 100) / 100;
    details.macdHistogram = Math.round(macd.histogram * 100) / 100;
    details.macdSource = "real";

    if (macd.histogram > 0 && macd.macdLine > 0) {
      score += 12;
      reasons.push("⚡ MACD صعودی — هیستوگرام مثبت (" + macd.histogram.toFixed(2) + ")");
    } else if (macd.histogram < 0 && macd.macdLine < 0) {
      score -= 12;
      reasons.push("⚡ MACD نزولی — هیستوگرام منفی (" + macd.histogram.toFixed(2) + ")");
    } else if (macd.histogram > 0 && macd.macdLine < 0) {
      score += 5;
      reasons.push("🔄 MACD در حال بازگشت — سیگنال اولیه صعودی");
    } else if (macd.histogram < 0 && macd.macdLine > 0) {
      score -= 5;
      reasons.push("🔄 MACD در حال اصلاح — سیگنال اولیه نزولی");
    }
  }

  // ─── 4. Real ATR ───
  const atr = computeATR(bars, 14);
  if (atr !== null && last > 0) {
    atrVal = atr;
    const atrPct = (atr / last) * 100;
    details.atr = Math.round(atr);
    details.atrPercent = Math.round(atrPct * 100) / 100;
    details.atrSource = "real";

    if (atrPct > 7) { reasons.push("🌊 نوسان بسیار بالا (ATR " + atrPct.toFixed(1) + "%) — ریسک بالا"); }
    else if (atrPct < 1.5) { reasons.push("⚓ نوسان کم (ATR " + atrPct.toFixed(1) + "%) — ثبات"); }
  }

  // ─── 5. Bollinger Bands ───
  const bb = computeBollingerBands(bars, 20, 2);
  if (bb) {
    bollingerVal = bb;
    details.bbUpper = Math.round(bb.upper);
    details.bbMiddle = Math.round(bb.middle);
    details.bbLower = Math.round(bb.lower);
    details.bbSource = "real";

    if (last >= bb.upper) {
      score -= 8;
      reasons.push("🔴 قیمت بالای باند بولینگر — احتمال اصلاح");
    } else if (last <= bb.lower) {
      score += 8;
      reasons.push("🟢 قیمت زیر باند بولینگر — احتمال بازگشت");
    }

    // Band width = volatility
    const bw = ((bb.upper - bb.lower) / bb.middle) * 100;
    details.bbWidth = Math.round(bw * 100) / 100;
  }

  // ─── 6. Stochastic Oscillator ───
  const stoch = computeStochastic(bars, 14, 3);
  if (stoch) {
    stochasticVal = stoch;
    details.stochasticK = Math.round(stoch.k * 10) / 10;
    details.stochasticD = Math.round(stoch.d * 10) / 10;
    details.stochasticSource = "real";

    if (stoch.k < 20 && stoch.d < 20) {
      score += 10;
      reasons.push("✅ استوکاستیک اشباع فروش (K=" + stoch.k.toFixed(0) + ") — فرصت خرید");
    } else if (stoch.k > 80 && stoch.d > 80) {
      score -= 10;
      reasons.push("⚠️ استوکاستیک اشباع خرید (K=" + stoch.k.toFixed(0) + ")");
    }

    // Crossover
    if (stoch.k > stoch.d && stoch.k < 30) {
      score += 8;
      reasons.push("🔄 استوکاستیک کراس صعودی — سیگنال خرید");
    } else if (stoch.k < stoch.d && stoch.k > 70) {
      score -= 8;
      reasons.push("🔄 استوکاستیک کراس نزولی — سیگنال فروش");
    }
  }

  // ─── 7. Real VWAP ───
  const vwap = computeVWAP(bars.slice(-20)); // 20-day VWAP
  if (vwap !== null && last > 0) {
    vwapVal = vwap;
    details.vwap = Math.round(vwap);
    details.vwapSource = "real";

    if (last > vwap * 1.02) {
      score += 6;
      reasons.push("📈 قیمت بالای VWAP — تمایل صعودی");
    } else if (last < vwap * 0.98) {
      score -= 6;
      reasons.push("📉 قیمت زیر VWAP — تمایل نزولی");
    }
  }

  // ─── 8. Trend Detection (using real data) ───
  if (prevClose > 0 && last > 0) {
    const trendPct = ((last - prevClose) / prevClose) * 100;
    const trend = trendPct > 3 ? "strong_up" : trendPct > 1 ? "up" : trendPct < -3 ? "strong_down" : trendPct < -1 ? "down" : "flat";
    details.trend = trend;
    details.trendPercent = Math.round(trendPct * 100) / 100;

    if (trend === "strong_up") { score += 25; reasons.push("🔥 روند صعودی قوی (" + trendPct.toFixed(1) + "%)"); }
    else if (trend === "up") { score += 12; reasons.push("📈 روند صعودی (" + trendPct.toFixed(1) + "%)"); }
    else if (trend === "strong_down") { score -= 25; reasons.push("💥 روند نزولی قوی (" + trendPct.toFixed(1) + "%)"); }
    else if (trend === "down") { score -= 12; reasons.push("📉 روند نزولی (" + trendPct.toFixed(1) + "%)"); }
  }

  // ─── 9. Gap Analysis ───
  if (open > 0 && prevClose > 0) {
    const gapPct = ((open - prevClose) / prevClose) * 100;
    details.gapPercent = Math.round(gapPct * 100) / 100;
    if (gapPct > 3) { score += 8; reasons.push("🚀 گپ مثبت بازگشایی (" + gapPct.toFixed(1) + "%)"); }
    else if (gapPct < -3) { score -= 8; reasons.push("⬇️ گپ منفی بازگشایی (" + gapPct.toFixed(1) + "%)"); }
  }

  // ─── 10. Support & Resistance from historical data ───
  if (bars.length >= 20) {
    const recent = bars.slice(-20);
    const supports = recent.filter((b) => b.low < last).map((b) => b.low);
    const resistances = recent.filter((b) => b.high > last).map((b) => b.high);
    
    if (supports.length > 0) {
      const nearestSupport = Math.max(...supports);
      const distToS = ((last - nearestSupport) / last) * 100;
      details.nearestSupport = Math.round(nearestSupport);
      if (distToS < 2 && distToS >= 0) {
        score += 10;
        reasons.push("🟢 نزدیک حمایت واقعی (" + nearestSupport.toLocaleString() + " — " + distToS.toFixed(1) + "%)");
      }
    }
    if (resistances.length > 0) {
      const nearestResistance = Math.min(...resistances);
      const distToR = ((nearestResistance - last) / last) * 100;
      details.nearestResistance = Math.round(nearestResistance);
      if (distToR < 2 && distToR >= 0) {
        score -= 8;
        reasons.push("🔴 نزدیک مقاومت واقعی (" + nearestResistance.toLocaleString() + " — " + distToR.toFixed(1) + "%)");
      }
    }
  }

  const clamped = clamp(score, -100, 100);
  return {
    signal: signalFromScore(clamped),
    score: clamped,
    reasons,
    details,
    indicators: {
      rsi: rsi ?? undefined,
      ema12: ema12Val,
      ema26: ema26Val,
      macd: macdResult,
      atr: atrVal,
      bollinger: bollingerVal,
      stochastic: stochasticVal,
      vwap: vwapVal,
      atrPercent: details.atrPercent as number | undefined,
      dataQuality: bars.length >= 30 ? "real" : "real",
    },
  };
}

// ═══════════════════════════════════════════════════════
//  2. موتور تحلیل بنیادی جامع
//  P/E, EPS, ROE approx, P/B, intrinsic value, growth, sector analysis
// ═══════════════════════════════════════════════════════

export function analyzeFundamental(inst: Instrument, codalReports?: CodalReport[]): AnalysisResult {
  return analyzeFundamentalFull(inst, codalReports);
}

// Legacy stub — kept for backward compat
function _analyzeFundamentalLegacy(inst: Instrument): AnalysisResult {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  // P/E Analysis
  if (inst.pe && inst.pe > 0) {
    details.pe = inst.pe;
    if (inst.pe < 4) { score += 30; reasons.push("💎 P/E بسیار پایین (" + inst.pe.toFixed(1) + ") — ارزان‌قیمت شدید"); }
    else if (inst.pe < 8) { score += 20; reasons.push("✅ P/E پایین (" + inst.pe.toFixed(1) + ") — ارزشمند"); }
    else if (inst.pe < 15) { score += 5; reasons.push("P/E مناسب (" + inst.pe.toFixed(1) + ")"); }
    else if (inst.pe > 50) { score -= 25; reasons.push("⚠️ P/E بسیار بالا (" + inst.pe.toFixed(1) + ") — گران‌قیمت"); }
    else if (inst.pe > 30) { score -= 12; reasons.push("P/E بالا (" + inst.pe.toFixed(1) + ")"); }
  }
  // EPS
  if (inst.eps !== undefined && inst.eps !== 0) {
    details.eps = inst.eps;
    if (inst.eps > 0) { score += 12; reasons.push("💰 EPS مثبت"); }
    else { score -= 20; reasons.push("❌ EPS منفی"); }
  }
  const clamped = clamp(score, -100, 100);
  return { signal: signalFromScore(clamped, 12), score: clamped, reasons, details };
}

// ═══════════════════════════════════════════════════════
//  3. موتور تحلیل حجمی پیشرفته
//  Institutional flow, suspicious volume, VWAP, relative volume
// ═══════════════════════════════════════════════════════

export function analyzeVolume(inst: Instrument): AnalysisResult {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  const { volume, value, tradeCount, last, changePercent } = inst;

  // ─── Average Trade Size (Institutional vs Retail) ───
  if (volume > 0 && value > 0) {
    const avgTradeSize = value / volume;
    details.avgTradeSize = Math.round(avgTradeSize);

    if (avgTradeSize > 100000000) {
      score += 20;
      reasons.push("🏦 حجم متوسط معاملات بسیار بالا — حضور حقوقی/نهادی قوی");
      details.institutionalFlow = "قوی";
    } else if (avgTradeSize > 50000000) {
      score += 10;
      reasons.push("🏛️ حضور نهادی در معاملات");
      details.institutionalFlow = "متوسط";
    } else if (avgTradeSize < 5000000) {
      reasons.push("👤 معاملات خُرد — بدون حضور حقوقی");
      details.institutionalFlow = "خرد";
    }
  }

  // ─── Trade Count / Liquidity ───
  details.tradeCount = tradeCount;
  if (tradeCount > 10000) {
    score += 10;
    reasons.push("✅ نقدشوندگی عالی (" + tradeCount.toLocaleString("fa-IR") + " معامله)");
  } else if (tradeCount > 3000) {
    score += 5;
    reasons.push("نقدشوندگی خوب (" + tradeCount.toLocaleString("fa-IR") + " معامله)");
  } else if (tradeCount < 100) {
    score -= 10;
    reasons.push("⚠️ نقدشوندگی بسیار کم (" + tradeCount + " معامله)");
  }

  // ─── Volume Spike Detection ───
  if (volume > 0) {
    // Suspicious volume: high volume with small price change → accumulation/distribution
    if (volume > 2000000 && Math.abs(changePercent) < 0.5) {
      score += 12;
      reasons.push("🔍 حجم مشکوک — تغییر قیمت کم ولی حجم بالا (احتمال انباشت/توزیع)");
      details.suspiciousVolume = 1;
    }
    // Volume + Price alignment
    if (volume > 3000000 && changePercent > 2) {
      score += 15;
      reasons.push("📈 حجم بالا + رشد قیمت — تأیید روند صعودی");
    } else if (volume > 3000000 && changePercent < -2) {
      score -= 15;
      reasons.push("📉 حجم بالا + افت قیمت — هشدار نزولی");
    }
    // Weak volume move
    if (volume < 100000 && Math.abs(changePercent) > 3) {
      reasons.push("⚠️ تغییر قیمت بدون حجم — سیگنال نامعتبر");
    }
  }

  // ─── Spread / Bid-Ask Analysis ───
  if (inst.bestBuy1 && inst.bestSell1 && inst.bestBuy1 > 0 && inst.bestSell1 > 0) {
    const spread = ((inst.bestSell1 - inst.bestBuy1) / inst.bestBuy1) * 100;
    details.spread = Math.round(spread * 100) / 100;

    if (spread < 0.3) { score += 12; reasons.push("🎯 اسپرد بسیار کم (" + spread.toFixed(1) + "%) — نقدشوندگی عالی"); }
    else if (spread < 1) { score += 5; reasons.push("اسپرد مناسب (" + spread.toFixed(1) + "%)"); }
    else if (spread > 3) { score -= 12; reasons.push("⚠️ اسپرد بالا (" + spread.toFixed(1) + "%) — هزینه معاملاتی زیاد"); }
  }

  // ─── VWAP Estimate ───
  if (value > 0 && volume > 0 && volume > 0) {
    const vwap = value / volume;
    details.vwap = Math.round(vwap);
    if (last > vwap * 1.01) {
      score += 8;
      reasons.push("📈 قیمت بالای VWAP — تمایل صعودی");
    } else if (last < vwap * 0.99) {
      score -= 8;
      reasons.push("📉 قیمت زیر VWAP — تمایل نزولی");
    }
  }

  const clamped = clamp(score, -100, 100);
  return { signal: signalFromScore(clamped), score: clamped, reasons, details };
}

// ═══════════════════════════════════════════════════════
//  4. موتور تابلوخوانی پیشرفته
//  Smart money, code-to-code, bid/ask walls, imbalance
// ═══════════════════════════════════════════════════════

export function analyzeTablouKhani(inst: Instrument): AnalysisResult {
  return analyzeTablouKhaniFull(inst);
}

// Legacy stub — kept for backward compat
function _analyzeTablouKhaniLegacy(inst: Instrument): AnalysisResult {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  const { last, close, open, high, low, bestBuy1, bestBuyVol1, bestSell1, bestSellVol1, changePercent, volume, value } = inst;

  // ─── Bid/Ask Wall Analysis ───
  if (bestBuy1 && bestSell1 && bestBuy1 > 0 && bestSell1 > 0) {
    // Buy wall (large buy orders at best bid)
    if (bestBuyVol1 && bestBuyVol1 > 10000000) {
      score += 20;
      reasons.push("🟢 دیوار خرید سنگین (" + (bestBuyVol1 / 1000000).toFixed(1) + "M حجم) — پول هوشمند ورودی");
      details.smartMoney = "ورودی";
    } else if (bestBuyVol1 && bestBuyVol1 > 3000000) {
      score += 10;
      reasons.push("🟢 تقاضای قوی در سمت خرید");
      details.buyWall = "قوی";
    }

    // Sell wall (large sell orders at best ask)
    if (bestSellVol1 && bestSellVol1 > 10000000) {
      score -= 20;
      reasons.push("🔴 دیوار فروش سنگین (" + (bestSellVol1 / 1000000).toFixed(1) + "M حجم) — پول هوشمند خروجی");
      details.smartMoney = "خروجی";
    } else if (bestSellVol1 && bestSellVol1 > 3000000) {
      score -= 10;
      reasons.push("🔴 عرضه زیاد در سمت فروش");
      details.sellWall = "قوی";
    }

    // ─── Bid/Ask Imbalance (Real vs Fake orders) ───
    if (bestBuyVol1 && bestSellVol1 && (bestBuyVol1 + bestSellVol1) > 0) {
      const imbalance = (bestBuyVol1 - bestSellVol1) / (bestBuyVol1 + bestSellVol1);
      details.imbalance = Math.round(imbalance * 100);

      if (imbalance > 0.6) {
        score += 15;
        reasons.push("⚖️ عدم توازن شدید تقاضا — خریداران مسلط");
      } else if (imbalance < -0.6) {
        score -= 15;
        reasons.push("⚖️ عدم توازن شدید عرضه — فروشندگان مسلط");
      }
    }

    // ─── Price vs Bid/Ask position ───
    if (bestBuy1 > 0 && bestSell1 > 0) {
      const midPrice = (bestBuy1 + bestSell1) / 2;
      const pricePressure = ((last - midPrice) / midPrice) * 100;
      details.pricePressure = Math.round(pricePressure * 100) / 100;

      if (pricePressure > 2) {
        score += 8;
        reasons.push("📈 قیمت بالاتر از نقطه میانی — فشار خرید");
      } else if (pricePressure < -2) {
        score -= 8;
        reasons.push("📉 قیمت پایین‌تر از نقطه میانی — فشار فروش");
      }
    }
  }

  // ─── Closing Deviation (Last vs Closing) ───
  if (close > 0 && last > 0 && last !== close) {
    const diff = ((last - close) / close) * 100;
    details.closingDeviation = Math.round(diff * 100) / 100;
    if (diff > 1.5) {
      score += 8;
      reasons.push("📈 قیمت آخر بالاتر از پایانی (+ " + diff.toFixed(1) + "%) — احتمال رشد فردا");
    } else if (diff < -1.5) {
      score -= 8;
      reasons.push("📉 قیمت آخر پایین‌تر از پایانی — احتمال افت فردا");
    }
  }

  // ─── Lock Detection ( صف خرید/فروش ) ───
  if (changePercent >= 4.9 && changePercent <= 5.1) {
    score += 12; reasons.push("🔒 صف خرید (+5%)"); details.lockStatus = "صف خرید";
  } else if (changePercent <= -4.9 && changePercent >= -5.1) {
    score -= 12; reasons.push("🔒 صف فروش (-5%)"); details.lockStatus = "صف فروش";
  } else if (changePercent >= 9.5 && changePercent <= 10.1) {
    score += 18; reasons.push("🔒🔒 صف خرید محکم (+10%)"); details.lockStatus = "صف خرید محکم";
  } else if (changePercent <= -9.5 && changePercent >= -10.1) {
    score -= 18; reasons.push("🔒🔒 صف فروش محکم (-10%)"); details.lockStatus = "صف فروش محکم";
  }

  // ─── Smart Money Estimate ───
  if (volume > 0 && value > 0 && bestBuyVol1) {
    const bigOrderRatio = (bestBuyVol1 || 0) / volume;
    details.bigOrderRatio = Math.round(bigOrderRatio * 100);
    if (bigOrderRatio > 0.3 && changePercent > 0) {
      score += 10;
      reasons.push("🐋 نسبت سفارشات بزرگ بالا — احتمال ورود پول هوشمند");
      if (!details.smartMoney) details.smartMoney = "احتمال ورود";
    }
  }

  // ─── Intraday Range ───
  if (high > 0 && low > 0 && last > 0) {
    const rangePct = ((high - low) / last) * 100;
    details.intradayRange = Math.round(rangePct * 100) / 100;
    if (rangePct > 6) { reasons.push("🌊 نوسان زیاد (" + rangePct.toFixed(1) + "%) — ریسک بالا"); }
    else if (rangePct < 1) { reasons.push("⚓ ثبات قیمت (" + rangePct.toFixed(1) + "% نوسان)"); }
  }

  const clamped = clamp(score, -100, 100);
  return { signal: signalFromScore(clamped), score: clamped, reasons, details };
}

// ═══════════════════════════════════════════════════════
//  5. موتور تحلیل احساسات و ریسک
//  Fear/Greed Index, Systematic Risk, Market Psychology
// ═══════════════════════════════════════════════════════

export function analyzeSentiment(inst: Instrument): AnalysisResult {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  // ─── Fear/Greed Estimation ───
  // Based on price change, volume, and volatility
  let fearGreed = 50; // neutral

  if (inst.changePercent > 5) fearGreed += 25;
  else if (inst.changePercent > 2) fearGreed += 15;
  else if (inst.changePercent < -5) fearGreed -= 25;
  else if (inst.changePercent < -2) fearGreed -= 15;

  if (inst.volume > 3000000) fearGreed += 5; // high volume = more greed
  if (inst.volume < 100000) fearGreed -= 5; // low volume = fear/uncertainty

  fearGreed = clamp(fearGreed, 0, 100);
  details.fearGreedIndex = Math.round(fearGreed);

  if (fearGreed > 75) {
    score += 10;
    reasons.push("🤑 طمع بالا (" + Math.round(fearGreed) + "/100) — بازار صعودی");
  } else if (fearGreed > 60) {
    score += 5;
    reasons.push("📈 احساسات مثبت (" + Math.round(fearGreed) + "/100)");
  } else if (fearGreed < 25) {
    score -= 10;
    reasons.push("😱 ترس شدید (" + Math.round(fearGreed) + "/100) — بازار نزولی");
  } else if (fearGreed < 40) {
    score -= 5;
    reasons.push("😟 احساسات منفی (" + Math.round(fearGreed) + "/100)");
  }

  // ─── Risk Assessment ───
  let riskScore = 50;
  if (inst.segment === "option") riskScore += 20;
  if (Math.abs(inst.changePercent) > 7) riskScore += 15;
  if (inst.volume < 50000) riskScore += 15;
  if (inst.changePercent > 10 || inst.changePercent < -10) riskScore += 20;
  if (inst.pe && inst.pe > 0 && inst.pe < 12 && inst.volume > 300000) riskScore -= 15;
  if (inst.segment === "fund" && inst.volume > 500000) riskScore -= 10;

  riskScore = clamp(riskScore, 0, 100);
  details.riskScore = Math.round(riskScore);

  let riskLevel: string;
  if (riskScore < 30) { riskLevel = "کم"; reasons.push("🟢 ریسک کم"); }
  else if (riskScore < 55) { riskLevel = "متوسط"; reasons.push("🟡 ریسک متوسط"); }
  else if (riskScore < 75) { riskLevel = "زیاد"; reasons.push("🟠 ریسک زیاد"); }
  else { riskLevel = "بحرانی"; reasons.push("🔴 ریسک بحرانی"); }
  details.riskLevel = riskLevel;

  // ─── Leveraged Fund Warning ───
  if (inst.name.includes("اهرم")) {
    score -= 15;
    reasons.push("⚠️ صندوق اهرمی — ریسک بسیار بالا");
  }

  // ─── Option Psychology ───
  if (inst.segment === "option") {
    const isCall = inst.optionType === "call";
    if (isCall && inst.changePercent > 5) {
      score += 5;
      reasons.push("اختیار خرید با رشد قوی — احساسات صعودی");
    } else if (!isCall && inst.changePercent < -5) {
      score += 5;
      reasons.push("اختیار فروش فعال — حفاظت در برابر افت");
    }
  }

  // ─── Market-wide Sentiment Signal ───
  if (inst.changePercent > 4) {
    score += 12;
    reasons.push("🚀 رشد قوی — احساسات بازار مثبت");
  } else if (inst.changePercent < -4) {
    score -= 12;
    reasons.push("💥 افت شدید — احساسات بازار منفی");
  }

  const clamped = clamp(score, -100, 100);
  return { signal: signalFromScore(clamped, 10), score: clamped, reasons, details };
}

// ═══════════════════════════════════════════════════════
//  6. موتور تحلیل اختیار معامله
//  Black-Scholes Greeks: Δ, Γ, Θ, ν, ρ + Risk Analysis
// ═══════════════════════════════════════════════════════

// Standard normal CDF approximation
function normCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

// Standard normal PDF
function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function blackScholesGreeks(
  S: number, // spot price
  K: number, // strike
  T: number, // time to expiry in years
  r: number, // risk-free rate (annualized)
  sigma: number, // volatility (annualized)
  isCall: boolean,
): { delta: number; gamma: number; theta: number; vega: number; rho: number; intrinsic: number; timeValue: number } {
  if (T <= 0 || sigma <= 0) {
    const intrinsic = isCall ? Math.max(0, S - K) : Math.max(0, K - S);
    return { delta: isCall ? (S > K ? 1 : 0) : (S < K ? -1 : 0), gamma: 0, theta: 0, vega: 0, rho: 0, intrinsic, timeValue: 0 };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = normCDF(d1);
  const Nd2 = normCDF(d2);
  const nd1 = normPDF(d1);
  const expRT = Math.exp(-r * T);

  const intrinsic = isCall ? Math.max(0, S - K) : Math.max(0, K - S);

  let delta: number, theta: number, rho: number;

  if (isCall) {
    delta = Nd1;
    theta = (-(S * nd1 * sigma) / (2 * sqrtT) - r * K * expRT * Nd2) / 365;
    rho = (K * T * expRT * Nd2) / 100;
  } else {
    delta = Nd1 - 1;
    theta = (-(S * nd1 * sigma) / (2 * sqrtT) + r * K * expRT * normCDF(-d2)) / 365;
    rho = (-K * T * expRT * normCDF(-d2)) / 100;
  }

  const gamma = nd1 / (S * sigma * sqrtT);
  const vega = (S * nd1 * sqrtT) / 100;

  const timeValue = S * Nd1 - K * expRT * Nd2 - intrinsic;
  // Use abs for call/put
  const timeValueAbs = isCall ? Math.max(0, S * Nd1 - K * expRT * Nd2) - intrinsic : Math.max(0, K * expRT * normCDF(-d2) - S * normCDF(-d1)) - intrinsic;

  return { delta, gamma, theta, vega, rho, intrinsic, timeValue: Math.max(0, timeValueAbs) };
}

export function analyzeOptions(inst: Instrument): AnalysisResult {
  if (inst.segment !== "option") {
    return { signal: "hold", score: 0, reasons: ["فقط برای اختیار معامله"], details: {} };
  }

  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  const { last, strike, changePercent, volume } = inst;
  const isCall = inst.optionType === "call";

  // ─── Approximate spot from option ───
  const approxSpot = isCall ? last + (strike || 0) : (strike || 0) - last;

  // ─── Time to expiry estimation (from expiry field) ───
  let T = 30 / 365; // default 30 days
  if (inst.expiry) {
    try {
      const parts = inst.expiry.split("/");
      if (parts.length === 3) {
        const expDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        const now = new Date();
        T = Math.max(1 / 365, (expDate.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000));
      }
    } catch {}
  }
  details.daysToExpiry = Math.round(T * 365);

  // ─── Black-Scholes Calculation ───
  if (strike && last > 0 && approxSpot > 0) {
    const r = 0.25; // Iranian risk-free rate approx 25%
    // Compute real IV from option's market price using Newton-Raphson
    let sigma = 0.6; // fallback
    if (last > 0 && strike > 0) {
      const approxSpot = isCall ? last + strike : strike - last;
      const realIV = computeImpliedVolatility(last, approxSpot, strike, T, 0.25, isCall);
      if (realIV > 0.01 && realIV < 3.0) {
        sigma = realIV;
        details.realIV = Math.round(realIV * 100) / 100;
        details.ivSource = "computed";
      }
    }
    details.sigma = Math.round(sigma * 100) / 100;

    const greeks = blackScholesGreeks(approxSpot, strike, T, r, sigma, isCall);

    details.approxSpot = Math.round(approxSpot);
    details.bsDelta = Math.round(greeks.delta * 100) / 100;
    details.bsGamma = Math.round(greeks.gamma * 10000) / 10000;
    details.bsTheta = Math.round(greeks.theta * 100) / 100;
    details.bsVega = Math.round(greeks.vega * 100) / 100;
    details.intrinsicValue = Math.round(greeks.intrinsic);
    details.timeValue = Math.round(greeks.timeValue);

    // Delta analysis
    if (isCall) {
      if (greeks.delta > 0.7) { score += 8; reasons.push("📊 دلتای بالا (" + greeks.delta.toFixed(2) + ") — ITM، حساسیت زیاد"); }
      else if (greeks.delta < 0.3) { score -= 5; reasons.push("📊 دلتای پایین (" + greeks.delta.toFixed(2) + ") — OTM، احتمال بی‌ارزش شدن"); }
    } else {
      if (greeks.delta < -0.7) { score += 8; reasons.push("📊 دلتای پایین (" + greeks.delta.toFixed(2) + ") — ITM"); }
      else if (greeks.delta > -0.3) { score -= 5; reasons.push("📊 دلتای بالا (" + greeks.delta.toFixed(2) + ") — OTM"); }
    }

    // Theta decay warning
    if (greeks.theta < -1) {
      score -= 10;
      reasons.push("⏰ افت زمانی شدید (θ=" + greeks.theta.toFixed(2) + ") — زمان دشمن شماست");
    } else if (greeks.theta < -0.3) {
      reasons.push("⏰ افت زمانی متوسط (θ=" + greeks.theta.toFixed(2) + ")");
    }

    // Time value assessment
    if (greeks.timeValue > last * 0.6) {
      score -= 5;
      reasons.push("⚠️ ارزش زمانی بالا — قیمت گزینه سنگین است");
    }
  }

  // ─── Volume Analysis ───
  if (volume > 500000) { score += 10; reasons.push("📈 حجم معاملات بسیار بالا (" + volume.toLocaleString("fa-IR") + ")"); }
  else if (volume > 100000) { score += 5; reasons.push("حجم معاملات خوب"); }
  else if (volume < 10000) { score -= 5; reasons.push("⚠️ حجم معاملات کم — نقدشوندگی پایین"); }

  // ─── Call/Put Signal ───
  if (isCall && changePercent > 8) { score += 12; reasons.push("🚀 اختیار خرید با رشد قوی"); }
  else if (!isCall && changePercent < -8) { score += 12; reasons.push("🛡️ اختیار فروش در حال رشد — حفاظت فعال"); }
  else if (isCall && changePercent < -8) { score -= 10; reasons.push("⚠️ اختیار خرید در حال افت شدید"); }

  const clamped = clamp(score, -100, 100);
  return { signal: signalFromScore(clamped), score: clamped, reasons, details };
}

// ═══════════════════════════════════════════════════════
//  مغز تصمیم‌گیرنده (Decision Brain)
//  Weighted multi-engine consensus with dynamic risk management
// ═══════════════════════════════════════════════════════

import type { CodalReport } from "@/lib/codalFetch";

export interface DecisionBrainResult {
  finalSignal: SignalType;
  finalScore: number;
  confidence: number;
  engineWeights: Record<string, number>;
  riskLevel: "low" | "medium" | "high" | "extreme";
  reasoning: string;
  actionPlan: string;
}

export function decisionBrain(
  inst: Instrument,
  technical: AnalysisResult,
  fundamental: AnalysisResult,
  volume: AnalysisResult,
  tablouKhani: AnalysisResult,
  sentiment: AnalysisResult,
  codalReports?: CodalReport[],
): DecisionBrainResult {
  // ─── Base weights ───
  let weights = { technical: 0.25, fundamental: 0.15, volume: 0.20, tablouKhani: 0.25, sentiment: 0.15 };

  // Dynamic adjustments
  if (inst.segment === "option") {
    weights = { technical: 0.30, fundamental: 0.05, volume: 0.25, tablouKhani: 0.25, sentiment: 0.15 };
  } else if (inst.segment === "fund") {
    weights = { technical: 0.15, fundamental: 0.35, volume: 0.15, tablouKhani: 0.15, sentiment: 0.20 };
  } else if (inst.volume < 100000) {
    weights = { technical: 0.20, fundamental: 0.15, volume: 0.15, tablouKhani: 0.35, sentiment: 0.15 };
  } else if (inst.volume > 5000000) {
    weights = { technical: 0.30, fundamental: 0.15, volume: 0.25, tablouKhani: 0.20, sentiment: 0.10 };
  }

  // Codal integration
  let codalBonus = 0;
  if (codalReports && codalReports.length > 0) {
    const avgImpact = codalReports.reduce((s, r) => s + (r.impactScore || 0), 0) / codalReports.length;
    codalBonus = avgImpact * 20;
    weights.fundamental += 0.10;
  }

  // Normalize
  const totalW = Object.values(weights).reduce((s, w) => s + Math.max(0, w), 0);
  for (const k of Object.keys(weights)) {
    (weights as Record<string, number>)[k] = Math.max(0, (weights as Record<string, number>)[k]) / totalW;
  }

  // Weighted score
  const compositeScore = Math.round(
    technical.score * weights.technical +
    fundamental.score * weights.fundamental +
    volume.score * weights.volume +
    tablouKhani.score * weights.tablouKhani +
    sentiment.score * weights.sentiment +
    codalBonus
  );

  // Consensus
  const signals = [technical.signal, fundamental.signal, volume.signal, tablouKhani.signal, sentiment.signal];
  const buyCount = signals.filter((s) => s === "buy").length;
  const sellCount = signals.filter((s) => s === "sell").length;

  let confidence = 50;
  if (buyCount >= 4 || sellCount >= 4) confidence = 90;
  else if (buyCount >= 3 || sellCount >= 3) confidence = 75;
  else if (buyCount >= 2 || sellCount >= 2) confidence = 60;
  if (buyCount >= 2 && sellCount >= 2) confidence = 40;

  // Risk
  let riskLevel: DecisionBrainResult["riskLevel"] = "medium";
  if (inst.segment === "option") riskLevel = "high";
  if (Math.abs(inst.changePercent) > 5) riskLevel = "high";
  if (inst.volume < 50000) riskLevel = "high";
  if (inst.changePercent > 10 || inst.changePercent < -10) riskLevel = "extreme";
  if (inst.segment === "fund" && inst.volume > 500000) riskLevel = "low";
  if (inst.pe && inst.pe > 0 && inst.pe < 15 && inst.volume > 500000) riskLevel = "low";

  // Final signal
  let finalSignal: SignalType = "hold";
  if (compositeScore > 15 && confidence >= 55) finalSignal = "buy";
  if (compositeScore < -15 && confidence >= 55) finalSignal = "sell";
  if (compositeScore > 30 && confidence >= 70) finalSignal = "buy";
  if (compositeScore < -30 && confidence >= 70) finalSignal = "sell";
  if (buyCount === 5) finalSignal = "buy";
  if (sellCount === 5) finalSignal = "sell";

  // Reasoning
  const emoji = finalSignal === "buy" ? "🟢" : finalSignal === "sell" ? "🔴" : "🟡";
  const riskEmoji: Record<string, string> = { low: "🟢", medium: "🟡", high: "🟠", extreme: "🔴" };
  const reasoning = emoji + " سیگنال: " + (finalSignal === "buy" ? "خرید" : finalSignal === "sell" ? "فروش" : "نگهداری") + " | اطمینان: " + confidence + "% | ریسک: " + (riskEmoji[riskLevel] || "🟡") + " " + riskLevel;

  // Action plan
  const sl3 = Math.round(inst.last * 0.97);
  const sl5 = Math.round(inst.last * 0.95);
  const sl7 = Math.round(inst.last * 0.93);
  const tp7 = Math.round(inst.last * 1.07);
  const tp10 = Math.round(inst.last * 1.10);
  const tp15 = Math.round(inst.last * 1.15);

  let actionPlan = "";
  if (finalSignal === "buy" && riskLevel === "low") {
    actionPlan = "🟢 خرید با حجم کامل. حد ضرر: " + sl3.toLocaleString("fa-IR") + " ریال (-3%). حد سود: " + tp7.toLocaleString("fa-IR") + " ریال (+7%).";
  } else if (finalSignal === "buy" && riskLevel === "medium") {
    actionPlan = "🟡 خرید با حجم نصف. حد ضرر: " + sl5.toLocaleString("fa-IR") + " ریال (-5%). حد سود: " + tp10.toLocaleString("fa-IR") + " ریال (+10%).";
  } else if (finalSignal === "buy") {
    actionPlan = "🟠 خرید محتاطانه با حجم کم. حد ضرر: " + sl7.toLocaleString("fa-IR") + " ریال (-7%). حد سود: " + tp15.toLocaleString("fa-IR") + " ریال (+15%).";
  } else if (finalSignal === "sell") {
    actionPlan = "🔴 فروش/خروج. منتظر بازگشت روند باشید.";
  } else {
    actionPlan = "🟡 نگهداری. منتظر سیگنال واضح‌تر باشید.";
  }

  return {
    finalSignal,
    finalScore: clamp(compositeScore, -100, 100),
    confidence,
    engineWeights: weights,
    riskLevel,
    reasoning,
    actionPlan,
  };
}

// ═══════════════════════════════════════════════════════
//  Composite Signal + Gem Hunter
// ═══════════════════════════════════════════════════════

export function generateSignal(
  inst: Instrument,
  codalReports?: CodalReport[],
): CompositeSignal {
  const technical = analyzeTechnical(inst);
  const fundamental = analyzeFundamental(inst, codalReports);
  const volume = analyzeVolume(inst);
  const tablouKhani = analyzeTablouKhani(inst);
  const sentiment = analyzeSentiment(inst);

  const brain = decisionBrain(inst, technical, fundamental, volume, tablouKhani, sentiment, codalReports);

  // Gem Hunter Score — combines all factors for treasure detection
  let gemScore = 0;
  // Low P/E bonus
  if (inst.pe && inst.pe > 0 && inst.pe < 10) gemScore += 20;
  else if (inst.pe && inst.pe > 0 && inst.pe < 15) gemScore += 10;
  // Suspicious volume bonus
  if ((tablouKhani.details.suspiciousVolume === 1) || (volume.details.institutionalFlow === "قوی")) gemScore += 20;
  // Uptrend bonus
  if (technical.details.trend === "strong_up" || technical.details.trend === "up") gemScore += 15;
  // Strong bid
  if (tablouKhani.details.buyWall === "قوی" || tablouKhani.details.smartMoney === "ورودی") gemScore += 15;
  // Low risk
  if (sentiment.details.riskScore !== undefined && (sentiment.details.riskScore as number) < 40) gemScore += 10;
  // Good liquidity
  if (inst.tradeCount > 3000) gemScore += 10;

  const allReasons = [
    ...technical.reasons.map((r) => "📊 " + r),
    ...fundamental.reasons.map((r) => "📋 " + r),
    ...volume.reasons.map((r) => "📈 " + r),
    ...tablouKhani.reasons.map((r) => "🔍 " + r),
    ...sentiment.reasons.map((r) => "💭 " + r),
    "🧠 " + brain.reasoning,
    "📋 " + brain.actionPlan,
  ];

  // Calculate target and stop-loss based on signal and risk level
  let targetPrice: number | undefined;
  let stopLoss: number | undefined;
  let riskRewardRatio: number | undefined;
  
  if (brain.finalSignal === "buy" && inst.last > 0) {
    // Target: 7-15% based on risk level
    const targetPct = brain.riskLevel === "low" ? 0.07 : brain.riskLevel === "medium" ? 0.10 : 0.15;
    targetPrice = Math.round(inst.last * (1 + targetPct));
    // Stop-loss: 3-7% based on risk level
    const slPct = brain.riskLevel === "low" ? 0.03 : brain.riskLevel === "medium" ? 0.05 : 0.07;
    stopLoss = Math.round(inst.last * (1 - slPct));
    riskRewardRatio = Math.round((targetPct / slPct) * 10) / 10;
  } else if (brain.finalSignal === "sell" && inst.last > 0) {
    // For sell: target is lower, stop-loss is higher
    const targetPct = brain.riskLevel === "low" ? 0.05 : brain.riskLevel === "medium" ? 0.07 : 0.10;
    targetPrice = Math.round(inst.last * (1 - targetPct));
    const slPct = brain.riskLevel === "low" ? 0.03 : brain.riskLevel === "medium" ? 0.05 : 0.07;
    stopLoss = Math.round(inst.last * (1 + slPct));
    riskRewardRatio = Math.round((targetPct / slPct) * 10) / 10;
  }

  return {
    symbol: inst.symbol,
    name: inst.name,
    signal: brain.finalSignal,
    strength: Math.min(100, Math.abs(brain.finalScore)),
    technical,
    fundamental,
    volume,
    tablouKhani,
    sentiment,
    compositeScore: brain.finalScore,
    reasons: allReasons.slice(0, 12),
    gemScore: clamp(gemScore, 0, 100),
    riskLevel: brain.riskLevel,
    targetPrice,
    stopLoss,
    entryPrice: inst.last,
    riskRewardRatio,
  };
}

export function generateAllSignals(
  instruments: Instrument[],
  codalReports?: CodalReport[],
): CompositeSignal[] {
  const codalBySymbol = new Map<string, CodalReport[]>();
  if (codalReports) {
    for (const r of codalReports) {
      if (r.symbol) {
        const existing = codalBySymbol.get(r.symbol) || [];
        existing.push(r);
        codalBySymbol.set(r.symbol, existing);
      }
    }
  }

  return instruments
    .filter((i) => i.segment === "tse" || i.segment === "ifb" || i.segment === "option" || i.segment === "fund")
    .map((i) => generateSignal(i, codalBySymbol.get(i.symbol)))
    .filter((s) => s.strength > 12)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 300);
}

/**
 * نسخه Async — تحلیل تکنیکال واقعی برای ۲۰ نماد برتر
 */
export async function generateAllSignalsAsync(
  instruments: Instrument[],
  codalReports?: CodalReport[],
  topN = 250,
): Promise<CompositeSignal[]> {
  const codalBySymbol = new Map<string, CodalReport[]>();
  if (codalReports) {
    for (const r of codalReports) {
      if (r.symbol) {
        const existing = codalBySymbol.get(r.symbol) || [];
        existing.push(r);
        codalBySymbol.set(r.symbol, existing);
      }
    }
  }

  const candidates = instruments
    .filter((i) => i.segment === "tse" || i.segment === "ifb" || i.segment === "option" || i.segment === "fund")
    .filter((i) => i.volume > 50000 || Math.abs(i.changePercent) > 2 || i.tradeCount > 1000)
    .sort((a, b) => (b.volume * Math.abs(b.changePercent)) - (a.volume * Math.abs(a.changePercent)))
    .slice(0, topN);

  const asyncResults: CompositeSignal[] = [];
  const queue = [...candidates];

  async function processCandidate() {
    while (queue.length > 0) {
      const inst = queue.shift()!;
      try {
        const technical = await analyzeTechnicalAsync(inst);
        const fundamental = analyzeFundamental(inst, codalBySymbol.get(inst.symbol));
        const vol = analyzeVolume(inst);
        const tablouKhani = analyzeTablouKhani(inst);
        const sentiment = analyzeSentiment(inst);
        const brain = decisionBrain(inst, technical, fundamental, vol, tablouKhani, sentiment, codalBySymbol.get(inst.symbol));

        let gemScore = 0;
        if (inst.pe && inst.pe > 0 && inst.pe < 10) gemScore += 20;
        else if (inst.pe && inst.pe > 0 && inst.pe < 15) gemScore += 10;
        if ((tablouKhani.details.suspiciousVolume === 1) || (vol.details.institutionalFlow === "قوی")) gemScore += 20;
        if (technical.details.trend === "strong_up" || technical.details.trend === "up") gemScore += 15;
        if (tablouKhani.details.buyWall === "قوی" || tablouKhani.details.smartMoney === "ورودی") gemScore += 15;
        if (sentiment.details.riskScore !== undefined && (sentiment.details.riskScore as number) < 40) gemScore += 10;
        if (inst.tradeCount > 3000) gemScore += 10;
        if (technical.indicators?.dataQuality === "real") gemScore += 5;

        const allReasons = [
          ...technical.reasons.map((r) => "📊 " + r),
          ...fundamental.reasons.map((r) => "📋 " + r),
          ...vol.reasons.map((r) => "📈 " + r),
          ...tablouKhani.reasons.map((r) => "🔍 " + r),
          ...sentiment.reasons.map((r) => "💭 " + r),
          "🧠 " + brain.reasoning,
          "📋 " + brain.actionPlan,
        ];

        const slPct = brain.riskLevel === "low" ? 0.03 : brain.riskLevel === "medium" ? 0.05 : 0.07;
        const targetPct = brain.riskLevel === "low" ? 0.07 : brain.riskLevel === "medium" ? 0.10 : 0.15;

        asyncResults.push({
          symbol: inst.symbol,
          name: inst.name,
          signal: brain.finalSignal,
          strength: Math.min(100, Math.abs(brain.finalScore)),
          technical,
          fundamental,
          volume: vol,
          tablouKhani,
          sentiment,
          compositeScore: brain.finalScore,
          reasons: allReasons.slice(0, 12),
          gemScore: clamp(gemScore, 0, 100),
          riskLevel: brain.riskLevel,
          targetPrice: brain.finalSignal === "buy" ? Math.round(inst.last * (1 + targetPct)) : brain.finalSignal === "sell" ? Math.round(inst.last * (1 - targetPct)) : undefined,
          stopLoss: brain.finalSignal === "buy" ? Math.round(inst.last * (1 - slPct)) : brain.finalSignal === "sell" ? Math.round(inst.last * (1 + slPct)) : undefined,
          entryPrice: inst.last,
          riskRewardRatio: Math.round((targetPct / slPct) * 10) / 10,
        });
      } catch {
        asyncResults.push(generateSignal(inst, codalBySymbol.get(inst.symbol)));
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  await Promise.all([processCandidate(), processCandidate(), processCandidate(), processCandidate(), processCandidate()]);

  const asyncSymbols = new Set(asyncResults.map((s) => s.symbol));
  const syncSignals = instruments
    .filter((i) => !asyncSymbols.has(i.symbol))
    .filter((i) => i.segment === "tse" || i.segment === "ifb" || i.segment === "option" || i.segment === "fund")
    .map((i) => generateSignal(i, codalBySymbol.get(i.symbol)));

  return [...asyncResults, ...syncSignals]
    .filter((s) => s.strength > 12)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 300);
}
