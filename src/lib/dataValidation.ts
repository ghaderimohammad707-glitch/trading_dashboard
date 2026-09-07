/**
 * Data Validation & Sanitization Module
 * فیلتر کردن داده‌های پرت (Outliers) و اصلاح خطاهای لحظه‌ای سرور بورس
 */

import type { OHLCV } from './backtest/types';
import type { CandleData } from '../types/market';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  sanitizedData?: OHLCV[] | CandleData[];
}

export interface OutlierConfig {
  method: 'zscore' | 'iqr' | 'mad';
  threshold: number;
  fields: Array<'open' | 'high' | 'low' | 'close' | 'volume'>;
}

/**
 * بررسی صحت داده‌های کندل
 */
export function validateCandle(candle: OHLCV | CandleData): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // بررسی مقادیر منفی
  if (candle.open < 0 || candle.high < 0 || candle.low < 0 || candle.close < 0) {
    issues.push('Negative price detected');
  }

  // بررسی High/Low logic
  if (candle.high < candle.low) {
    issues.push('High is lower than Low');
  }

  if (candle.high < candle.open || candle.high < candle.close) {
    issues.push('High is not the maximum');
  }

  if (candle.low > candle.open || candle.low > candle.close) {
    issues.push('Low is not the minimum');
  }

  // بررسی حجم منفی
  if (candle.volume < 0) {
    issues.push('Negative volume');
  }

  // بررسی نوسانات غیرعادی (بیش از 20% در یک روز)
  const dailyRange = Math.abs(candle.high - candle.low) / candle.low;
  if (dailyRange > 0.20) {
    issues.push(`Unusual volatility: ${(dailyRange * 100).toFixed(2)}%`);
  }

  // بررسی قیمت صفر
  if (candle.close === 0 || candle.open === 0) {
    issues.push('Zero price detected');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * محاسبه Z-Score برای تشخیص Outlier
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * محاسبه IQR (Interquartile Range) برای تشخیص Outlier
 */
function calculateIQR(values: number[]): { q1: number; q3: number; iqr: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  return { q1, q3, iqr };
}

/**
 * محاسبه MAD (Median Absolute Deviation)
 */
function calculateMAD(values: number[]): number {
  const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const deviations = values.map(v => Math.abs(v - median));
  const mad = deviations.sort((a, b) => a - b)[Math.floor(deviations.length / 2)];
  return mad;
}

/**
 * تشخیص و حذف داده‌های پرت (Outliers)
 */
export function detectOutliers(
  data: OHLCV[],
  config: OutlierConfig = {
    method: 'iqr',
    threshold: 1.5,
    fields: ['open', 'high', 'low', 'close', 'volume']
  }
): { outliers: number[]; cleanedData: OHLCV[] } {
  const outlierIndices = new Set<number>();

  for (const field of config.fields) {
    const values = data.map(d => d[field]);
    
    let outlierMask: boolean[];

    if (config.method === 'zscore') {
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      );
      
      outlierMask = values.map(v => {
        const zScore = Math.abs(calculateZScore(v, mean, stdDev));
        return zScore > config.threshold;
      });
    } else if (config.method === 'iqr') {
      const { q1, q3, iqr } = calculateIQR(values);
      const lowerBound = q1 - config.threshold * iqr;
      const upperBound = q3 + config.threshold * iqr;
      
      outlierMask = values.map(v => v < lowerBound || v > upperBound);
    } else if (config.method === 'mad') {
      const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const mad = calculateMAD(values);
      const modifiedZThreshold = 3.5; // استاندارد برای MAD
      
      outlierMask = values.map(v => {
        const modifiedZ = (0.6745 * (v - median)) / mad;
        return Math.abs(modifiedZ) > modifiedZThreshold;
      });
    } else {
      outlierMask = values.map(() => false);
    }

    outlierMask.forEach((isOutlier, index) => {
      if (isOutlier) outlierIndices.add(index);
    });
  }

  // جایگزینی Outlierها با مقدار میانه متحرک
  const cleanedData = data.map((candle, index) => {
    if (!outlierIndices.has(index)) return candle;

    // استفاده از میانگین متحرک 3 تایی برای جایگزینی
    const prevCandle = data[index - 1] || candle;
    const nextCandle = data[index + 1] || candle;

    return {
      ...candle,
      open: (prevCandle.open + nextCandle.open) / 2,
      high: Math.max(prevCandle.high, nextCandle.high),
      low: Math.min(prevCandle.low, nextCandle.low),
      close: (prevCandle.close + nextCandle.close) / 2,
      volume: Math.floor((prevCandle.volume + nextCandle.volume) / 2)
    };
  });

  return {
    outliers: Array.from(outlierIndices),
    cleanedData
  };
}

