/**
 * فاز ۳: هوش مصنوعی و تحلیل چندلایه
 * ماژول محاسبه خودکار ریسک به ریوارد (Risk/Reward Calculator)
 * 
 * هدف: محاسبه بهینه نقاط ورود، حد ضرر (SL) و حد سود (TP) بر اساس نوسانات بازار
 */

import { OHLCV as Candle } from '../backtest/types';
import { calculateATR, detectMarketRegime } from './marketRegime';

export interface RiskRewardAnalysis {
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number; // TP1 - خروج جزئی (50%)
  takeProfit2: number; // TP2 - خروج کامل
  riskRewardRatio: number; // نسبت R/R
  positionSize: number; // حجم پیشنهادی بر اساس ریسک
  riskPercent: number; // درصد ریسک از کل سرمایه
  atrMultiplier: number; // ضریب ATR استفاده‌شده
  confidence: number; // امتیاز اطمینان 0-100
  reasoning: string[]; // دلایل محاسبات
}

export interface PositionSizingParams {
  totalCapital: number; // کل سرمایه
  riskPerTrade: number; // ریسک مجاز به درصد (مثلاً 2%)
  entryPrice: number;
  stopLoss: number;
}

/**
 * محاسبه نقاط ورود، حد ضرر و حد سود بر اساس ATR
 */
export function calculateRiskReward(
  candles: Candle[],
  signalType: 'BUY' | 'SELL',
  atrPeriod: number = 14,
  slMultiplier: number = 2.0,
  tpMultiplier: number = 3.0
): RiskRewardAnalysis {
  const reasoning: string[] = [];
  
  if (candles.length < atrPeriod + 1) {
    return {
      entryPrice: 0,
      stopLoss: 0,
      takeProfit1: 0,
      takeProfit2: 0,
      riskRewardRatio: 0,
      positionSize: 0,
      riskPercent: 0,
      atrMultiplier: 0,
      confidence: 0,
      reasoning: ['داده‌های کافی برای محاسبه ATR موجود نیست']
    };
  }
  
  const atrValues = calculateATR(candles, atrPeriod);
  const currentATR = atrValues[atrValues.length - 1];
  const currentClose = candles[candles.length - 1].close;
  const currentHigh = candles[candles.length - 1].high;
  const currentLow = candles[candles.length - 1].low;
  
  // تشخیص رژیم بازار برای تنظیم ضرایب
  const regime = detectMarketRegime(candles, atrPeriod);
  
  let adjustedSlMultiplier = slMultiplier;
  let adjustedTpMultiplier = tpMultiplier;
  
  // در بازارهای پرنوسان، ضرایب را افزایش می‌دهیم
  if (regime.volatility > 3) {
    adjustedSlMultiplier *= 1.2;
    adjustedTpMultiplier *= 1.3;
    reasoning.push(`نوسان بالا (${regime.volatility.toFixed(1)}٪) - ضرایب‌ها تعدیل شدند`);
  }
  
  // در بازار رنج، فواصل را کاهش می‌دهیم
  if (regime.regime === 'RANGING') {
    adjustedSlMultiplier *= 0.8;
    adjustedTpMultiplier *= 0.9;
    reasoning.push('بازار رنج - فواصل کوتاه‌تر شدند');
  }
  
  let entryPrice: number;
  let stopLoss: number;
  let takeProfit1: number;
  let takeProfit2: number;
  
  if (signalType === 'BUY') {
    entryPrice = currentClose;
    stopLoss = entryPrice - (currentATR * adjustedSlMultiplier);
    
    // TP1: ریسک به ریوارد 1:1.5
    takeProfit1 = entryPrice + (currentATR * adjustedSlMultiplier * 1.5);
    
    // TP2: ریسک به ریوارد 1:3
    takeProfit2 = entryPrice + (currentATR * adjustedTpMultiplier);
    
    reasoning.push(`سیگنال خرید شناسایی شد`);
    reasoning.push(`ATR فعلی: ${currentATR.toFixed(2)} واحد`);
    reasoning.push(`حد ضرر: ${adjustedSlMultiplier.toFixed(1)} برابر ATR زیر قیمت ورود`);
    reasoning.push(`حد سود اول: 1.5 برابر ریسک`);
    reasoning.push(`حد سود دوم: ${adjustedTpMultiplier.toFixed(1)} برابر ATR`);
    
  } else { // SELL
    entryPrice = currentClose;
    stopLoss = entryPrice + (currentATR * adjustedSlMultiplier);
    
    // TP1: ریسک به ریوارد 1:1.5
    takeProfit1 = entryPrice - (currentATR * adjustedSlMultiplier * 1.5);
    
    // TP2: ریسک به ریوارد 1:3
    takeProfit2 = entryPrice - (currentATR * adjustedTpMultiplier);
    
    reasoning.push(`سیگنال فروش شناسایی شد`);
    reasoning.push(`ATR فعلی: ${currentATR.toFixed(2)} واحد`);
    reasoning.push(`حد ضرر: ${adjustedSlMultiplier.toFixed(1)} برابر ATR بالای قیمت ورود`);
    reasoning.push(`حد سود اول: 1.5 برابر ریسک`);
    reasoning.push(`حد سود دوم: ${adjustedTpMultiplier.toFixed(1)} برابر ATR`);
  }
  
  // محاسبه نسبت ریسک به ریوارد (بر اساس TP2)
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit2 - entryPrice);
  const riskRewardRatio = reward / risk;
  
  // محاسبه امتیاز اطمینان بر اساس کیفیت R/R
  let confidence = 0;
  if (riskRewardRatio >= 3) confidence = 95;
  else if (riskRewardRatio >= 2.5) confidence = 85;
  else if (riskRewardRatio >= 2) confidence = 75;
  else if (riskRewardRatio >= 1.5) confidence = 65;
  else if (riskRewardRatio >= 1) confidence = 50;
  else confidence = Math.max(0, 50 - (1 - riskRewardRatio) * 50);
  
  // تعدیل اعتماد بر اساس رژیم بازار
  if (regime.regime === 'RANGING') {
    confidence *= 0.7;
    reasoning.push('کاهش اعتماد به دلیل بازار رنج');
  } else if (regime.regime.includes('STRONG')) {
    confidence = Math.min(100, confidence * 1.1);
    reasoning.push('افزایش اعتماد به دلیل روند قوی');
  }
  
  reasoning.push(`نسبت ریسک به ریوارد: ${riskRewardRatio.toFixed(2)}:1`);
  reasoning.push(`امتیاز اطمینان: ${confidence.toFixed(0)}٪`);
  
  return {
    entryPrice: parseFloat(entryPrice.toFixed(2)),
    stopLoss: parseFloat(stopLoss.toFixed(2)),
    takeProfit1: parseFloat(takeProfit1.toFixed(2)),
    takeProfit2: parseFloat(takeProfit2.toFixed(2)),
    riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
    positionSize: 0, // بعداً محاسبه می‌شود
    riskPercent: 0,
    atrMultiplier: parseFloat(adjustedSlMultiplier.toFixed(2)),
    confidence: parseFloat(confidence.toFixed(0)),
    reasoning
  };
}

