/**
 * مفسر سیگنال - تبدیل داده‌های خام به متن تحلیلی فارسی
 * تولید توضیحات قابل فهم برای سیگنال‌های خرید/فروش
 */

import { CompositeSignal as Signal } from '../analysisEngines';

export interface SignalReasonOutput {
  title: string;              // تیتر اصلی سیگنال
  description: string;        // پاراگراف تحلیلی کامل
  technicalReasons: string[]; // دلایل تکنیکال
  tableauReasons: string[];   // دلایل تابلوخوانی
  confidenceLevel: 'ضعیف' | 'متوسط' | 'قوی' | 'خیلی قوی'; // سطح اطمینان
  confidenceScore: number;    // امتیاز عددی اطمینان (0-100)
}

/**
 * تبدیل امتیاز اطمینان به سطح کیفی
 */
function getConfidenceLevel(score: number): 'ضعیف' | 'متوسط' | 'قوی' | 'خیلی قوی' {
  if (score >= 85) return 'خیلی قوی';
  if (score >= 70) return 'قوی';
  if (score >= 50) return 'متوسط';
  return 'ضعیف';
}

/**
 * تحلیل اندیکاتورهای تکنیکال و تولید متن توضیحی
 */
function analyzeTechnicalIndicators(signal: Signal): string[] {
  const reasons: string[] = [];
  const indicators = signal.indicators || {};

  // تحلیل RSI
  if (indicators.rsi !== undefined) {
    const rsi = indicators.rsi;
    if (rsi < 30) {
      reasons.push('RSI در منطقه اشباع فروش قرار دارد (زیر 30)');
    } else if (rsi > 70) {
      reasons.push('RSI در منطقه اشباع خرید قرار دارد (بالای 70)');
    }
    
    // بررسی واگرایی
    if (indicators.rsiDivergence === 'positive') {
      reasons.push('واگرایی مثبت در RSI مشاهده شد');
    } else if (indicators.rsiDivergence === 'negative') {
      reasons.push('واگرایی منفی در RSI مشاهده شد');
    }
  }

  // تحلیل MACD
  if (indicators.macd !== undefined) {
    const macd = indicators.macd;
    if (macd.signal === 'bullish_crossover') {
      reasons.push('MACD کراس صعودی داده است');
    } else if (macd.signal === 'bearish_crossover') {
      reasons.push('MACD کراس نزولی داده است');
    }
    
    if (macd.histogram > 0) {
      reasons.push('هیستوگرام MACD مثبت است');
    } else {
      reasons.push('هیستوگرام MACD منفی است');
    }
  }

  // تحلیل باندهای بولینگر
  if (indicators.bollingerBands !== undefined) {
    const bb = indicators.bollingerBands;
    const price = signal.currentPrice || 0;
    
    if (price <= bb.lower) {
      reasons.push('قیمت از کف باند بولینگر جهش کرده است');
    } else if (price >= bb.upper) {
      reasons.push('قیمت به سقف باند بولینگر رسیده است');
    }
    
    // بررسی فشردگی باندها
    if (bb.bandwidth < 0.05) { // کمتر از 5٪
      reasons.push('باندهای بولینگر فشرده شده‌اند (احتمال شکست قوی)');
    }
  }

  // تحلیل میانگین‌های متحرک
  if (indicators.ema20 !== undefined && indicators.ema50 !== undefined) {
    const ema20 = indicators.ema20;
    const ema50 = indicators.ema50;
    
    if (ema20 > ema50 && signal.action === 'buy') {
      reasons.push('میانگین متحرک 20 روزه بالای 50 روزه قرار دارد (روند صعودی)');
    } else if (ema20 < ema50 && signal.action === 'sell') {
      reasons.push('میانگین متحرک 20 روزه زیر 50 روزه قرار دارد (روند نزولی)');
    }
  }

  // تحلیل حجم
  if (indicators.volumeRatio !== undefined) {
    const volumeRatio = indicators.volumeRatio;
    if (volumeRatio > 2) {
      reasons.push(`حجم معاملات ${volumeRatio.toFixed(1)} برابر میانگین ماهانه است`);
    } else if (volumeRatio < 0.5) {
      reasons.push('حجم معاملات بسیار پایین است');
    }
  }

  return reasons;
}

/**
 * تحلیل داده‌های تابلوخوانی
 */
function analyzeTableauData(signal: Signal): string[] {
  const reasons: string[] = [];
  const tableau = signal.tableauData || {};

  // بررسی ورود پول هوشمند
  if (tableau.smartMoneyFlow === 'inflow') {
    reasons.push('ورود پول هوشمند به سهم مشاهده شد');
  } else if (tableau.smartMoneyFlow === 'outflow') {
    reasons.push('خروج پول هوشمند از سهم مشاهده شد');
  }

  // بررسی حجم مشکوک
  if (tableau.suspiciousVolume) {
    reasons.push('افزایش حجم مشکوک در معاملات');
  }

  // بررسی نسبت حقیقی به حقوقی
  if (tableau.realToLegalRatio !== undefined) {
    const ratio = tableau.realToLegalRatio;
    if (ratio > 3) {
      reasons.push('نسبت خرید حقیقی به حقوقی بسیار بالا است');
    } else if (ratio < 0.3) {
      reasons.push('نسبت فروش حقیقی به حقوقی بسیار بالا است');
    }
  }

  // بررسی قدرت خریدار به فروشنده
  if (tableau.buyerPower !== undefined) {
    const buyerPower = tableau.buyerPower;
    if (buyerPower > 1.5) {
      reasons.push('قدرت خریداران به فروشندگان برتری دارد');
    } else if (buyerPower < 0.67) {
      reasons.push('قدرت فروشندگان به خریداران برتری دارد');
    }
  }

  // بررسی سرانه خرید
  if (tableau.perCapitaBuy !== undefined) {
    const perCapita = tableau.perCapitaBuy;
    if (perCapita > 50000000) { // بیش از 50 میلیون ریال
      reasons.push('سرانه خرید حقیقی بالا است');
    }
  }

  return reasons;
}

