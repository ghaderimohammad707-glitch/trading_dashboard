/**
 * موتور تحلیل تکنیکال پیشرفته
 * وظیفه: اسکن نمادها، شناسایی الگوها، محاسبه اندیکاتورها و امتیازدهی
 * قانون: فقط داده‌های واقعی پردازش می‌شوند.
 */

import type { StockData, TechnicalIndicators, Signal, CandleData } from '@/types/market';

export interface AnalysisResult {
  symbol: string;
  score: number; // 0 تا 100
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  indicators: TechnicalIndicators;
  patterns: string[];
  reasons: string[]; // دلایل شفاف سیگنال
  entryPoint?: number;
  stopLoss?: number;
  takeProfits?: number[];
  confidence: number; // درصد اطمینان
}

export class TechnicalAnalysisEngine {
  
  /**
   * محاسبه میانگین متحرک نمایی (EMA)
   */
  private calculateEMA(data: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const emaArray = [data[0]];
    for (let i = 1; i < data.length; i++) {
      emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    }
    return emaArray;
  }

  /**
   * محاسبه شاخص قدرت نسبی (RSI)
   */
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * تشخیص واگرایی (Divergence Detection)
   */
  private detectDivergence(prices: number[], indicatorValues: number[]): 'POSITIVE' | 'NEGATIVE' | null {
    const len = prices.length;
    if (len < 5) return null;

    // بررسی ساده برای سقف‌ها و کف‌های اخیر
    const recentPrices = prices.slice(-5);
    const recentInds = indicatorValues.slice(-5);

    const priceLow = Math.min(...recentPrices);
    const priceHigh = Math.max(...recentPrices);
    const indLow = Math.min(...recentInds);
    const indHigh = Math.max(...recentInds);

    // واگرایی مثبت: قیمت کف پایین‌تر، اندیکاتور کف بالاتر
    if (prices[len - 1] < prices[len - 3] && indicatorValues[len - 1] > indicatorValues[len - 3]) {
      return 'POSITIVE';
    }
    // واگرایی منفی: قیمت سقف بالاتر، اندیکاتور سقف پایین‌تر
    if (prices[len - 1] > prices[len - 3] && indicatorValues[len - 1] < indicatorValues[len - 3]) {
      return 'NEGATIVE';
    }

    return null;
  }

  /**
   * تحلیل جامع یک نماد
   */
  async analyzeSymbol(stockData: StockData): Promise<AnalysisResult> {
    const { history, currentPrice, volume, avgVolume } = stockData;
    const closingPrices = history.map((d: CandleData) => d.close);
    
    if (closingPrices.length < 50) {
      throw new Error(`داده‌های ناکافی برای تحلیل ${stockData.symbol}`);
    }

    // محاسبه اندیکاتورها
    const ema20 = this.calculateEMA(closingPrices, 20);
    const ema50 = this.calculateEMA(closingPrices, 50);
    const rsi = this.calculateRSI(closingPrices);
    const divergence = this.detectDivergence(closingPrices, this.calculateEMA(closingPrices, 14)); // ساده‌سازی شده

    const lastEma20 = ema20[ema20.length - 1];
    const lastEma50 = ema50[ema50.length - 1];
    const currentVolRatio = volume / avgVolume;

    const reasons: string[] = [];
    let score = 50; // امتیاز پایه

    // منطق امتیازدهی
    if (currentPrice > lastEma20 && lastEma20 > lastEma50) {
      score += 20;
      reasons.push('روند صعودی کوتاه‌مدت و میان‌مدت (EMA20 > EMA50)');
    } else if (currentPrice < lastEma20 && lastEma20 < lastEma50) {
      score -= 20;
      reasons.push('روند نزولی کوتاه‌مدت و میان‌مدت');
    }

    if (rsi < 30) {
      score += 15;
      reasons.push(`اشباع فروش در RSI (${rsi.toFixed(2)}) - احتمال بازگشت روند`);
    } else if (rsi > 70) {
      score -= 15;
      reasons.push(`اشباع خرید در RSI (${rsi.toFixed(2)}) - احتمال اصلاح`);
    }

    if (divergence === 'POSITIVE') {
      score += 25;
      reasons.push('شناسایی واگرایی مثبت بین قیمت و مومنتوم');
    } else if (divergence === 'NEGATIVE') {
      score -= 25;
      reasons.push('شناسایی واگرایی منفی بین قیمت و مومنتوم');
    }

    if (currentVolRatio > 2) {
      score += 10;
      reasons.push(`ورود حجم مشکوک (${currentVolRatio.toFixed(1)} برابر میانگین)`);
    }

    // تعیین سیگنال نهایی
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let strength: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK';

    if (score >= 75) {
      trend = 'BULLISH';
      strength = 'STRONG';
    } else if (score >= 60) {
      trend = 'BULLISH';
      strength = 'MODERATE';
    } else if (score <= 25) {
      trend = 'BEARISH';
      strength = 'STRONG';
    } else if (score <= 40) {
      trend = 'BEARISH';
      strength = 'MODERATE';
    }

    // محاسبه نقاط ورود و خروج
    let entryPoint: number | undefined;
    let stopLoss: number | undefined;
    let takeProfits: number[] | undefined;

    if (trend === 'BULLISH') {
      entryPoint = currentPrice;
      stopLoss = currentPrice * 0.95; // 5% حد ضرر اولیه (قابل بهبود با ATR)
      takeProfits = [
        currentPrice * 1.05, // هدف اول 5%
        currentPrice * 1.10, // هدف دوم 10%
        currentPrice * 1.15  // هدف سوم 15%
      ];
      reasons.push(`نقطه ورود پیشنهادی: ${entryPoint.toLocaleString()} ریال`);
      reasons.push(`حد ضرر: ${stopLoss.toLocaleString()} ریال`);
    }

    return {
      symbol: stockData.symbol,
      score: Math.max(0, Math.min(100, score)),
      trend,
      strength,
      indicators: { rsi, ema20: lastEma20, ema50: lastEma50 },
      patterns: divergence ? [divergence === 'POSITIVE' ? 'واگرایی مثبت' : 'واگرایی منفی'] : [],
      reasons,
      entryPoint,
      stopLoss,
      takeProfits,
      confidence: Math.min(95, 50 + (score - 50) * 0.8) // تبدیل امتیاز به درصد اطمینان
    };
  }
}

export const technicalEngine = new TechnicalAnalysisEngine();
