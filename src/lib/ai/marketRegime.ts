/**
 * فاز ۳: هوش مصنوعی و تحلیل چندلایه (AI & Multi-Layer Analysis)
 * ماژول تشخیص رژیم بازار (Market Regime Detection)
 * 
 * هدف: تمایز بین بازار رونددار (Trending) و رنج (Ranging) برای فیلتر کردن سیگنال‌های ضعیف.
 */

import { OHLCV as Candle } from '../backtest/types';

export type MarketRegime = 'STRONG_BULL' | 'WEAK_BULL' | 'RANGING' | 'WEAK_BEAR' | 'STRONG_BEAR';

export interface RegimeAnalysis {
  regime: MarketRegime;
  adx: number; // Average Directional Index
  diPlus: number;
  diMinus: number;
  atr: number; // Average True Range
  volatility: number;
  trendStrength: number; // 0-100
  confidence: number; // 0-100
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
}

export interface DonchianChannels {
  upper: number;
  lower: number;
  middle: number;
  width: number;
}

/**
 * محاسبه میانگین متحرک ساده (SMA)
 */
function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

/**
 * محاسبه میانگین متحرک نمایی (EMA)
 */
function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  
  let ema = data.length >= period ? sum / period : data[0] || 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
  }
  
  return result;
}

/**
 * محاسبه انحراف معیار
 */
function calculateStdDev(data: number[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    result.push(Math.sqrt(variance));
  }
  
  return result;
}

/**
 * محاسبه باندهای بولینگر
 */
export function calculateBollingerBands(candles: Candle[], period: number = 20, stdDevMultiplier: number = 2): BollingerBands[] {
  const closes = candles.map(c => c.close);
  const sma = calculateSMA(closes, period);
  const stdDev = calculateStdDev(closes, period);
  
  const bands: BollingerBands[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1 || isNaN(sma[i]) || isNaN(stdDev[i])) {
      bands.push({ upper: NaN, middle: NaN, lower: NaN, bandwidth: NaN, percentB: NaN });
      continue;
    }
    
    const middle = sma[i];
    const upper = middle + (stdDev[i] * stdDevMultiplier);
    const lower = middle - (stdDev[i] * stdDevMultiplier);
    const bandwidth = (upper - lower) / middle;
    const percentB = (closes[i] - lower) / (upper - lower);
    
    bands.push({ upper, middle, lower, bandwidth, percentB });
  }
  
  return bands;
}

/**
 * محاسبه کانال‌های دانچیان
 */
export function calculateDonchianChannels(candles: Candle[], period: number = 20): DonchianChannels[] {
  const channels: DonchianChannels[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      channels.push({ upper: NaN, lower: NaN, middle: NaN, width: NaN });
      continue;
    }
    
    const slice = candles.slice(i - period + 1, i + 1);
    const upper = Math.max(...slice.map(c => c.high));
    const lower = Math.min(...slice.map(c => c.low));
    const middle = (upper + lower) / 2;
    const width = upper - lower;
    
    channels.push({ upper, lower, middle, width });
  }
  
  return channels;
}

/**
 * محاسبه شاخص جهت‌دار متوسط (ADX)
 */