/**
 * محاسبه حجم پوزیشن بر اساس مدیریت سرمایه
 */
export function calculatePositionSize(params: PositionSizingParams): {
  positionSize: number;
  riskAmount: number;
  shares: number;
  reasoning: string[];
} {
  const { totalCapital, riskPerTrade, entryPrice, stopLoss } = params;
  const reasoning: string[] = [];
  
  if (entryPrice <= 0 || stopLoss <= 0) {
    return {
      positionSize: 0,
      riskAmount: 0,
      shares: 0,
      reasoning: ['قیمت ورود یا حد ضرر نامعتبر است']
    };
  }
  
  if (entryPrice === stopLoss) {
    return {
      positionSize: 0,
      riskAmount: 0,
      shares: 0,
      reasoning: ['قیمت ورود و حد ضرر یکسان هستند - ریسک نامتعریف']
    };
  }
  
  // مقدار ریالی ریسک مجاز
  const riskAmount = totalCapital * (riskPerTrade / 100);
  
  // ریسک به ازای هر سهم
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  
  // تعداد سهام قابل خرید
  const shares = Math.floor(riskAmount / riskPerShare);
  
  // حجم کل پوزیشن
  const positionSize = shares * entryPrice;
  
  reasoning.push(`سرمایه کل: ${totalCapital.toLocaleString()} تومان`);
  reasoning.push(`ریسک مجاز در هر معامله: ${riskPerTrade}٪`);
  reasoning.push(`مقدار ریالی ریسک: ${riskAmount.toLocaleString()} تومان`);
  reasoning.push(`ریسک به ازای هر سهم: ${riskPerShare.toFixed(2)} تومان`);
  reasoning.push(`تعداد سهام پیشنهادی: ${shares.toLocaleString()} واحد`);
  reasoning.push(`حجم کل پوزیشن: ${positionSize.toLocaleString()} تومان`);
  
  // بررسی محدودیت‌ها
  if (shares <= 0) {
    reasoning.push('⚠️ هشدار: حجم محاسبه‌شده کمتر از حداقل است');
  }
  
  const maxAllowedPosition = totalCapital * 0.2; // حداکثر 20٪ سرمایه در یک سهم
  if (positionSize > maxAllowedPosition) {
    reasoning.push(`⚠️ هشدار: حجم پوزیشن بیش از 20٪ سرمایه است (${((positionSize / totalCapital) * 100).toFixed(1)}٪)`);
  }
  
  return {
    positionSize: parseFloat(positionSize.toFixed(0)),
    riskAmount: parseFloat(riskAmount.toFixed(0)),
    shares,
    reasoning
  };
}

