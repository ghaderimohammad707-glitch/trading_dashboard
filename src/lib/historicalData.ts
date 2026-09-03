/**
 * سیستم دریافت و کش داده‌های تاریخی OHLC
 * از TSETMC CDN API از طریق Vite Proxy (بدون CORS)
 *
 * بهینه‌سازی شده:
 * - درخواست از /tsetmc-history (پروکسی Vite)
 * - صف درخواست (max 1 concurrent, 700ms delay)
 * - کش با اعتبارسنجی تاریخ آخرین کندل
 * - برچسب stale برای داده قدیمی
 */

import { enqueueRequest } from "./requestQueue";

export interface OHLCBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
  tradeCount: number;
}

export interface OHLCResult {
  bars: OHLCBar[];
  stale: boolean; // آیا داده از کش قدیمی آمده؟
}

// ═══════════════════════════════════════════════════════
//  In-memory cache
// ═══════════════════════════════════════════════════════
const _memCache = new Map<string, { bars: OHLCBar[]; ts: number; stale: boolean }>();
const MEM_TTL = 30 * 60 * 1000; // 30 min

// ═══════════════════════════════════════════════════════
//  localStorage cache
// ═══════════════════════════════════════════════════════
const LS_PREFIX = "nabz_ohlc_";
const LS_TTL = 5 * 60 * 1000; // 5 min

interface LSCacheEntry {
  bars: OHLCBar[];
  ts: number;
  lastCandleDate: string; // YYYYMMDD
}

