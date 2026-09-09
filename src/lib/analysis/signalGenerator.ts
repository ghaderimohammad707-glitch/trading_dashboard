/**
 * موتور تولید سیگنال جامع
 * ترکیب تحلیل تکنیکال، پول هوشمند و بنیادی برای تولید سیگنال‌های قطعی
 */

import type { TechnicalIndicators } from './technicalEngine';
import type { SmartMoneyAnalysis } from './smartMoneyEngine';
import type { FundamentalAnalysis } from './fundamentalEngine';

export interface CompleteSignal {
  id: string;
  symbol: string;
  timestamp: number;
  type: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number; // TP1 (کوتاه‌مدت)
  takeProfit2: number; // TP2 (میان‌مدت)
  takeProfit3: number; // TP3 (بلندمدت)
  positionSize: number; // درصد پیشنهادی از سبد
  riskRewardRatio: number;
  
  // دلایل کامل
  technicalReasons: string[];
  smartMoneyReasons: string[];
  fundamentalReasons: string[];
  allReasons: string[];
  
  // وضعیت
  status: 'active' | 'triggered' | 'cancelled' | 'completed';
  triggeredAt?: number;
  exitPrice?: number;
  profitLoss?: number;
}

/**
 * تولید سیگنال جامع بر اساس تمام تحلیل‌ها
 */
export function generateCompleteSignal(
  symbol: string,
  currentPrice: number,
  technical: TechnicalIndicators,
  smartMoney: SmartMoneyAnalysis,
  fundamental: FundamentalAnalysis
): CompleteSignal {
  const allReasons: string[] = [];
  let totalScore = 0;
  let maxScore = 0;
  
  // امتیازدهی تکنیکال (40% وزن)
  maxScore += 40;
  if (technical.rsi < 30) {
    totalScore += 15;
    allReasons.push(`RSI در اشباع فروش (${technical.rsi.toFixed(1)})`);
  } else if (technical.rsi > 70) {
    totalScore -= 15;
    allReasons.push(`RSI در اشباع خرید (${technical.rsi.toFixed(1)})`);
  }
  
  if (technical.macd.histogram > 0) {
    totalScore += 10;
    allReasons.push('MACD مثبت و صعودی');
  } else {
    totalScore -= 10;
    allReasons.push('MACD منفی یا نزولی');
  }
  
  if (technical.trend === 'uptrend') {
    totalScore += 15;
    allReasons.push(`روند صعودی (${technical.trend})`);
  } else if (technical.trend === 'downtrend') {
    totalScore -= 15;
    allReasons.push(`روند نزولی (${technical.trend})`);
  }
  
  // امتیازدهی پول هوشمند (35% وزن)
  maxScore += 35;
  if (smartMoney.smartMoneySignal === 'buy') {
    totalScore += 20;
    allReasons.push(...smartMoney.reasons.filter(r => r.includes('ورود') || r.includes('قدرت خریدار')));
  } else if (smartMoney.smartMoneySignal === 'sell') {
    totalScore -= 20;
    allReasons.push(...smartMoney.reasons.filter(r => r.includes('خروج') || r.includes('ضعف خریدار')));
  }
  
  if (smartMoney.confidence > 70) {
    totalScore += 15;
    allReasons.push(`اعتماد بالای پول هوشمند (${smartMoney.confidence}%)`);
  }
  
  // امتیازدهی بنیادی (25% وزن)
  maxScore += 25;
  if (fundamental.recommendation === 'strong_buy' || fundamental.recommendation === 'buy') {
    totalScore += 15;
    allReasons.push(...fundamental.reasons.filter(r => r.includes('پایین') || r.includes('زیر ارزش')));
  } else if (fundamental.recommendation === 'strong_sell' || fundamental.recommendation === 'sell') {
    totalScore -= 15;
    allReasons.push(...fundamental.reasons.filter(r => r.includes('بالا') || r.includes('حباب')));
  }
  
  if (fundamental.fundamentalScore > 70) {
    totalScore += 10;
  }
  
  // محاسبه اعتماد نهایی
  const confidence = Math.max(10, Math.min(95, 50 + (totalScore / maxScore) * 50));
  
  // تعیین نوع سیگنال
  let type: CompleteSignal['type'] = 'HOLD';
  if (confidence >= 65 && totalScore > 0) {
    type = 'BUY';
  } else if (confidence >= 65 && totalScore < 0) {
    type = 'SELL';
  }
  
  // محاسبه نقاط ورود، خروج و حد ضرر با استفاده از ATR
  const atr = technical.atr || (currentPrice * 0.03); // پیش‌فرض 3% نوسان
  
  const entryPrice = currentPrice;
  const stopLoss = type === 'BUY' 
    ? currentPrice - (atr * 2) 
    : currentPrice + (atr * 2);
  
  const takeProfit1 = type === 'BUY'
    ? currentPrice + (atr * 1.5)
    : currentPrice - (atr * 1.5);
  
  const takeProfit2 = type === 'BUY'
    ? currentPrice + (atr * 3)
    : currentPrice - (atr * 3);
  
  const takeProfit3 = type === 'BUY'
    ? currentPrice + (atr * 5)
    : currentPrice - (atr * 5);
  
  // محاسبه نسبت ریسک به ریوارد
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit1 - entryPrice);
  const riskRewardRatio = reward / risk;
  
  // محاسبه اندازه پوزیشن پیشنهادی (بر اساس اعتماد)
  const positionSize = type === 'HOLD' ? 0 : Math.min(25, Math.max(5, confidence * 0.3));
  
  // جداسازی دلایل
  const technicalReasons = allReasons.filter((_, i) => i < 4);
  const smartMoneyReasons = smartMoney.reasons.slice(0, 3);
  const fundamentalReasons = fundamental.reasons.slice(0, 3);
  
  return {
    id: generateSecureId(),
    symbol,
    timestamp: Date.now(),
    type,
    confidence: Math.round(confidence),
    entryPrice: Math.round(entryPrice),
    stopLoss: Math.round(stopLoss),
    takeProfit1: Math.round(takeProfit1),
    takeProfit2: Math.round(takeProfit2),
    takeProfit3: Math.round(takeProfit3),
    positionSize: Math.round(positionSize),
    riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
    technicalReasons,
    smartMoneyReasons,
    fundamentalReasons,
    allReasons: allReasons.slice(0, 8), // حداکثر 8 دلیل اصلی
    status: 'active',
  };
}

