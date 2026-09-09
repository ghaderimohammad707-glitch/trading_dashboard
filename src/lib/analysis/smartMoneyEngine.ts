/**
 * موتور تحلیل جریان پول هوشمند (Smart Money Flow)
 * تحلیل رفتار حقیقی‌ها و حقوقی‌ها بر اساس داده‌های واقعی TSETMC
 * بدون هیچگونه داده فیک یا شبیه‌سازی شده
 */

import { OrderBookData, TSETMCStockData } from '../../services/tsetmcRealDataService';

export interface SmartMoneyAnalysis {
  realMoneyFlow: 'ورود' | 'خروج' | 'خنثی';
  legalMoneyFlow: 'ورود' | 'خروج' | 'خنثی';
  smartMoneySignal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasons: string[];
  
  // جزئیات دقیق
  realBuyPerCapita: number; // سرانه خرید حقیقی
  realSellPerCapita: number; // سرانه فروش حقیقی
  legalNetVolume: number; // حجم خالص حقوقی
  powerRatio: number; // نسبت قدرت خریدار به فروشنده
  volumeBalance: number; // تعادل حجمی
  
  // هشدارها
  alerts: string[];
}

/**
 * تحلیل جریان پول هوشمند
 * بر اساس داده‌های واقعی معاملات حقیقی و حقوقی
 */