function loadFromLS(insCode: string): LSCacheEntry | null {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${insCode}`);
    if (!raw) return null;
    return JSON.parse(raw) as LSCacheEntry;
  } catch {
    return null;
  }
}

function saveToLS(insCode: string, entry: LSCacheEntry): void {
  try {
    localStorage.setItem(`${LS_PREFIX}${insCode}`, JSON.stringify(entry));
  } catch {
    // localStorage full — clear oldest
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX));
      const oldest = keys.sort()[0];
      if (oldest) localStorage.removeItem(oldest);
    } catch {}
  }
}

// ═══════════════════════════════════════════════════════
//  Trading day validation
// ═══════════════════════════════════════════════════════

/**
 * آیا تاریخ داده شده آخرین روز معاملاتی است؟
 * بازار ایران: شنبه تا چهارشنبه
 * بررسی می‌کنیم آیا آخرین کندل ظرف ۲ روز گذشته بوده
 */
function isLastCandleFresh(lastCandleDate: string): boolean {
  if (!lastCandleDate) return false;

  // Parse YYYYMMDD
  const year = parseInt(lastCandleDate.slice(0, 4), 10);
  const month = parseInt(lastCandleDate.slice(4, 6), 10) - 1;
  const day = parseInt(lastCandleDate.slice(6, 8), 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;

  const lastDate = new Date(year, month, day);
  const now = new Date();

  // Check if last candle is within 2 calendar days
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Fresh if less than 2 days old (accounts for weekends/holidays)
  return diffDays < 2;
}

// ═══════════════════════════════════════════════════════
//  Public API
// ═══════════════════════════════════════════════════════

/**
 * دریافت از کش (sync — بدون fetch)
 */
export function getCachedOHLC(insCode: string): OHLCBar[] | null {
  const mem = _memCache.get(insCode);
  if (mem && mem.bars.length > 0) return mem.bars;

  const ls = loadFromLS(insCode);
  if (ls && ls.bars.length > 0) {
    _memCache.set(insCode, { bars: ls.bars, ts: ls.ts, stale: !isLastCandleFresh(ls.lastCandleDate) });
    return ls.bars;
  }

  return null;
}

/**
 * آیا کش این نماد قدیمی است؟ (برای نمایش برچسب "داده قدیمی")
 */
export function isOHLCStale(insCode: string): boolean {
  const mem = _memCache.get(insCode);
  if (mem) return mem.stale;

  const ls = loadFromLS(insCode);
  if (ls) return !isLastCandleFresh(ls.lastCandleDate);

  return true; // No data = stale
}

/**
 * دریافت داده تاریخی OHLC
 * از /tsetmc-history proxy (بدون CORS)
 */
export async function fetchHistoricalOHLC(
  insCode: string,
  days = 60,
): Promise<OHLCBar[]> {
  // 1. Memory cache (fresh)
  const mem = _memCache.get(insCode);
  if (mem && Date.now() - mem.ts < MEM_TTL && mem.bars.length >= days * 0.7) {
    return mem.bars;
  }

  // 2. localStorage cache (check freshness)
  const ls = loadFromLS(insCode);
  if (ls && ls.bars.length >= days * 0.7) {
    const stale = !isLastCandleFresh(ls.lastCandleDate);
    _memCache.set(insCode, { bars: ls.bars, ts: ls.ts, stale });

    // If fresh enough, return
    if (!stale) return ls.bars;

    // If stale, try to fetch fresh data (but still return stale for now)
    console.log(`[historicalData] ${insCode} cache stale (last: ${ls.lastCandleDate}), fetching fresh...`);
  }

  // 3. Fetch via proxy (no CORS issues)
  try {
    // Use /tsetmc-history proxy → cdn.tsetmc.com
    const url = `/tsetmc-history/api/ClosingPrice/GetClosingPriceHistory/${insCode}/${days}`;
    const text = await enqueueRequest(
      `ohlc_${insCode}`,
      url,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
          Referer: "https://tsetmc.com/",
        },
      },
      10_000,
      2,
    );

    const data = JSON.parse(text) as {
      closingPriceHistory?: Array<{
        dEven?: number;
        pClosing?: number;
        pDrCotVal?: number;
        zTotTran?: number;
        qTotTran5J?: number;
        qTotCap?: number;
        priceMin?: number;
        priceMax?: number;
        priceFirst?: number;
      }>;
    };

    if (!data.closingPriceHistory || data.closingPriceHistory.length === 0) {
      // Return stale cache if available
      if (ls && ls.bars.length > 0) return ls.bars;
      return [];
    }

    const bars = data.closingPriceHistory
      .map((item) => ({
        date: item.dEven ? String(item.dEven) : "",
        open: item.priceFirst ?? item.pClosing ?? 0,
        high: item.priceMax ?? 0,
        low: item.priceMin ?? 0,
        close: item.pDrCotVal ?? item.pClosing ?? 0,
        volume: item.zTotTran ?? 0,
        value: item.qTotCap ?? 0,
        tradeCount: item.qTotTran5J ?? 0,
      }))
      .filter((b) => b.close > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (bars.length > 0) {
      const lastCandleDate = bars[bars.length - 1].date;
      const fresh = isLastCandleFresh(lastCandleDate);

      _memCache.set(insCode, { bars, ts: Date.now(), stale: !fresh });
      saveToLS(insCode, { bars, ts: Date.now(), lastCandleDate });

      console.log(`[historicalData] ✅ ${insCode}: ${bars.length} bars (last: ${lastCandleDate}, fresh: ${fresh})`);
    }

    return bars;
  } catch (err) {
    console.warn(`[historicalData] Failed for ${insCode}:`, err);
    // Return stale cache
    if (ls && ls.bars.length > 0) return ls.bars;
    return [];
  }
}

/**
 * پیش‌بارگذاری — فقط ۱۰ نماد برتر
 */
export async function prefetchHistoricalData(
  instruments: Array<{ rawInsCode: string; symbol: string }>,
  maxCount = 10,
  concurrency = 1,
): Promise<{ fetched: number; cached: number; failed: number }> {
  const toFetch = instruments
    .filter((i) => i.rawInsCode && !getCachedOHLC(i.rawInsCode))
    .slice(0, maxCount);

  const alreadyCached = instruments.filter((i) => i.rawInsCode && getCachedOHLC(i.rawInsCode)).length;
  let fetched = 0;
  let failed = 0;

  for (const inst of toFetch) {
    try {
      const bars = await fetchHistoricalOHLC(inst.rawInsCode, 60);
      if (bars.length > 0) fetched++;
      else failed++;
    } catch {
      failed++;
    }
  }

  console.log(`[historicalData] Prefetch: ${fetched} fetched, ${alreadyCached} cached, ${failed} failed`);
  return { fetched, cached: alreadyCached, failed };
}

// ═══════════════════════════════════════════════════════
//  Technical Indicator Calculations (unchanged)
// ═══════════════════════════════════════════════════════

export function computeRSI(bars: OHLCBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const closes = bars.map((b) => b.close);
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1]);
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function computeEMA(bars: OHLCBar[], period: number): number | null {
  if (bars.length < period) return null;
  const closes = bars.map((b) => b.close);
  const k = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < period; i++) ema += closes[i];
  ema /= period;
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return ema;
}

export function computeMACD(bars: OHLCBar[]): { macdLine: number; signal: number; histogram: number } | null {
  if (bars.length < 35) return null;
  const ema12 = computeEMAArray(bars, 12);
  const ema26 = computeEMAArray(bars, 26);
  if (!ema12 || !ema26) return null;
  const macdValues: number[] = [];
  const offset = ema12.length - ema26.length;
  for (let i = 0; i < ema26.length; i++) macdValues.push(ema12[i + offset] - ema26[i]);
  if (macdValues.length < 9) return null;
  const k = 2 / 10;
  let signalEma = 0;
  for (let i = 0; i < 9; i++) signalEma += macdValues[i];
  signalEma /= 9;
  for (let i = 9; i < macdValues.length; i++) signalEma = macdValues[i] * k + signalEma * (1 - k);
  return { macdLine: macdValues[macdValues.length - 1], signal: signalEma, histogram: macdValues[macdValues.length - 1] - signalEma };
}

function computeEMAArray(bars: OHLCBar[], period: number): number[] | null {
  if (bars.length < period) return null;
  const closes = bars.map((b) => b.close);
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = 0;
  for (let i = 0; i < period; i++) ema += closes[i];
  ema /= period;
  result.push(ema);
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

export function computeSMA(bars: OHLCBar[], period: number): number | null {
  if (bars.length < period) return null;
  return bars.slice(-period).map((b) => b.close).reduce((a, b) => a + b, 0) / period;
}

export function computeATR(bars: OHLCBar[], period = 14): number | null {
  if (bars.length < period + 1) return null;
  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    trueRanges.push(Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close),
    ));
  }
  let atr = 0;
  for (let i = 0; i < period; i++) atr += trueRanges[i];
  atr /= period;
  for (let i = period; i < trueRanges.length; i++) atr = (atr * (period - 1) + trueRanges[i]) / period;
  return atr;
}

export function computeBollingerBands(bars: OHLCBar[], period = 20, stdDev = 2): { upper: number; middle: number; lower: number } | null {
  if (bars.length < period) return null;
  const closes = bars.slice(-period).map((b) => b.close);
  const middle = closes.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(closes.reduce((sum, c) => sum + Math.pow(c - middle, 2), 0) / period);
  return { upper: middle + stdDev * std, middle, lower: middle - stdDev * std };
}

export function computeVWAP(bars: OHLCBar[]): number | null {
  if (bars.length === 0) return null;
  let totalVolume = 0, totalValue = 0;
  for (const bar of bars) {
    totalValue += ((bar.high + bar.low + bar.close) / 3) * bar.volume;
    totalVolume += bar.volume;
  }
  return totalVolume > 0 ? totalValue / totalVolume : null;
}

export function computeStochastic(bars: OHLCBar[], kPeriod = 14, dPeriod = 3): { k: number; d: number } | null {
  if (bars.length < kPeriod + dPeriod) return null;
  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < bars.length; i++) {
    const window = bars.slice(i - kPeriod + 1, i + 1);
    const hh = Math.max(...window.map((b) => b.high));
    const ll = Math.min(...window.map((b) => b.low));
    kValues.push(hh === ll ? 50 : ((bars[i].close - ll) / (hh - ll)) * 100);
  }
  return { k: kValues[kValues.length - 1], d: kValues.slice(-dPeriod).reduce((a, b) => a + b, 0) / dPeriod };
}

export function computeImpliedVolatility(marketPrice: number, spot: number, strike: number, timeToExpiry: number, riskFreeRate: number, isCall: boolean): number {
  if (marketPrice <= 0 || spot <= 0 || strike <= 0 || timeToExpiry <= 0) return 0.6;
  let sigma = 0.5;
  for (let i = 0; i < 20; i++) {
    const sqrtT = Math.sqrt(timeToExpiry);
    const d1 = (Math.log(spot / strike) + (riskFreeRate + 0.5 * sigma * sigma) * timeToExpiry) / (sigma * sqrtT);
    const d2 = d1 - sigma * sqrtT;
    const Nd1 = normalCDF(d1);
    const Nd2 = normalCDF(d2);
    const expRT = Math.exp(-riskFreeRate * timeToExpiry);
    const theoretical = isCall ? spot * Nd1 - strike * expRT * Nd2 : strike * expRT * normalCDF(-d2) - spot * normalCDF(-d1);
    const vega = spot * normalPDF(d1) * sqrtT;
    if (vega < 1e-10) break;
    sigma = sigma - (theoretical - marketPrice) / vega;
    if (Math.abs(theoretical - marketPrice) < 0.001) break;
    sigma = Math.max(0.01, Math.min(3.0, sigma));
  }
  return Math.max(0.01, Math.min(3.0, sigma));
}

function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * absX);
  return 0.5 * (1 + sign * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX)));
}

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function getCachedOHLCCount(): number { return _memCache.size; }
export function getHistoricalCacheSize(): number { return _memCache.size; }
export function clearHistoricalCache(): void { _memCache.clear(); }