/**
 * تولید ID امن با crypto
 */
function generateSecureId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback برای محیط‌های قدیمی
  return 'sig_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

/**
 * ارزیابی سیگنال بر اساس قیمت فعلی
 */
export function evaluateSignal(signal: CompleteSignal, currentPrice: number): Partial<CompleteSignal> {
  const updates: Partial<CompleteSignal> = {};
  
  if (signal.status === 'active') {
    // بررسی فعال‌سازی سیگنال
    if (signal.type === 'BUY' && currentPrice <= signal.entryPrice * 1.01) {
      updates.status = 'triggered';
      updates.triggeredAt = Date.now();
    } else if (signal.type === 'SELL' && currentPrice >= signal.entryPrice * 0.99) {
      updates.status = 'triggered';
      updates.triggeredAt = Date.now();
    }
    
    // بررسی حد ضرر
    if (signal.type === 'BUY' && currentPrice <= signal.stopLoss) {
      updates.status = 'cancelled';
      updates.exitPrice = currentPrice;
      updates.profitLoss = ((currentPrice - signal.entryPrice) / signal.entryPrice) * 100;
    } else if (signal.type === 'SELL' && currentPrice >= signal.stopLoss) {
      updates.status = 'cancelled';
      updates.exitPrice = currentPrice;
      updates.profitLoss = ((signal.entryPrice - currentPrice) / signal.entryPrice) * 100;
    }
    
    // بررسی اهداف سود
    if (signal.type === 'BUY' && currentPrice >= signal.takeProfit3) {
      updates.status = 'completed';
      updates.exitPrice = currentPrice;
      updates.profitLoss = ((currentPrice - signal.entryPrice) / signal.entryPrice) * 100;
    } else if (signal.type === 'SELL' && currentPrice <= signal.takeProfit3) {
      updates.status = 'completed';
      updates.exitPrice = currentPrice;
      updates.profitLoss = ((signal.entryPrice - currentPrice) / signal.entryPrice) * 100;
    }
  }
  
  return updates;
}
