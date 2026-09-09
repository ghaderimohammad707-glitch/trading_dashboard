/**
 * موتور تحلیل بنیادی و ارزش‌گذاری ذاتی
 * بر اساس داده‌های واقعی صورت‌های مالی و اطلاعات بنیادی
 * بدون هیچگونه داده فیک یا شبیه‌سازی شده
 */

import { TSETMCStockData } from '../../services/tsetmcRealDataService';

export interface FundamentalAnalysis {
  fairValue: number; // ارزش ذاتی محاسبه شده
  currentPrice: number;
  upside: number; // پتانسیل رشد (درصد)
  recommendation: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';
  confidence: number;
  reasons: string[];
  
  // معیارهای بنیادی
  pe: number;
  eps: number;
  groupPE: number;
  pegRatio?: number;
  pbv?: number;
  dividendYield?: number;
  
  // ریسک‌ها
  risks: string[];
  opportunities: string[];
}

/**
 * محاسبه ارزش ذاتی با روش P/E نسبی
 * مناسب برای بازار ایران که داده‌های کامل صورت‌های مالی محدود است
 */
function calculateIntrinsicValuePERelative(
  stock: TSETMCStockData,
  industryGrowthRate: number = 0.25 // نرخ رشد صنعت (پیش‌فرض ۲۵٪ برای بورس ایران)
): { fairValue: number; pegRatio: number } {
  const { pe, eps, groupPE } = stock;
  
  if (!pe || pe <= 0 || !eps || eps <= 0) {
    return { fairValue: 0, pegRatio: 0 };
  }
  
  // محاسبه PEG Ratio
  const pegRatio = pe / (industryGrowthRate * 100);
  
  // ارزش ذاتی بر اساس میانگین P/E گروه و رشد شرکت
  // فرض: شرکت‌هایی با PEG زیر ۱ ارزنده هستند
  const fairPER = Math.min(pe, groupPE || pe) * (1 + Math.min(industryGrowthRate, 0.5));
  const fairValue = fairPER * eps;
  
  return { fairValue, pegRatio };
}

/**
 * محاسبه ارزش ذاتی با روش DCF ساده‌شده
 * برای شرکت‌هایی با جریان نقدی پایدار
 */
