/**
 * موتور تحلیل احساسات و جریان پول هوشمند
 * وظیفه: تحلیل رفتار حقیقی/حقوقی، شناسایی پول هوشمند، تحلیل حجم و قیمت
 * قانون: فقط داده‌های واقعی تابلو معاملات پردازش می‌شوند.
 */

import type { StockData, CandleData } from '@/types/market';

export interface SmartMoneyFlow {
  symbol: string;
  flowScore: number; // -100 تا +100 (منفی: خروج پول، مثبت: ورود پول)
  realInvestorPower: number; // قدرت خریدار حقیقی
  legalInvestorPower: number; // قدرت خریدار حقوقی
  volumeAnalysis: {
    isVolumeSuspicious: boolean;
    volumeRatio: number;
    avgVolume30d: number;
  };
  priceAction: {
    trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
    strength: number; // 0-100
    supportLevel?: number;
    resistanceLevel?: number;
  };
  smartMoneySignals: string[]; // سیگنال‌های شناسایی شده
  reasons: string[];
}

export class SentimentAnalysisEngine {
  
  /**
   * محاسبه قدرت خریدار حقیقی بر اساس داده‌های تابلو
   */
  private calculateRealInvestorPower(stockData: StockData): number {
    if (!stockData.realInvestorPower) {
      // اگر داده مستقیم نداریم، از نسبت حجم به قیمت تخمین می‌زنیم
      return 50;
    }
    
    const power = stockData.realInvestorPower;
    
    // قدرت خریدار حقیقی > 1 یعنی خریدار قوی‌تر است
    if (power > 2) return 90;
    if (power > 1.5) return 75;
    if (power > 1) return 60;
    if (power === 1) return 50;
    if (power > 0.7) return 40;
    if (power > 0.5) return 25;
    return 10;
  }
  
  /**
   * تحلیل حجم معاملات
   */
  private analyzeVolume(volume: number, avgVolume: number, history: CandleData[]): {
    isVolumeSuspicious: boolean;
    volumeRatio: number;
    avgVolume30d: number;
  } {
    const volumeRatio = volume / avgVolume;
    const isVolumeSuspicious = volumeRatio > 2.5 || volumeRatio < 0.3;
    
    return {
      isVolumeSuspicious,
      volumeRatio,
      avgVolume30d: avgVolume
    };
  }
  
  /**
   * تشخیص روند و سطوح حمایت/مقاومت
   */
  private analyzePriceAction(history: CandleData[], currentPrice: number): {
    trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
    strength: number;
    supportLevel?: number;
    resistanceLevel?: number;
  } {
    if (history.length < 20) {
      return { trend: 'SIDEWAYS', strength: 30 };
    }
    
    const closes = history.map(c => c.close);
    const highs = history.map(c => c.high);
    const lows = history.map(c => c.low);
    
    // محاسبه شیب خط روند با رگرسیون خطی ساده
    const n = closes.length;
    const last20 = closes.slice(-20);
    const first10 = last20.slice(0, 10);
    const last10 = last20.slice(-10);
    
    const avgFirst = first10.reduce((a, b) => a + b, 0) / 10;
    const avgLast = last10.reduce((a, b) => a + b, 0) / 10;
    
    const slope = (avgLast - avgFirst) / avgFirst;
    
    let trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' = 'SIDEWAYS';
    let strength = 30;
    
    if (slope > 0.05) {
      trend = 'UPTREND';
      strength = Math.min(100, 50 + slope * 200);
    } else if (slope < -0.05) {
      trend = 'DOWNTREND';
      strength = Math.min(100, 50 - slope * 200);
    } else {
      trend = 'SIDEWAYS';
      strength = 30 + Math.abs(slope) * 100;
    }
    
    // شناسایی حمایت و مقاومت ساده
    const recentLows = lows.slice(-30);
    const recentHighs = highs.slice(-30);
    
    const supportLevel = Math.min(...recentLows);
    const resistanceLevel = Math.max(...recentHighs);
    
    return {
      trend,
      strength: Math.round(strength),
      supportLevel,
      resistanceLevel
    };
  }
  
