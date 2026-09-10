/**
 * موتور تحلیل جریان پول هوشمند (حقیقی vs حقوقی)
 * تحلیل رفتار خریداران و فروشندگان بر اساس داده‌های واقعی TSETMC
 */

import type { RealTimeData } from './marketDataService';

export interface SmartMoneyAnalysis {
  netRealFlow: number; // خالص ورود/خروج پول حقیقی
  netLegalFlow: number; // خالص ورود/خروج پول حقوقی
  buyerPowerRatio: number; // نسبت قدرت خریدار به فروشنده
  volumeRatio: number; // نسبت حجم معاملات امروز به میانگین
  priceVolumeConfirmation: boolean; // تایید قیمت با حجم
  smartMoneySignal: 'buy' | 'sell' | 'neutral';
  confidence: number; // 0-100
  reasons: string[];
}

/**
 * تحلیل جریان پول هوشمند برای یک نماد
 */
export function analyzeSmartMoney(realTimeData: RealTimeData, avgVolume30Day: number = 0): SmartMoneyAnalysis {
  const reasons: string[] = [];
  
  // محاسبه خالص جریان پول حقیقی
  const netRealFlow = realTimeData.buyerValue - realTimeData.sellerValue;
  
  // محاسبه خالص جریان پول حقوقی (تخمینی)
  const totalValue = realTimeData.buyerValue + realTimeData.sellerValue;
  const legalValue = totalValue - (realTimeData.buyerValue + realTimeData.sellerValue);
  const netLegalFlow = realTimeData.sellerValue - realTimeData.buyerValue; // معکوس حقیقی
  
  // محاسبه نسبت قدرت خریدار به فروشنده
  const buyerPowerRatio = realTimeData.sellerCount > 0 
    ? realTimeData.buyerPower / realTimeData.sellerPower 
    : 1;
  
  // محاسبه نسبت حجم امروز به میانگین
  const volumeRatio = avgVolume30Day > 0 
    ? realTimeData.volume / avgVolume30Day 
    : 1;
  
  // بررسی تایید قیمت با حجم
  const priceVolumeConfirmation = (realTimeData.changePercent > 0 && volumeRatio > 1.2) ||
                                  (realTimeData.changePercent < 0 && volumeRatio > 1.2);
  
  // تعیین سیگنال پول هوشمند
  let smartMoneySignal: 'buy' | 'sell' | 'neutral' = 'neutral';
  let confidence = 50;
  
  // تحلیل ورود/خورد پول حقیقی
  if (netRealFlow > 0) {
    reasons.push(`ورود پول حقیقی: ${formatNumber(netRealFlow)} ریال`);
    confidence += 15;
    
    if (buyerPowerRatio > 1.5) {
      reasons.push(`قدرت خریدار حقیقی ${(buyerPowerRatio * 100).toFixed(0)}% بیشتر از فروشنده`);
      confidence += 10;
    }
  } else if (netRealFlow < 0) {
    reasons.push(`خروج پول حقیقی: ${formatNumber(Math.abs(netRealFlow))} ریال`);
    confidence -= 15;
    
    if (buyerPowerRatio < 0.7) {
      reasons.push(`قدرت فروشنده حقیقی ${(100 / buyerPowerRatio).toFixed(0)}% بیشتر از خریدار`);
      confidence -= 10;
    }
  }
  
  // تحلیل حجم معاملات
  if (volumeRatio > 2) {
    reasons.push(`حجم معاملات ${((volumeRatio - 1) * 100).toFixed(0)}% بیشتر از میانگین ماهانه`);
    confidence += 10;
  } else if (volumeRatio < 0.5) {
    reasons.push(`حجم معاملات ${(100 - volumeRatio * 100).toFixed(0)}% کمتر از میانگین ماهانه`);
    confidence -= 5;
  }
  
  // بررسی تایید قیمت و حجم
  if (priceVolumeConfirmation) {
    if (realTimeData.changePercent > 0) {
      reasons.push('رشد قیمت همراه با افزایش حجم (تایید صعود)');
      smartMoneySignal = 'buy';
      confidence += 15;
    } else {
      reasons.push('کاهش قیمت همراه با افزایش حجم (تایید نزول)');
      smartMoneySignal = 'sell';
      confidence -= 15;
    }
  }
  
  // تحلیل نهایی
  if (netRealFlow > 0 && buyerPowerRatio > 1.2 && realTimeData.changePercent > 0) {
    smartMoneySignal = 'buy';
    reasons.push('همسویی ورود پول، قدرت خریدار و رشد قیمت');
    confidence = Math.min(95, confidence + 20);
  } else if (netRealFlow < 0 && buyerPowerRatio < 0.8 && realTimeData.changePercent < 0) {
    smartMoneySignal = 'sell';
    reasons.push('همسویی خروج پول، ضعف خریدار و کاهش قیمت');
    confidence = Math.max(5, confidence - 20);
  }
  
  // محدود کردن اعتماد بین 5 تا 95
  confidence = Math.max(5, Math.min(95, confidence));
  
  return {
    netRealFlow,
    netLegalFlow,
    buyerPowerRatio,
    volumeRatio,
    priceVolumeConfirmation,
    smartMoneySignal,
    confidence,
    reasons,
  };
}

/**
 * فرمت کردن اعداد بزرگ به صورت خوانا
 */
function formatNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' میلیارد';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' میلیون';
  return num.toFixed(0);
}

/**
 * تشخیص بلوک معاملاتی مشکوک
 */
export function detectSuspiciousBlocks(realTimeData: RealTimeData): boolean {
  // اگر تعداد معاملات کم ولی ارزش هر معامله بسیار بالا باشد
  const avgTradeValue = realTimeData.value / (realTimeData.count || 1);
  const threshold = realTimeData.marketCap * 0.001; // 0.1% ارزش بازار
  
  return avgTradeValue > threshold && realTimeData.count < 100;
}

/**
 * محاسبه سرانه خرید و فروش حقیقی
 */
export function calculatePerCapita(realTimeData: RealTimeData) {
  return {
    buyerPerCapita: realTimeData.buyerCount > 0 
      ? realTimeData.buyerValue / realTimeData.buyerCount 
      : 0,
    sellerPerCapita: realTimeData.sellerCount > 0 
      ? realTimeData.sellerValue / realTimeData.sellerCount 
      : 0,
  };
}
