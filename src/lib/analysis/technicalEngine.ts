/**
 * موتور تحلیل تکنیکال پیشرفته
 * محاسبه اندیکاتورهای کلیدی بر اساس داده‌های واقعی تاریخی
 */

import type { HistoricalData } from './marketDataService';

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  ema20: number;
  ema50: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr: number;
  stochastic: {
    k: number;
    d: number;
  };
  williamsR: number;
  trend: 'uptrend' | 'downtrend' | 'sideways';
  strength: number; // 0-100
}

/**
 * محاسبه میانگین متحرک نمایی (EMA)
 */
function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  
  return ema;
}

/**
 * محاسبه شاخص قدرت نسبی (RSI)
 */
function calculateRSI(data: HistoricalData[], period: number = 14): number {
  if (data.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = data.length - period; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * محاسبه MACD
 */
function calculateMACD(data: HistoricalData[]): { value: number; signal: number; histogram: number } {
  const closes = data.map(d => d.close);
  
  if (closes.length < 26) {
    return { value: 0, signal: 0, histogram: 0 };
  }
  
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdValue = ema12 - ema26;
  
  // محاسبه سیگنال خط (EMA 9 از MACD)
  const macdHistory: number[] = [];
  for (let i = 26; i < closes.length; i++) {
    const e12 = calculateEMA(closes.slice(0, i + 1), 12);
    const e26 = calculateEMA(closes.slice(0, i + 1), 26);
    macdHistory.push(e12 - e26);
  }
  
  const signalLine = calculateEMA(macdHistory, 9);
  const histogram = macdValue - signalLine;
  
  return {
    value: macdValue,
    signal: signalLine,
    histogram,
  };
}

/**
 * محاسبه باندهای بولینگر
 */
function calculateBollingerBands(data: HistoricalData[], period: number = 20): { upper: number; middle: number; lower: number } {
  if (data.length < period) {
    const lastClose = data[data.length - 1]?.close || 0;
    return { upper: lastClose, middle: lastClose, lower: lastClose };
  }
  
  const closes = data.slice(-period).map(d => d.close);
  const middle = closes.reduce((a, b) => a + b, 0) / period;
  
  const variance = closes.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: middle + (2 * stdDev),
    middle,
    lower: middle - (2 * stdDev),
  };
}

/**
 * محاسبه متوسط محدوده واقعی (ATR)
 */
function calculateATR(data: HistoricalData[], period: number = 14): number {
  if (data.length < period + 1) return 0;
  
  let trSum = 0;
  
  for (let i = data.length - period; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    trSum += Math.max(tr1, tr2, tr3);
  }
  
  return trSum / period;
}

/**
 * محاسبه استوکاستیک
 */
function calculateStochastic(data: HistoricalData[], period: number = 14): { k: number; d: number } {
  if (data.length < period) return { k: 50, d: 50 };
  
  const recent = data.slice(-period);
  const highest = Math.max(...recent.map(d => d.high));
  const lowest = Math.min(...recent.map(d => d.low));
  const currentClose = data[data.length - 1].close;
  
  if (highest === lowest) return { k: 50, d: 50 };
  
  const k = ((currentClose - lowest) / (highest - lowest)) * 100;
  
  // محاسبه D به عنوان میانگین متحرک 3 دوره‌ای K
  const kValues: number[] = [];
  for (let i = period; i <= data.length; i++) {
    const slice = data.slice(i - period, i);
    const h = Math.max(...slice.map(d => d.high));
    const l = Math.min(...slice.map(d => d.low));
    const c = slice[slice.length - 1].close;
    if (h !== l) {
      kValues.push(((c - l) / (h - l)) * 100);
    }
  }
  
  const d = kValues.length >= 3 
    ? kValues.slice(-3).reduce((a, b) => a + b, 0) / 3 
    : k;
  
  return { k, d };
}

/**
 * محاسبه Williams %R
 */
function calculateWilliamsR(data: HistoricalData[], period: number = 14): number {
  if (data.length < period) return -50;
  
  const recent = data.slice(-period);
  const highest = Math.max(...recent.map(d => d.high));
  const lowest = Math.min(...recent.map(d => d.low));
  const currentClose = data[data.length - 1].close;
  
  if (highest === lowest) return -50;
  
  return -100 * ((highest - currentClose) / (highest - lowest));
}

/**
 * تحلیل تکنیکال کامل برای یک نماد
 */
export function analyzeTechnical(data: HistoricalData[]): TechnicalIndicators {
  if (data.length < 20) {
    return {
      rsi: 50,
      macd: { value: 0, signal: 0, histogram: 0 },
      ema20: data[data.length - 1]?.close || 0,
      ema50: data[data.length - 1]?.close || 0,
      bollingerBands: { upper: 0, middle: 0, lower: 0 },
      atr: 0,
      stochastic: { k: 50, d: 50 },
      williamsR: -50,
      trend: 'sideways',
      strength: 50,
    };
  }
  
  const closes = data.map(d => d.close);
  const rsi = calculateRSI(data);
  const macd = calculateMACD(data);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const bb = calculateBollingerBands(data);
  const atr = calculateATR(data);
  const stoch = calculateStochastic(data);
  const williamsR = calculateWilliamsR(data);
  
  // تعیین روند
  let trend: 'uptrend' | 'downtrend' | 'sideways' = 'sideways';
  if (ema20 > ema50 && data[data.length - 1].close > ema20) {
    trend = 'uptrend';
  } else if (ema20 < ema50 && data[data.length - 1].close < ema20) {
    trend = 'downtrend';
  }
  
  // محاسبه قدرت سیگنال (0-100)
  let strength = 50;
  if (rsi < 30) strength += 20; // اشباع فروش
  else if (rsi > 70) strength -= 20; // اشباع خرید
  
  if (macd.histogram > 0) strength += 15;
  else strength -= 15;
  
  if (trend === 'uptrend') strength += 15;
  else if (trend === 'downtrend') strength -= 15;
  
  if (stoch.k < 20 && stoch.d < 20) strength += 10;
  else if (stoch.k > 80 && stoch.d > 80) strength -= 10;
  
  strength = Math.max(0, Math.min(100, strength));
  
  return {
    rsi,
    macd,
    ema20,
    ema50,
    bollingerBands: bb,
    atr,
    stochastic: stoch,
    williamsR,
    trend,
    strength,
  };
}