/**
 * تولید تیتر جذاب برای سیگنال
 */
function generateTitle(signal: Signal, technicalReasons: string[], tableauReasons: string[]): string {
  const action = signal.action === 'buy' ? 'خرید' : 'فروش';
  const strength = getConfidenceLevel(signal.confidence || 50);
  
  // شناسایی دلیل اصلی
  let mainReason = '';
  
  if (technicalReasons.includes('واگرایی مثبت در RSI مشاهده شد')) {
    mainReason = 'واگرایی مثبت RSI';
  } else if (technicalReasons.includes('MACD کراس صعودی داده است')) {
    mainReason = 'کراس صعودی MACD';
  } else if (technicalReasons.includes('قیمت از کف باند بولینگر جهش کرده است')) {
    mainReason = 'جهش از کف باند بولینگر';
  } else if (tableauReasons.includes('ورود پول هوشمند به سهم مشاهده شد')) {
    mainReason = 'ورود پول هوشمند';
  } else if (tableauReasons.includes('افزایش حجم مشکوک در معاملات')) {
    mainReason = 'حجم مشکوک';
  } else if (technicalReasons.some(r => r.includes('اشباع فروش'))) {
    mainReason = 'اشباع فروش';
  } else if (technicalReasons.some(r => r.includes('اشباع خرید'))) {
    mainReason = 'اشباع خرید';
  } else {
    mainReason = 'تغییر روند';
  }

  return `سیگنال ${action} ${strength} - ${mainReason}`;
}

/**
 * تولید پاراگراف تحلیلی کامل
 */
function generateDescription(
  signal: Signal,
  title: string,
  technicalReasons: string[],
  tableauReasons: string[]
): string {
  const action = signal.action === 'buy' ? 'خرید' : 'فروش';
  const confidenceLevel = getConfidenceLevel(signal.confidence || 50);
  
  let description = `سیگنال ${action} ${confidenceLevel} شناسایی شد. `;
  
  // ترکیب دلایل اصلی
  const allReasons = [...technicalReasons, ...tableauReasons];
  
  if (allReasons.length > 0) {
    description += 'دلیل اصلی: ';
    
    // انتخاب 2-3 دلیل اصلی
    const topReasons = allReasons.slice(0, 3);
    
    if (topReasons.length === 1) {
      description += topReasons[0] + '. ';
    } else if (topReasons.length === 2) {
      description += topReasons.join(' همزمان با ') + '. ';
    } else {
      description += topReasons.slice(0, -1).join('، ') + ' و همچنین ' + topReasons[topReasons.length - 1] + '. ';
    }
  }
  
  // اضافه کردن اطلاعات قیمتی
  description += `قیمت فعلی: ${(signal.currentPrice || 0).toLocaleString('fa-IR')} ریال. `;
  
  if (signal.targetPrice) {
    description += `هدف قیمتی: ${signal.targetPrice.toLocaleString('fa-IR')} ریال. `;
  }
  
  if (signal.stopLoss) {
    description += `حد ضرر: ${signal.stopLoss.toLocaleString('fa-IR')} ریال. `;
  }
  
  // امتیاز اطمینان
  description += `امتیاز اطمینان: ${signal.confidence || 0}٪.`;
  
  return description;
}

/**
 * تابع اصلی - تولید توضیحات کامل برای یک سیگنال
 */
export function interpretSignal(signal: Signal): SignalReasonOutput {
  // تحلیل دلایل تکنیکال
  const technicalReasons = analyzeTechnicalIndicators(signal);
  
  // تحلیل دلایل تابلوخوانی
  const tableauReasons = analyzeTableauData(signal);
  
  // محاسبه سطح اطمینان
  const confidenceScore = signal.confidence || 50;
  const confidenceLevel = getConfidenceLevel(confidenceScore);
  
  // تولید تیتر
  const title = generateTitle(signal, technicalReasons, tableauReasons);
  
  // تولید توضیحات کامل
  const description = generateDescription(signal, title, technicalReasons, tableauReasons);
  
  return {
    title,
    description,
    technicalReasons,
    tableauReasons,
    confidenceLevel,
    confidenceScore
  };
}

/**
 * تولید توضیحات خلاصه برای نمایش سریع
 */
export function getQuickSignalSummary(signal: Signal): string {
  const interpretation = interpretSignal(signal);
  const action = signal.action === 'buy' ? '🟢 خرید' : '🔴 فروش';
  
  return `${action} ${signal.symbol}: ${interpretation.title} (اطمینان: ${interpretation.confidenceScore}٪)`;
}

/**
 * تولید توضیحات برای چندین سیگنال به صورت گروهی
 */
export function interpretMultipleSignals(signals: Signal[]): SignalReasonOutput[] {
  return signals.map(interpretSignal);
}
