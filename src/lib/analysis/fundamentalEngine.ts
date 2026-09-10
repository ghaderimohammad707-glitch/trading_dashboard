/**
 * موتور تحلیل بنیادی و ارزش‌گذاری ذاتی
 * محاسبه ارزش ذاتی، P/E، PEG و مدل DCF بر اساس داده‌های واقعی
 */

import type { RealTimeData } from './marketDataService';

export interface FundamentalAnalysis {
  pe: number;
  peg: number;
  pb: number;
  dy: number; // Dividend Yield
  intrinsicValue: number; // ارزش ذاتی بر اساس DCF
  fairValue: number; // ارزش منصفانه
  undervalued: boolean; // آیا زیر ارزش ذاتی است؟
  overvalued: boolean; // آیا بالای ارزش ذاتی است؟
  fundamentalScore: number; // امتیاز بنیادی 0-100
  reasons: string[];
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
}

/**
 * تحلیل بنیادی کامل برای یک نماد
 */
export function analyzeFundamental(realTimeData: RealTimeData, sectorAvgPE: number = 6): FundamentalAnalysis {
  const reasons: string[] = [];
  
  const { pe, eps, marketCap, lastPrice } = realTimeData;
  
  // محاسبه PEG (فرض رشد سودآوری 20% برای شرکت‌های ایرانی)
  const expectedGrowth = 20; // درصد رشد سالانه مورد انتظار
  const peg = pe > 0 ? pe / expectedGrowth : 0;
  
  // محاسبه P/B (فرض ارزش دفتری 80% قیمت جاری)
  const bookValue = lastPrice * 0.8;
  const pb = lastPrice / bookValue;
  
  // محاسبه بازده dividend (فرض پرداخت 30% سود نقدی)
  const dividendPerShare = eps * 0.3;
  const dy = lastPrice > 0 ? (dividendPerShare / lastPrice) * 100 : 0;
  
  // محاسبه ارزش ذاتی با مدل DCF ساده‌شده
  const freeCashFlow = eps * 0.9; // فرض 90% سود به عنوان جریان نقد آزاد
  const discountRate = 0.25; // نرخ تنزیل 25% برای ریسک بازار ایران
  const terminalGrowth = 0.15; // رشد بلندمدت 15%
  
  let intrinsicValue = 0;
  if (discountRate > terminalGrowth && freeCashFlow > 0) {
    // مدل گوردون برای ارزش‌گذاری
    intrinsicValue = (freeCashFlow * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  } else {
    intrinsicValue = lastPrice * 1.2; // پیش‌فرض 20% بالاتر از قیمت فعلی
  }
  
  // ارزش منصفانه بر اساس میانگین روش‌ها
  const fairValue = (intrinsicValue + (bookValue * 1.1) + (lastPrice * (sectorAvgPE / pe || 1))) / 3;
  
  // تعیین وضعیت ارزش‌گذاری
  const undervalued = lastPrice < fairValue * 0.8; // حداقل 20% زیر ارزش منصفانه
  const overvalued = lastPrice > fairValue * 1.2; // حداقل 20% بالای ارزش منصفانه
  
  // محاسبه امتیاز بنیادی
  let fundamentalScore = 50;
  
  // تحلیل P/E
  if (pe > 0 && pe < sectorAvgPE * 0.7) {
    reasons.push(`P/E پایین (${pe.toFixed(1)}) نسبت به میانگین صنعت (${sectorAvgPE})`);
    fundamentalScore += 15;
  } else if (pe > sectorAvgPE * 1.5) {
    reasons.push(`P/E بالا (${pe.toFixed(1)}) نسبت به میانگین صنعت`);
    fundamentalScore -= 15;
  } else if (pe > 0) {
    reasons.push(`P/E متعادل (${pe.toFixed(1)})`);
  }
  
  // تحلیل PEG
  if (peg > 0 && peg < 1) {
    reasons.push(`PEG مناسب (${peg.toFixed(2)}) نشان‌دهنده رشد کافی نسبت به قیمت`);
    fundamentalScore += 10;
  } else if (peg > 2) {
    reasons.push(`PEG بالا (${peg.toFixed(2)}) نشان‌دهنده قیمت‌گذاری بیش از حد`);
    fundamentalScore -= 10;
  }
  
  // تحلیل ارزش ذاتی
  if (undervalued) {
    const discount = ((fairValue - lastPrice) / lastPrice) * 100;
    reasons.push(`زیر ارزش ذاتی (${discount.toFixed(1)}% تخفیف)`);
    fundamentalScore += 20;
  } else if (overvalued) {
    const premium = ((lastPrice - fairValue) / fairValue) * 100;
    reasons.push(`بالای ارزش ذاتی (${premium.toFixed(1)}% حباب)`);
    fundamentalScore -= 20;
  } else {
    reasons.push('قیمت نزدیک به ارزش منصفانه');
  }
  
  // تحلیل بازده سود نقدی
  if (dy > 15) {
    reasons.push(`بازده سود نقدی عالی (${dy.toFixed(1)}%)`);
    fundamentalScore += 10;
  } else if (dy > 8) {
    reasons.push(`بازده سود نقدی مناسب (${dy.toFixed(1)}%)`);
    fundamentalScore += 5;
  }
  
  // محدود کردن امتیاز بین 5 تا 95
  fundamentalScore = Math.max(5, Math.min(95, fundamentalScore));
  
  // تعیین توصیه نهایی
  let recommendation: FundamentalAnalysis['recommendation'] = 'hold';
  
  if (fundamentalScore >= 80 && undervalued) {
    recommendation = 'strong_buy';
  } else if (fundamentalScore >= 65 && undervalued) {
    recommendation = 'buy';
  } else if (fundamentalScore <= 25 && overvalued) {
    recommendation = 'strong_sell';
  } else if (fundamentalScore <= 40 && overvalued) {
    recommendation = 'sell';
  } else {
    recommendation = 'hold';
  }
  
  return {
    pe,
    peg,
    pb,
    dy,
    intrinsicValue,
    fairValue,
    undervalued,
    overvalued,
    fundamentalScore,
    reasons,
    recommendation,
  };
}

/**
 * مقایسه بنیادی چند نماد
 */
export function compareFundamentals(dataList: RealTimeData[]) {
  return dataList.map(data => {
    const analysis = analyzeFundamental(data);
    return {
      symbol: data.symbol,
      pe: data.pe,
      peg: analysis.peg,
      fundamentalScore: analysis.fundamentalScore,
      recommendation: analysis.recommendation,
    };
  }).sort((a, b) => b.fundamentalScore - a.fundamentalScore);
}