function calculateADX(candles: Candle[], period: number = 14): { adx: number[]; diPlus: number[]; diMinus: number[] } {
  const adx: number[] = [];
  const diPlus: number[] = [];
  const diMinus: number[] = [];
  
  if (candles.length < period + 1) {
    return { adx: new Array(candles.length).fill(NaN), diPlus: new Array(candles.length).fill(NaN), diMinus: new Array(candles.length).fill(NaN) };
  }
  
  let trSum = 0;
  let plusDMSum = 0;
  let minusDMSum = 0;
  
  // محاسبه اولین TR و DM
  for (let i = 1; i <= period; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trSum += tr;
    
    const plusDM = current.high - previous.high > previous.low - current.low ? Math.max(current.high - previous.high, 0) : 0;
    const minusDM = previous.low - current.low > current.high - previous.high ? Math.max(previous.low - current.low, 0) : 0;
    
    plusDMSum += plusDM;
    minusDMSum += minusDM;
  }
  
  let atr = trSum / period;
  let plusDI = (plusDMSum / trSum) * 100;
  let minusDI = (minusDMSum / trSum) * 100;
  
  diPlus.push(...new Array(period).fill(NaN));
  diMinus.push(...new Array(period).fill(NaN));
  diPlus.push(plusDI);
  diMinus.push(minusDI);
  adx.push(...new Array(period).fill(NaN));
  adx.push(0); // اولین مقدار ADX صفر است
  
  const smoothMultiplier = 1 / period;
  
  for (let i = period + 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    
    const plusDM = current.high - previous.high > previous.low - current.low ? Math.max(current.high - previous.high, 0) : 0;
    const minusDM = previous.low - current.low > current.high - previous.high ? Math.max(previous.low - current.low, 0) : 0;
    
    atr = (atr * (period - 1) + tr) / period;
    plusDMSum = plusDMSum - (plusDMSum * smoothMultiplier) + plusDM;
    minusDMSum = minusDMSum - (minusDMSum * smoothMultiplier) + minusDM;
    
    plusDI = (plusDMSum / (plusDMSum + minusDMSum)) * 100;
    minusDI = (minusDMSum / (plusDMSum + minusDMSum)) * 100;
    
    diPlus.push(plusDI);
    diMinus.push(minusDI);
    
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    
    if (i === period + 1) {
      adx.push(dx);
    } else {
      const prevADX = adx[adx.length - 1];
      const newADX = ((prevADX * (period - 1)) + dx) / period;
      adx.push(newADX);
    }
  }
  
  return { adx, diPlus, diMinus };
}

/**
 * محاسبه نوسان واقعی متوسط (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const atr: number[] = [];
  
  if (candles.length < period + 1) {
    return new Array(candles.length).fill(NaN);
  }
  
  let trSum = 0;
  
  for (let i = 1; i <= period; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    trSum += tr;
  }
  
  atr.push(...new Array(period).fill(NaN));
  atr.push(trSum / period);
  
  for (let i = period + 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    
    const prevATR = atr[atr.length - 1];
    const newATR = ((prevATR * (period - 1)) + tr) / period;
    atr.push(newATR);
  }
  
  return atr;
}

/**
 * تشخیص رژیم بازار با استفاده از ترکیب ADX، EMA و باندهای بولینگر
 */
export function detectMarketRegime(candles: Candle[], period: number = 14): RegimeAnalysis {
  if (candles.length < period + 10) {
    return {
      regime: 'RANGING',
      adx: 0,
      diPlus: 0,
      diMinus: 0,
      atr: 0,
      volatility: 0,
      trendStrength: 0,
      confidence: 0
    };
  }
  
  const { adx, diPlus, diMinus } = calculateADX(candles, period);
  const atrValues = calculateATR(candles, period);
  const closes = candles.map(c => c.close);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  
  const currentADX = adx[adx.length - 1];
  const currentDIPlus = diPlus[diPlus.length - 1];
  const currentDIMinus = diMinus[diMinus.length - 1];
  const currentATR = atrValues[atrValues.length - 1];
  const currentClose = closes[closes.length - 1];
  const currentEma20 = ema20[ema20.length - 1];
  const currentEma50 = ema50[ema50.length - 1];
  
  // محاسبه نوسان‌پذیری
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * 100; // به درصد
  
  // تعیین قدرت روند
  let trendStrength = 0;
  if (currentADX > 50) trendStrength = 100;
  else if (currentADX > 40) trendStrength = 80;
  else if (currentADX > 30) trendStrength = 60;
  else if (currentADX > 25) trendStrength = 40;
  else if (currentADX > 20) trendStrength = 20;
  else trendStrength = 0;
  
  // تعیین رژیم بازار
  let regime: MarketRegime = 'RANGING';
  let confidence = 0;
  
  if (currentADX < 20) {
    regime = 'RANGING';
    confidence = Math.min(100, (20 - currentADX) * 5);
  } else {
    const diDiff = currentDIPlus - currentDIMinus;
    
    if (currentDIPlus > currentDIMinus) {
      // روند صعودی
      if (currentEma20 > currentEma50 && currentClose > currentEma20) {
        regime = currentADX > 40 ? 'STRONG_BULL' : 'WEAK_BULL';
        confidence = Math.min(100, trendStrength + Math.abs(diDiff) * 2);
      } else {
        regime = 'WEAK_BULL';
        confidence = Math.min(100, trendStrength * 0.7);
      }
    } else {
      // روند نزولی
      if (currentEma20 < currentEma50 && currentClose < currentEma20) {
        regime = currentADX > 40 ? 'STRONG_BEAR' : 'WEAK_BEAR';
        confidence = Math.min(100, trendStrength + Math.abs(diDiff) * 2);
      } else {
        regime = 'WEAK_BEAR';
        confidence = Math.min(100, trendStrength * 0.7);
      }
    }
  }
  
  return {
    regime,
    adx: parseFloat(currentADX.toFixed(2)),
    diPlus: parseFloat(currentDIPlus.toFixed(2)),
    diMinus: parseFloat(currentDIMinus.toFixed(2)),
    atr: parseFloat(currentATR.toFixed(2)),
    volatility: parseFloat(volatility.toFixed(2)),
    trendStrength: parseFloat(trendStrength.toFixed(2)),
    confidence: parseFloat(confidence.toFixed(2))
  };
}

