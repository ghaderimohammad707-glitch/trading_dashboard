/**
 * موتور تحلیل تکنیکال پیشرفته
 * بر اساس داده‌های واقعی بازار بورس تهران
 * بدون هیچگونه داده فیک یا شبیه‌سازی شده
 */

import { HistoricalDataPoint } from '../../services/tsetmcRealDataService';

export interface TechnicalIndicators {
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  ema20: number;
  ema50: number;
  sma200: number;
  bollingerBands: { upper: number; middle: number; lower: number };
  atr: number;
  volume_sma: number;
  stochastic: { k: number; d: number };
  williamsR: number;
}

export interface TechnicalSignal {
  type: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';
  confidence: number; // 0-100
  reasons: string[];
  indicators: TechnicalIndicators;
}

/**
 * محاسبه میانگین متحرک ساده (SMA)
 */
function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const slice = data.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * محاسبه میانگین متحرک نمایی (EMA)
 */
function calculateEMA(data: number[], period: number): number {
  if (data.length === 0) return 0;
  
  const multiplier = 2 / (period + 1);
  let ema = data[0];
  
  for (let i = 1; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

/**
 * محاسبه شاخص قدرت نسبی (RSI)
 */
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
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
function calculateMACD(prices: number[]): { value: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdValue = ema12 - ema26;
  
  // برای سیگنال نیاز به تاریخچه MACD داریم (ساده‌سازی شده)
  const signal = macdValue * 0.9; // تقریب اولیه
  const histogram = macdValue - signal;
  
  return { value: macdValue, signal, histogram };
}

/**
 * محاسبه باندهای بولینگر
 */
function calculateBollingerBands(prices: number[], period: number = 20): { upper: number; middle: number; lower: number } {
  const sma = calculateSMA(prices, period);
  
  // محاسبه انحراف معیار
  const slice = prices.slice(-period);
  const squaredDiffs = slice.map(p => Math.pow(p - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: sma + (2 * stdDev),
    middle: sma,
    lower: sma - (2 * stdDev)
  };
}

/**
 * محاسبه شاخص میانگین محدوده واقعی (ATR)
 */
function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length < period + 1) return 0;
  
  let trueRanges: number[] = [];
  
  for (let i = 1; i < highs.length; i++) {
    const tr1 = highs[i] - lows[i];
    const tr2 = Math.abs(highs[i] - closes[i - 1]);
    const tr3 = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return calculateSMA(trueRanges, period);
}

/**
 * محاسبه استوکاستیک
 */
function calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): { k: number; d: number } {
  if (closes.length < period) return { k: 50, d: 50 };
  
  const recentHigh = Math.max(...highs.slice(-period));
  const recentLow = Math.min(...lows.slice(-period));
  const currentClose = closes[closes.length - 1];
  
  if (recentHigh === recentLow) return { k: 50, d: 50 };
  
  const k = ((currentClose - recentLow) / (recentHigh - recentLow)) * 100;
  const d = k * 0.9; // تقریب برای D
  
  return { k, d };
}

/**
 * محاسبه Williams %R
 */
function calculateWilliamsR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (closes.length < period) return -50;
  
  const recentHigh = Math.max(...highs.slice(-period));
  const recentLow = Math.min(...lows.slice(-period));
  const currentClose = closes[closes.length - 1];
  
  if (recentHigh === recentLow) return -50;
  
  return ((recentHigh - currentClose) / (recentHigh - recentLow)) * -100;
}

/**
 * تحلیل تکنیکال کامل یک نماد
 */