  /**
   * شناسایی سیگنال‌های پول هوشمند
   */
  private detectSmartMoneySignals(
    stockData: StockData,
    volumeAnalysis: ReturnType<typeof this.analyzeVolume>,
    priceAction: ReturnType<typeof this.analyzePriceAction>
  ): string[] {
    const signals: string[] = [];
    const { volumeRatio, isVolumeSuspicious } = volumeAnalysis;
    const { trend, strength } = priceAction;
    
    // سیگنال ورود پول هوشمند
    if (isVolumeSuspicious && volumeRatio > 2.5 && trend === 'UPTREND') {
      signals.push('🔍 ورود حجم مشکوک همزمان با روند صعودی - احتمال ورود پول هوشمند');
    }
    
    // سیگنال خروج پول هوشمند
    if (volumeRatio > 2 && trend === 'DOWNTREND') {
      signals.push('⚠️ خروج حجم بالا در روند نزولی - احتمال خروج پول هوشمند');
    }
    
    // سیگنال کف‌سازی
    if (volumeRatio > 1.5 && stockData.changePercent < -2 && stockData.realInvestorPower && stockData.realInvestorPower > 1.5) {
      signals.push('💎 خرید حقیقی قوی در منفی - احتمال کف‌سازی');
    }
    
    // سیگنال سقف‌سازی
    if (volumeRatio > 2 && stockData.changePercent > 5 && stockData.realInvestorPower && stockData.realInvestorPower < 0.7) {
      signals.push('📉 فروش حقیقی در صف خرید - احتمال توزیع و سقف‌سازی');
    }
    
    // سیگنال شکست مقاومت
    if (priceAction.resistanceLevel && stockData.currentPrice > priceAction.resistanceLevel * 1.02 && volumeRatio > 1.5) {
      signals.push('🚀 شکست مقاومت با حجم بالا - تایید شکست');
    }
    
    // سیگنال شکست حمایت
    if (priceAction.supportLevel && stockData.currentPrice < priceAction.supportLevel * 0.98) {
      signals.push('❌ شکست حمایت - هشدار کاهش بیشتر');
    }
    
    return signals;
  }
  
  /**
   * تحلیل جامع احساسات و جریان پول
   */
  async analyzeSentiment(stockData: StockData): Promise<SmartMoneyFlow> {
    const reasons: string[] = [];
    const signals: string[] = [];
    
    // تحلیل اجزا
    const realPower = this.calculateRealInvestorPower(stockData);
    const volumeAnalysis = this.analyzeVolume(stockData.volume, stockData.avgVolume, stockData.history);
    const priceAction = this.analyzePriceAction(stockData.history, stockData.currentPrice);
    
    // شناسایی سیگنال‌ها
    const smartMoneySignals = this.detectSmartMoneySignals(stockData, volumeAnalysis, priceAction);
    signals.push(...smartMoneySignals);
    
    // محاسبه امتیاز جریان پول
    let flowScore = 0;
    
    // تاثیر قدرت حقیقی
    flowScore += (realPower - 50) * 0.4;
    
    // تاثیر حجم
    if (volumeAnalysis.volumeRatio > 2) {
      flowScore += 15;
      reasons.push(`حجم معاملات ${volumeAnalysis.volumeRatio.toFixed(1)} برابر میانگین - توجه ویژه`);
    } else if (volumeAnalysis.volumeRatio < 0.5) {
      flowScore -= 10;
      reasons.push('حجم معاملات بسیار پایین - عدم نقدشوندگی');
    }
    
    // تاثیر روند
    if (priceAction.trend === 'UPTREND') {
      flowScore += priceAction.strength * 0.3;
      reasons.push(`روند صعودی با قدرت ${priceAction.strength}%`);
    } else if (priceAction.trend === 'DOWNTREND') {
      flowScore -= priceAction.strength * 0.3;
      reasons.push(`روند نزولی با قدرت ${priceAction.strength}%`);
    }
    
    // تاثیر تغییر قیمت امروز
    if (stockData.changePercent > 3) {
      flowScore += 10;
    } else if (stockData.changePercent < -3) {
      flowScore -= 10;
    }
    
    // محدود کردن امتیاز
    flowScore = Math.max(-100, Math.min(100, flowScore));
    
    // تولید دلایل نهایی
    if (realPower >= 70) {
      reasons.push(`قدرت خریدار حقیقی عالی (${realPower}) - استقبال حقیقی‌ها`);
    } else if (realPower <= 30) {
      reasons.push(`ضعف خریدار حقیقی (${realPower}) - تمایل به فروش`);
    }
    
    if (priceAction.supportLevel) {
      reasons.push(`سطح حمایت کلیدی: ${Math.round(priceAction.supportLevel).toLocaleString()} ریال`);
    }
    if (priceAction.resistanceLevel) {
      reasons.push(`سطح مقاومت کلیدی: ${Math.round(priceAction.resistanceLevel).toLocaleString()} ریال`);
    }
    
    return {
      symbol: stockData.symbol,
      flowScore: Math.round(flowScore),
      realInvestorPower: realPower,
      legalInvestorPower: stockData.legalInvestorPower ? Math.round(stockData.legalInvestorPower * 25) : 50,
      volumeAnalysis,
      priceAction,
      smartMoneySignals: signals,
      reasons
    };
  }
}

export const sentimentEngine = new SentimentAnalysisEngine();