function calculateIntrinsicValueDCF(
  stock: TSETMCStockData,
  growthRate: number = 0.25,
  discountRate: number = 0.30, // نرخ تنزیل برای بازار ایران (ریسک بالا)
  terminalGrowthRate: number = 0.15
): number {
  const { eps } = stock;
  
  if (!eps || eps <= 0) return 0;
  
  // پیش‌بینی EPS برای ۵ سال آینده
  let futureEPS = eps;
  let totalValue = 0;
  
  for (let year = 1; year <= 5; year++) {
    futureEPS *= (1 + growthRate);
    // تنزیل به ارزش فعلی
    totalValue += futureEPS / Math.pow(1 + discountRate, year);
  }
  
  // ارزش پایانی (Terminal Value)
  const terminalValue = (futureEPS * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  totalValue += terminalValue / Math.pow(1 + discountRate, 5);
  
  return totalValue;
}

/**
 * تحلیل جامع بنیادی یک نماد
 */
export function analyzeFundamental(stock: TSETMCStockData): FundamentalAnalysis {
  const reasons: string[] = [];
  const risks: string[] = [];
  const opportunities: string[] = [];
  
  const { pe, eps, groupPE, price, marketCap } = stock;
  
  // اگر داده‌های بنیادی موجود نباشد
  if (!pe || pe <= 0 || !eps || eps <= 0) {
    return {
      fairValue: 0,
      currentPrice: price,
      upside: 0,
      recommendation: 'HOLD',
      confidence: 0,
      reasons: ['داده‌های بنیادی کافی برای تحلیل در دسترس نیست (P/E یا EPS نامعتبر)'],
      pe: pe || 0,
      eps: eps || 0,
      groupPE: groupPE || 0,
      risks: ['عدم شفافیت اطلاعات بنیادی'],
      opportunities: []
    };
  }
  
  // محاسبه ارزش ذاتی با دو روش
  const peValuation = calculateIntrinsicValuePERelative(stock);
  const dcfValuation = calculateIntrinsicValueDCF(stock);
  
  // میانگین وزن‌دار ارزش‌های ذاتی
  let fairValue = 0;
  let weightPE = 0.6; // وزن بیشتر به روش P/E نسبی برای بازار ایران
  let weightDCF = 0.4;
  
  if (peValuation.fairValue > 0 && dcfValuation > 0) {
    fairValue = (peValuation.fairValue * weightPE) + (dcfValuation * weightDCF);
  } else if (peValuation.fairValue > 0) {
    fairValue = peValuation.fairValue;
    weightDCF = 0;
  } else if (dcfValuation > 0) {
    fairValue = dcfValuation;
    weightPE = 0;
  }
  
  // محاسبه پتانسیل رشد
  const upside = ((fairValue - price) / price) * 100;
  
  // تحلیل P/E
  if (pe < (groupPE || pe) * 0.8) {
    reasons.push(`P/E سهم (${pe.toFixed(1)}) کمتر از میانگین گروه (${(groupPE || 0).toFixed(1)}) - ارزندگی نسبی`);
    opportunities.push('ارزندگی نسبت به هم‌گروهی‌ها');
  } else if (pe > (groupPE || pe) * 1.3) {
    reasons.push(`P/E سهم (${pe.toFixed(1)}) بالاتر از میانگین گروه (${(groupPE || 0).toFixed(1)}) - گران‌قیمت`);
    risks.push('قیمت‌گذاری بالاتر از ارزش ذاتی');
  } else {
    reasons.push(`P/E سهم (${pe.toFixed(1)}) نزدیک به میانگین گروه (${(groupPE || 0).toFixed(1)})`);
  }
  
  // تحلیل PEG Ratio
  if (peValuation.pegRatio > 0) {
    if (peValuation.pegRatio < 1) {
      reasons.push(`PEG Ratio (${peValuation.pegRatio.toFixed(2)}) زیر ۱ - سهم ارزنده نسبت به رشد`);
      opportunities.push('رشد قیمت متناسب با PEG پایین');
    } else if (peValuation.pegRatio > 2) {
      reasons.push(`PEG Ratio (${peValuation.pegRatio.toFixed(2)}) بالای ۲ - سهم گران نسبت به رشد`);
      risks.push('ریسک اصلاح قیمت به دلیل PEG بالا');
    } else {
      reasons.push(`PEG Ratio (${peValuation.pegRatio.toFixed(2)}) در محدوده متعادل`);
    }
  }
  
  // تحلیل حاشیه ایمنی
  const marginOfSafety = ((fairValue - price) / fairValue) * 100;
  if (marginOfSafety > 30) {
    reasons.push(`حاشیه ایمنی ${(marginOfSafety).toFixed(1)}% - فرصت خرید عالی`);
    opportunities.push('حاشیه ایمنی بالا برای سرمایه‌گذاری کم‌ریسک');
  } else if (marginOfSafety > 15) {
    reasons.push(`حاشیه ایمنی ${(marginOfSafety).toFixed(1)}% - فرصت خرید خوب`);
    opportunities.push('حاشیه ایمنی مناسب');
  } else if (marginOfSafety < -20) {
    reasons.push(`قیمت ${(Math.abs(marginOfSafety)).toFixed(1)}% بالاتر از ارزش ذاتی - ریسک فروش`);
    risks.push('عدم وجود حاشیه ایمنی');
  }
  
  // تحلیل اندازه بازار
  if (marketCap < 1000000000000) { // کمتر از ۱۰۰۰ میلیارد تومان
    opportunities.push('شرکت کوچک با پتانسیل رشد بالا');
    risks.push('نقدشوندگی پایین‌تر و ریسک بالاتر');
  } else if (marketCap > 50000000000000) { // بیشتر از ۵۰ هزار میلیارد تومان
    opportunities.push('شرکت بزرگ با ثبات بالا');
    risks.push('رشد کندتر به دلیل اندازه بزرگ');
  }
  
  // تعیین توصیه نهایی
  let recommendation: FundamentalAnalysis['recommendation'] = 'HOLD';
  let confidence = 0;
  
  if (upside > 40 && marginOfSafety > 30) {
    recommendation = 'STRONG_BUY';
    confidence = Math.min(95, 70 + (upside - 40) * 0.5);
  } else if (upside > 20 && marginOfSafety > 15) {
    recommendation = 'BUY';
    confidence = 55 + upside * 0.5;
  } else if (upside < -30 || marginOfSafety < -30) {
    recommendation = 'STRONG_SELL';
    confidence = Math.min(95, 70 + (Math.abs(upside) - 30) * 0.5);
  } else if (upside < -15 || marginOfSafety < -15) {
    recommendation = 'SELL';
    confidence = 50 + Math.abs(upside) * 0.5;
  } else {
    recommendation = 'HOLD';
    confidence = 50 - Math.abs(upside) * 0.3;
  }
  
  // اضافه کردن نکات کلیدی به دلایل
  if (upside > 0) {
    reasons.push(`پتانسیل رشد ${(upside).toFixed(1)}% تا رسیدن به ارزش ذاتی (${Math.round(fairValue)} تومان)`);
  } else {
    reasons.push(`ریسک ریزش ${(Math.abs(upside)).toFixed(1)}% تا رسیدن به ارزش ذاتی (${Math.round(fairValue)} تومان)`);
  }
  
  return {
    fairValue: Math.round(fairValue),
    currentPrice: price,
    upside: Math.round(upside),
    recommendation,
    confidence: Math.round(confidence),
    reasons,
    pe,
    eps,
    groupPE: groupPE || 0,
    pegRatio: peValuation.pegRatio,
    risks,
    opportunities
  };
}