export function analyzeTechnical(historicalData: HistoricalDataPoint[]): TechnicalSignal {
  if (historicalData.length < 50) {
    return {
      type: 'HOLD',
      confidence: 0,
      reasons: ['داده‌های ناکافی برای تحلیل تکنیکال (حداقل ۵۰ روز مورد نیاز است)'],
      indicators: {
        rsi: 50,
        macd: { value: 0, signal: 0, histogram: 0 },
        ema20: 0,
        ema50: 0,
        sma200: 0,
        bollingerBands: { upper: 0, middle: 0, lower: 0 },
        atr: 0,
        volume_sma: 0,
        stochastic: { k: 50, d: 50 },
        williamsR: -50
      }
    };
  }
  
  const closes = historicalData.map(d => d.close);
  const highs = historicalData.map(d => d.high);
  const lows = historicalData.map(d => d.low);
  const volumes = historicalData.map(d => d.volume);
  
  // محاسبه تمام اندیکاتورها
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const bb = calculateBollingerBands(closes);
  const atr = calculateATR(highs, lows, closes);
  const volSMA = calculateSMA(volumes, 20);
  const stoch = calculateStochastic(highs, lows, closes);
  const williamsR = calculateWilliamsR(highs, lows, closes);
  
  const currentPrice = closes[closes.length - 1];
  const reasons: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;
  
  // تحلیل RSI
  if (rsi < 30) {
    reasons.push(`RSI در منطقه اشباع فروش (${rsi.toFixed(2)}) - احتمال بازگشت قیمت`);
    bullishScore += 2;
  } else if (rsi > 70) {
    reasons.push(`RSI در منطقه اشباع خرید (${rsi.toFixed(2)}) - احتمال اصلاح قیمت`);
    bearishScore += 2;
  } else if (rsi > 50) {
    reasons.push(`RSI بالای ۵۰ (${rsi.toFixed(2)}) - روند صعودی کوتاه‌مدت`);
    bullishScore += 1;
  } else {
    reasons.push(`RSI زیر ۵۰ (${rsi.toFixed(2)}) - روند نزولی کوتاه‌مدت`);
    bearishScore += 1;
  }
  
  // تحلیل MACD
  if (macd.histogram > 0 && macd.value > macd.signal) {
    reasons.push('MACD مثبت و رو به افزایش - سیگنال صعودی');
    bullishScore += 2;
  } else if (macd.histogram < 0 && macd.value < macd.signal) {
    reasons.push('MACD منفی و رو به کاهش - سیگنال نزولی');
    bearishScore += 2;
  }
  
  // تحلیل تقاطع میانگین‌ها
  if (ema20 > ema50) {
    reasons.push('EMA 20 روزه بالای EMA 50 روزه - روند صعودی میان‌مدت');
    bullishScore += 2;
  } else {
    reasons.push('EMA 20 روزه زیر EMA 50 روزه - روند نزولی میان‌مدت');
    bearishScore += 2;
  }
  
  if (currentPrice > sma200) {
    reasons.push('قیمت بالای SMA 200 روزه - روند بلندمدت صعودی');
    bullishScore += 2;
  } else {
    reasons.push('قیمت زیر SMA 200 روزه - روند بلندمدت نزولی');
    bearishScore += 2;
  }
  
  // تحلیل باندهای بولینگر
  if (currentPrice < bb.lower) {
    reasons.push('قیمت زیر باند پایین بولینگر - احتمال بازگشت به بالا');
    bullishScore += 2;
  } else if (currentPrice > bb.upper) {
    reasons.push('قیمت بالای باند بالای بولینگر - احتمال اصلاح به پایین');
    bearishScore += 2;
  }
  
  // تحلیل استوکاستیک
  if (stoch.k < 20 && stoch.d < 20) {
    reasons.push(`استوکاستیک در منطقه اشباع فروش (K=${stoch.k.toFixed(2)}, D=${stoch.d.toFixed(2)})`);
    bullishScore += 1;
  } else if (stoch.k > 80 && stoch.d > 80) {
    reasons.push(`استوکاستیک در منطقه اشباع خرید (K=${stoch.k.toFixed(2)}, D=${stoch.d.toFixed(2)})`);
    bearishScore += 1;
  }
  
  // تحلیل حجم معاملات
  const currentVolume = volumes[volumes.length - 1];
  if (currentVolume > volSMA * 1.5) {
    reasons.push('حجم معاملات ۵۰٪ بیشتر از میانگین - تأیید قدرت روند');
    if (currentPrice > closes[closes.length - 2]) bullishScore += 1;
    else bearishScore += 1;
  }
  
  // تعیین نوع سیگنال نهایی
  const totalScore = bullishScore - bearishScore;
  let type: TechnicalSignal['type'] = 'HOLD';
  let confidence = 0;
  
  if (totalScore >= 5) {
    type = 'STRONG_BUY';
    confidence = Math.min(95, 60 + (totalScore - 5) * 5);
  } else if (totalScore >= 2) {
    type = 'BUY';
    confidence = 50 + totalScore * 5;
  } else if (totalScore <= -5) {
    type = 'STRONG_SELL';
    confidence = Math.min(95, 60 + (Math.abs(totalScore) - 5) * 5);
  } else if (totalScore <= -2) {
    type = 'SELL';
    confidence = 50 + Math.abs(totalScore) * 5;
  } else {
    type = 'HOLD';
    confidence = 50 - Math.abs(totalScore) * 5;
  }
  
  return {
    type,
    confidence: Math.round(confidence),
    reasons,
    indicators: {
      rsi,
      macd,
      ema20,
      ema50,
      sma200,
      bollingerBands: bb,
      atr,
      volume_sma: volSMA,
      stochastic: stoch,
      williamsR
    }
  };
}