/**
 * فیلتر کردن سیگنال‌ها بر اساس رژیم بازار
 */
export interface SignalFilter {
  signalType: 'BUY' | 'SELL' | 'HOLD';
  allowedRegimes: MarketRegime[];
  minConfidence?: number;
}

export function filterSignalByRegime(
  signalType: 'BUY' | 'SELL' | 'HOLD',
  regimeAnalysis: RegimeAnalysis,
  minConfidence: number = 50
): { passed: boolean; reason: string; adjustedConfidence: number } {
  if (signalType === 'HOLD') {
    return { passed: true, reason: 'سیگنال HOLD همیشه مجاز است', adjustedConfidence: 100 };
  }
  
  if (regimeAnalysis.confidence < minConfidence) {
    return {
      passed: false,
      reason: `اعتماد به نفس رژیم بازار (${regimeAnalysis.confidence}٪) کمتر از حداقل (${minConfidence}٪) است`,
      adjustedConfidence: regimeAnalysis.confidence
    };
  }
  
  const allowedRegimesForBuy: MarketRegime[] = ['STRONG_BULL', 'WEAK_BULL'];
  const allowedRegimesForSell: MarketRegime[] = ['STRONG_BEAR', 'WEAK_BEAR'];
  
  if (signalType === 'BUY') {
    if (allowedRegimesForBuy.includes(regimeAnalysis.regime)) {
      const multiplier = regimeAnalysis.regime === 'STRONG_BULL' ? 1.0 : 0.8;
      return {
        passed: true,
        reason: `رژیم بازار ${regimeAnalysis.regime} برای خرید مناسب است`,
        adjustedConfidence: Math.min(100, Math.round(regimeAnalysis.confidence * multiplier))
      };
    } else if (regimeAnalysis.regime === 'RANGING') {
      return {
        passed: false,
        reason: 'بازار در حالت رنج است - سیگنال‌های خرید پرریسک هستند',
        adjustedConfidence: regimeAnalysis.confidence * 0.5
      };
    } else {
      return {
        passed: false,
        reason: `رژیم بازار ${regimeAnalysis.regime} برای خرید نامناسب است`,
        adjustedConfidence: 0
      };
    }
  }
  
  if (signalType === 'SELL') {
    if (allowedRegimesForSell.includes(regimeAnalysis.regime)) {
      const multiplier = regimeAnalysis.regime === 'STRONG_BEAR' ? 1.0 : 0.8;
      return {
        passed: true,
        reason: `رژیم بازار ${regimeAnalysis.regime} برای فروش مناسب است`,
        adjustedConfidence: Math.min(100, Math.round(regimeAnalysis.confidence * multiplier))
      };
    } else if (regimeAnalysis.regime === 'RANGING') {
      return {
        passed: false,
        reason: 'بازار در حالت رنج است - سیگنال‌های فروش پرریسک هستند',
        adjustedConfidence: regimeAnalysis.confidence * 0.5
      };
    } else {
      return {
        passed: false,
        reason: `رژیم بازار ${regimeAnalysis.regime} برای فروش نامناسب است`,
        adjustedConfidence: 0
      };
    }
  }
  
  return { passed: false, reason: 'نوع سیگنال نامعتبر است', adjustedConfidence: 0 };
}

export default {
  detectMarketRegime,
  filterSignalByRegime,
  calculateBollingerBands,
  calculateDonchianChannels,
  calculateATR
};