/**
 * اعتبارسنجی سری زمانی داده‌ها
 */
export function validateTimeSeries(data: OHLCV[]): ValidationResult {
  const issues: string[] = [];

  if (data.length === 0) {
    return { isValid: false, issues: ['Empty dataset'] };
  }

  // بررسی ترتیب زمانی
  for (let i = 1; i < data.length; i++) {
    if (data[i].timestamp <= data[i - 1].timestamp) {
      issues.push(`Timestamp order violation at index ${i}`);
    }
  }

  // بررسی داده‌های گمشده (weekends除外)
  const oneDay = 24 * 60 * 60 * 1000;
  for (let i = 1; i < data.length; i++) {
    const diff = data[i].timestamp - data[i - 1].timestamp;
    const dayOfWeek = new Date(data[i].timestamp).getDay();
    
    // اگر دوشنبه باشد (day 1)، اختلاف می‌تواند 3 روز باشد
    if (dayOfWeek === 1 && diff > 3.5 * oneDay) {
      issues.push(`Missing data before ${new Date(data[i].timestamp).toISOString().split('T')[0]}`);
    } else if (dayOfWeek !== 0 && dayOfWeek !== 6 && diff > 1.5 * oneDay) {
      issues.push(`Missing data at ${new Date(data[i].timestamp).toISOString().split('T')[0]}`);
    }
  }

  // اعتبارسنجی هر کندل
  let invalidCandles = 0;
  for (let i = 0; i < data.length; i++) {
    const result = validateCandle(data[i]);
    if (!result.isValid) {
      invalidCandles++;
      if (issues.length < 10) { // محدود کردن تعداد خطاها
        issues.push(`Candle ${i}: ${result.issues.join(', ')}`);
      }
    }
  }

  if (invalidCandles > data.length * 0.1) {
    issues.push(`More than 10% of candles are invalid (${invalidCandles}/${data.length})`);
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * تمیزکاری و اصلاح داده‌های ناقص
 */
export function sanitizeData(data: OHLCV[]): OHLCV[] {
  if (data.length === 0) return data;

  const sanitized = data.map((candle, index) => {
    let { open, high, low, close, volume, timestamp } = candle;

    // اصلاح High/Low اگر با Open/Close تناقض دارد
    high = Math.max(high, open, close);
    low = Math.min(low, open, close);

    // اصلاح حجم منفی
    if (volume < 0) volume = 0;

    // اصلاح قیمت‌های منفی یا صفر
    if (open <= 0) open = Math.abs(open) || 1;
    if (high <= 0) high = Math.max(open, close);
    if (low <= 0) low = Math.min(open, close) * 0.99;
    if (close <= 0) close = open;

    // پر کردن داده‌های گمشده با Forward Fill
    if (index > 0) {
      const prev = data[index - 1];
      if (isNaN(open)) open = prev.close;
      if (isNaN(high)) high = Math.max(open, close, prev.high);
      if (isNaN(low)) low = Math.min(open, close, prev.low);
      if (isNaN(close)) close = open;
      if (isNaN(volume)) volume = prev.volume;
    }

    return { timestamp, open, high, low, close, volume };
  });

  // هموارسازی حجم با میانگین متحرک برای کاهش نویز
  const windowSize = 5;
  const smoothedVolume = sanitized.map((candle, i) => {
    const start = Math.max(0, i - windowSize);
    const end = Math.min(sanitized.length, i + windowSize + 1);
    const window = sanitized.slice(start, end);
    const avgVolume = window.reduce((sum, c) => sum + c.volume, 0) / window.length;
    
    // ترکیب حجم واقعی با میانگین متحرک (وزن 70% واقعی، 30% میانگین)
    return Math.floor(candle.volume * 0.7 + avgVolume * 0.3);
  });

  return sanitized.map((candle, i) => ({
    ...candle,
    volume: smoothedVolume[i]
  }));
}

/**
 * نرمال‌سازی داده‌ها برای مقایسه بهتر
 */
export function normalizeData(data: OHLCV[]): { normalized: OHLCV[]; minMax: Record<string, [number, number]> } {
  if (data.length === 0) return { normalized: [], minMax: {} as Record<string, [number, number]> };

  const minMax = {
    open: [Math.min(...data.map(d => d.open)), Math.max(...data.map(d => d.open))] as [number, number],
    high: [Math.min(...data.map(d => d.high)), Math.max(...data.map(d => d.high))] as [number, number],
    low: [Math.min(...data.map(d => d.low)), Math.max(...data.map(d => d.low))] as [number, number],
    close: [Math.min(...data.map(d => d.close)), Math.max(...data.map(d => d.close))] as [number, number],
    volume: [Math.min(...data.map(d => d.volume)), Math.max(...data.map(d => d.volume))] as [number, number]
  };

  const normalized = data.map(candle => ({
    timestamp: candle.timestamp,
    open: (candle.open - minMax.open[0]) / (minMax.open[1] - minMax.open[0] || 1),
    high: (candle.high - minMax.high[0]) / (minMax.high[1] - minMax.high[0] || 1),
    low: (candle.low - minMax.low[0]) / (minMax.low[1] - minMax.low[0] || 1),
    close: (candle.close - minMax.close[0]) / (minMax.close[1] - minMax.close[0] || 1),
    volume: (candle.volume - minMax.volume[0]) / (minMax.volume[1] - minMax.volume[0] || 1)
  }));

  return { normalized, minMax };
}

/**
 * تبدیل داده‌های خام به فرمت استاندارد OHLCV
 */
export function convertToOHLCV(data: any[]): OHLCV[] {
  return data.map(item => ({
    timestamp: item.timestamp || item.time || Date.now(),
    open: parseFloat(item.open || item.o || 0),
    high: parseFloat(item.high || item.h || 0),
    low: parseFloat(item.low || item.l || 0),
    close: parseFloat(item.close || item.c || 0),
    volume: parseFloat(item.volume || item.v || 0)
  })).filter(candle => candle.close > 0); // حذف کندل‌های نامعتبر
}

/**
 * پردازش کامل داده‌ها: اعتبارسنجی + تمیزکاری + حذف Outlier
 */
export function processMarketData(
  rawData: any[],
  options: {
    removeOutliers?: boolean;
    outlierMethod?: OutlierConfig['method'];
    sanitize?: boolean;
    validate?: boolean;
  } = {}
): { data: OHLCV[]; validation: ValidationResult; outlierCount: number } {
  // تبدیل به فرمت استاندارد
  let data = convertToOHLCV(rawData);

  // اعتبارسنجی اولیه
  const validation = options.validate !== false ? validateTimeSeries(data) : { isValid: true, issues: [] };

  // تمیزکاری داده‌ها
  if (options.sanitize !== false) {
    data = sanitizeData(data);
  }

  // حذف Outlierها
  let outlierCount = 0;
  if (options.removeOutliers !== false) {
    const { cleanedData, outliers } = detectOutliers(data, {
      method: options.outlierMethod || 'iqr',
      threshold: 2.0, // کمی سخاوتمندانه‌تر
      fields: ['close', 'volume']
    });
    data = cleanedData;
    outlierCount = outliers.length;
  }

  // اعتبارسنجی نهایی
  const finalValidation = options.validate !== false ? validateTimeSeries(data) : { isValid: true, issues: [] };

  return {
    data,
    validation: finalValidation,
    outlierCount
  };
}