export function analyzeSmartMoneyFlow(
  stockData: TSETMCStockData,
  orderBook: OrderBookData | null
): SmartMoneyAnalysis {
  const reasons: string[] = [];
  const alerts: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;
  
  // اگر داده‌های کتاب سفارش موجود نباشد، تحلیل محدود می‌شود
  if (!orderBook) {
    return {
      realMoneyFlow: 'خنثی',
      legalMoneyFlow: 'خنثی',
      smartMoneySignal: 'HOLD',
      confidence: 0,
      reasons: ['داده‌های کافی برای تحلیل جریان پول هوشمند در دسترس نیست'],
      realBuyPerCapita: 0,
      realSellPerCapita: 0,
      legalNetVolume: 0,
      powerRatio: 1,
      volumeBalance: 0,
      alerts: ['نیاز به دریافت داده‌های لحظه‌ای کتاب سفارش']
    };
  }
  
  // محاسبه سرانه خرید و فروش حقیقی
  const realBuyPerCapita = orderBook.realBuyCount > 0 
    ? orderBook.realBuyVolume / orderBook.realBuyCount 
    : 0;
  const realSellPerCapita = orderBook.realSellCount > 0 
    ? orderBook.realSellVolume / orderBook.realSellCount 
    : 0;
  
  // محاسبه حجم خالص حقوقی
  const legalNetVolume = orderBook.legalBuyVolume - orderBook.legalSellVolume;
  
  // محاسبه نسبت قدرت خریدار به فروشنده
  const totalBuyPower = orderBook.realBuyVolume + orderBook.legalBuyVolume;
  const totalSellPower = orderBook.realSellVolume + orderBook.legalSellVolume;
  const powerRatio = totalSellPower > 0 ? totalBuyPower / totalSellPower : 1;
  
  // محاسبه تعادل حجمی
  const volumeBalance = totalBuyPower - totalSellPower;
  
  // تحلیل رفتار حقیقی‌ها
  if (realBuyPerCapita > realSellPerCapita * 1.2) {
    reasons.push(`سرانه خرید حقیقی‌ها (${Math.round(realBuyPerCapita)}) بیشتر از سرانه فروش (${Math.round(realSellPerCapita)}) - تمایل به خرید`);
    bullishScore += 3;
    
    if (realBuyPerCapita > realSellPerCapita * 2) {
      alerts.push('⚠️ ورود قوی پول هوشمند حقیقی - توجه ویژه');
      bullishScore += 2;
    }
  } else if (realSellPerCapita > realBuyPerCapita * 1.2) {
    reasons.push(`سرانه فروش حقیقی‌ها (${Math.round(realSellPerCapita)}) بیشتر از سرانه خرید (${Math.round(realBuyPerCapita)}) - تمایل به فروش`);
    bearishScore += 3;
    
    if (realSellPerCapita > realBuyPerCapita * 2) {
      alerts.push('⚠️ خروج قوی پول حقیقی - ریسک بالا');
      bearishScore += 2;
    }
  } else {
    reasons.push('سرانه خرید و فروش حقیقی‌ها متعادل است');
  }
  
  // تحلیل رفتار حقوقی‌ها
  if (legalNetVolume > 0) {
    const netPercent = ((legalNetVolume / (orderBook.legalBuyVolume + orderBook.legalSellVolume || 1)) * 100);
    reasons.push(`حقوقی‌ها خریدار خالص هستند (${Math.abs(Math.round(legalNetVolume))} سهم - ${netPercent.toFixed(1)}%)`);
    bullishScore += 2;
    
    if (netPercent > 50) {
      alerts.push('✅ حمایت قوی حقوقی از سهم');
      bullishScore += 2;
    }
  } else if (legalNetVolume < 0) {
    const netPercent = ((Math.abs(legalNetVolume) / (orderBook.legalBuyVolume + orderBook.legalSellVolume || 1)) * 100);
    reasons.push(`حقوقی‌ها فروشنده خالص هستند (${Math.abs(Math.round(legalNetVolume))} سهم - ${netPercent.toFixed(1)}%)`);
    bearishScore += 2;
    
    if (netPercent > 50) {
      alerts.push('❌ فشار فروش حقوقی - احتیاط');
      bearishScore += 2;
    }
  } else {
    reasons.push('فعالیت حقوقی‌ها متعادل است');
  }
  
  // تحلیل نسبت قدرت
  if (powerRatio > 1.5) {
    reasons.push(`قدرت خریداران ${((powerRatio - 1) * 100).toFixed(0)}% بیشتر از فروشندگان است`);
    bullishScore += 2;
  } else if (powerRatio < 0.67) {
    reasons.push(`قدرت فروشندگان ${((1 - powerRatio) * 100).toFixed(0)}% بیشتر از خریداران است`);
    bearishScore += 2;
  }
  
  // تحلیل تعادل حجمی
  const totalVolume = totalBuyPower + totalSellPower;
  const volumeBalancePercent = totalVolume > 0 ? (volumeBalance / totalVolume) * 100 : 0;
  
  if (volumeBalancePercent > 20) {
    reasons.push('تعادل حجمی به نفع خریداران است');
    bullishScore += 1;
  } else if (volumeBalancePercent < -20) {
    reasons.push('تعادل حجمی به نفع فروشندگان است');
    bearishScore += 1;
  }
  
  // تحلیل همزمانی قیمت و جریان پول
  if (stockData.changePercent > 2 && powerRatio > 1.2) {
    reasons.push('رشد قیمت همراه با ورود پول - تأیید روند صعودی');
    bullishScore += 2;
  } else if (stockData.changePercent < -2 && powerRatio < 0.8) {
    reasons.push('ریزش قیمت همراه با خروج پول - تأیید روند نزولی');
    bearishScore += 2;
  } else if (stockData.changePercent > 3 && powerRatio < 0.9) {
    alerts.push('⚠️ رشد قیمت بدون پشتوانه حجمی - احتمال بازگشت');
    bearishScore += 2;
  } else if (stockData.changePercent < -3 && powerRatio > 1.1) {
    alerts.push('✅ ریزش قیمت با ورود پول - فرصت خرید پله‌ای');
    bullishScore += 2;
  }
  
  // تعیین سیگنال نهایی
  const totalScore = bullishScore - bearishScore;
  let smartMoneySignal: SmartMoneyAnalysis['smartMoneySignal'] = 'HOLD';
  let confidence = 0;
  
  if (totalScore >= 6) {
    smartMoneySignal = 'BUY';
    confidence = Math.min(95, 60 + (totalScore - 6) * 5);
  } else if (totalScore >= 3) {
    smartMoneySignal = 'BUY';
    confidence = 45 + totalScore * 5;
  } else if (totalScore <= -6) {
    smartMoneySignal = 'SELL';
    confidence = Math.min(95, 60 + (Math.abs(totalScore) - 6) * 5);
  } else if (totalScore <= -3) {
    smartMoneySignal = 'SELL';
    confidence = 45 + Math.abs(totalScore) * 5;
  } else {
    smartMoneySignal = 'HOLD';
    confidence = 50 - Math.abs(totalScore) * 3;
  }
  
  // تعیین جهت جریان پول
  let realMoneyFlow: SmartMoneyAnalysis['realMoneyFlow'] = 'خنثی';
  let legalMoneyFlow: SmartMoneyAnalysis['legalMoneyFlow'] = 'خنثی';
  
  if (realBuyPerCapita > realSellPerCapita * 1.1) realMoneyFlow = 'ورود';
  else if (realSellPerCapita > realBuyPerCapita * 1.1) realMoneyFlow = 'خروج';
  
  if (legalNetVolume > 0) legalMoneyFlow = 'ورود';
  else if (legalNetVolume < 0) legalMoneyFlow = 'خروج';
  
  return {
    realMoneyFlow,
    legalMoneyFlow,
    smartMoneySignal,
    confidence: Math.round(confidence),
    reasons,
    realBuyPerCapita,
    realSellPerCapita,
    legalNetVolume,
    powerRatio,
    volumeBalance,
    alerts
  };
}