/**
 * تحلیل جامع ریسک به ریوارد با مدیریت سرمایه
 */
export function analyzeTradeSetup(
  candles: Candle[],
  signalType: 'BUY' | 'SELL',
  totalCapital: number,
  riskPerTrade: number = 2,
  atrPeriod: number = 14,
  slMultiplier: number = 2.0,
  tpMultiplier: number = 3.0
): {
  rrAnalysis: RiskRewardAnalysis;
  positionSizing: ReturnType<typeof calculatePositionSize>;
  finalConfidence: number;
  summary: string;
  recommendations: string[];
} {
  // محاسبه ریسک به ریوارد
  const rrAnalysis = calculateRiskReward(candles, signalType, atrPeriod, slMultiplier, tpMultiplier);
  
  // محاسبه حجم پوزیشن
  const positionSizing = calculatePositionSize({
    totalCapital,
    riskPerTrade,
    entryPrice: rrAnalysis.entryPrice,
    stopLoss: rrAnalysis.stopLoss
  });
  
  // ادغام نتایج
  rrAnalysis.positionSize = positionSizing.positionSize;
  rrAnalysis.riskPercent = riskPerTrade;
  
  // محاسبه اعتماد نهایی
  let finalConfidence = rrAnalysis.confidence;
  
  // کسر اعتماد اگر R/R کمتر از 1.5 باشد
  if (rrAnalysis.riskRewardRatio < 1.5) {
    finalConfidence *= 0.8;
  }
  
  // کسر اعتماد اگر حجم پوزیشن خیلی بزرگ باشد
  if (positionSizing.shares <= 0) {
    finalConfidence *= 0.5;
  }
  
  const recommendations: string[] = [];
  
  if (rrAnalysis.riskRewardRatio >= 2) {
    recommendations.push('✅ نسبت ریسک به ریوارد عالی است');
  } else if (rrAnalysis.riskRewardRatio >= 1.5) {
    recommendations.push('🟡 نسبت ریسک به ریوارد قابل قبول است');
  } else {
    recommendations.push('🔴 نسبت ریسک به ریوارد ضعیف است - reconsider entry');
  }
  
  if (finalConfidence >= 75) {
    recommendations.push('✅ اعتماد به نفس بالا - اجرای سیگنال توصیه می‌شود');
  } else if (finalConfidence >= 50) {
    recommendations.push('🟡 اعتماد به نفس متوسط - با احتیاط عمل کنید');
  } else {
    recommendations.push('🔴 اعتماد به نفس پایین - از اجرای سیگنال خودداری کنید');
  }
  
  const summary = `
تحلیل معامله ${signalType === 'BUY' ? 'خرید' : 'فروش'}:
- قیمت ورود: ${rrAnalysis.entryPrice.toLocaleString()} تومان
- حد ضرر: ${rrAnalysis.stopLoss.toLocaleString()} تومان
- حد سود اول: ${rrAnalysis.takeProfit1.toLocaleString()} تومان
- حد سود دوم: ${rrAnalysis.takeProfit2.toLocaleString()} تومان
- نسبت ریسک به ریوارد: ${rrAnalysis.riskRewardRatio.toFixed(2)}:1
- حجم پیشنهادی: ${positionSizing.shares.toLocaleString()} سهم (${rrAnalysis.positionSize.toLocaleString()} تومان)
- ریسک معامله: ${positionSizing.riskAmount.toLocaleString()} تومان (${riskPerTrade}٪ سرمایه)
- امتیاز اطمینان: ${finalConfidence.toFixed(0)}٪
  `.trim();
  
  return {
    rrAnalysis,
    positionSizing,
    finalConfidence: parseFloat(finalConfidence.toFixed(0)),
    summary,
    recommendations
  };
}

export default {
  calculateRiskReward,
  calculatePositionSize,
  analyzeTradeSetup
};
