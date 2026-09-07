/**
 * فاز ۳: هوش مصنوعی و تحلیل چندلایه
 * ماژول اصلی ترکیب تمام لایه‌های تحلیل (Signal Aggregator)
 * 
 * هدف: ترکیب تحلیل تکنیکال، رژیم بازار، ریسک به ریوارد و سنتیمنت اخبار
 * برای تولید سیگنال نهایی با امتیاز اطمینان جامع
 */

import { OHLCV as Candle } from '../backtest/types';
import { detectMarketRegime, filterSignalByRegime, type RegimeAnalysis } from './marketRegime';
import { analyzeTradeSetup, type RiskRewardAnalysis } from './riskReward';
import { analyzeNewsSentiment, adjustSignalBySentiment, type SentimentAnalysis, type NewsItem } from './newsSentiment';

export type FinalSignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface MultiLayerAnalysis {
  // ورودی‌ها
  baseSignal: 'BUY' | 'SELL' | 'HOLD';
  baseConfidence: number;
  
  // لایه ۱: رژیم بازار
  regimeAnalysis: RegimeAnalysis;
  regimeFilterResult: ReturnType<typeof filterSignalByRegime>;
  
  // لایه ۲: ریسک به ریوارد
  riskRewardAnalysis: RiskRewardAnalysis;
  
  // لایه ۳: سنتیمنت اخبار
  sentimentAnalysis: SentimentAnalysis;
  sentimentAdjustment: ReturnType<typeof adjustSignalBySentiment>;
  
  // خروجی نهایی
  finalSignal: FinalSignalType;
  finalConfidence: number; // 0-100
  layersPassed: number; // تعداد لایه‌های عبور کرده (از 3)
  reasoning: string[];
  recommendations: string[];
}

export interface SignalWeights {
  regimeWeight: number; // وزن لایه رژیم بازار (پیش‌فرض: 0.35)
  riskRewardWeight: number; // وزن لایه ریسک به ریوارد (پیش‌فرض: 0.40)
  sentimentWeight: number; // وزن لایه سنتیمنت (پیش‌فرض: 0.25)
}

const DEFAULT_WEIGHTS: SignalWeights = {
  regimeWeight: 0.35,
  riskRewardWeight: 0.40,
  sentimentWeight: 0.25
};

/**
 * تبدیل امتیاز به سیگنال نهایی
 */
function scoreToFinalSignal(score: number): FinalSignalType {
  if (score >= 85) return 'STRONG_BUY';
  if (score >= 65) return 'BUY';
  if (score >= 35) return 'HOLD';
  if (score >= 15) return 'SELL';
  return 'STRONG_SELL';
}

/**
 * تحلیل چندلایه کامل برای یک سیگنال
 */
export function performMultiLayerAnalysis(
  candles: Candle[],
  baseSignal: 'BUY' | 'SELL' | 'HOLD',
  baseConfidence: number,
  newsItems: NewsItem[],
  totalCapital: number = 100000000, // 100 میلیون تومان پیش‌فرض
  riskPerTrade: number = 2,
  weights: SignalWeights = DEFAULT_WEIGHTS
): MultiLayerAnalysis {
  const reasoning: string[] = [];
  const recommendations: string[] = [];
  
  reasoning.push(`تحلیل چندلایه برای سیگنال ${baseSignal === 'BUY' ? 'خرید' : baseSignal === 'SELL' ? 'فروش' : ' HOLD'}`);
  reasoning.push(`اعتماد اولیه: ${baseConfidence}٪`);
  reasoning.push('');
  
  // ==================== لایه ۱: تشخیص رژیم بازار ====================
  const regimeAnalysis = detectMarketRegime(candles);
  const regimeFilterResult = filterSignalByRegime(baseSignal, regimeAnalysis, 40);
  
  reasoning.push('┌─────────────────────────────────────');
  reasoning.push('│ لایه ۱: تشخیص رژیم بازار');
  reasoning.push(`│ رژیم شناسایی‌شده: ${regimeAnalysis.regime}`);
  reasoning.push(`│ قدرت روند: ${regimeAnalysis.trendStrength}٪`);
  reasoning.push(`│ ADX: ${regimeAnalysis.adx}`);
  reasoning.push(`│ نتیجه فیلتر: ${regimeFilterResult.passed ? '✅ عبور کرد' : '❌ رد شد'}`);
  reasoning.push(`│ دلیل: ${regimeFilterResult.reason}`);
  reasoning.push(`│ اعتماد تعدیل‌شده: ${regimeFilterResult.adjustedConfidence}٪`);
  reasoning.push('└─────────────────────────────────────');
  reasoning.push('');
  
  if (!regimeFilterResult.passed && regimeFilterResult.adjustedConfidence < 30) {
    recommendations.push('⚠️ هشدار: رژیم بازار برای این سیگنال مناسب نیست');
  }
  
  // ==================== لایه ۲: تحلیل ریسک به ریوارد ====================
  // فقط برای سیگنال‌های BUY یا SELL تحلیل انجام می‌دهیم
  const riskRewardAnalysis = baseSignal !== 'HOLD' 
    ? analyzeTradeSetup(candles, baseSignal, totalCapital, riskPerTrade).rrAnalysis
    : {
        entryPrice: 0,
        stopLoss: 0,
        takeProfit1: 0,
        takeProfit2: 0,
        riskRewardRatio: 0,
        positionSize: 0,
        riskPercent: 0,
        atrMultiplier: 0,
        confidence: 0,
        reasoning: ['سیگنال HOLD - نیازی به تحلیل ریسک به ریوارد نیست']
      };
  
  reasoning.push('┌─────────────────────────────────────');
  reasoning.push('│ لایه ۲: تحلیل ریسک به ریوارد');
  reasoning.push(`│ قیمت ورود: ${riskRewardAnalysis.entryPrice.toLocaleString()} تومان`);
  reasoning.push(`│ حد ضرر: ${riskRewardAnalysis.stopLoss.toLocaleString()} تومان`);
  reasoning.push(`│ حد سود اول: ${riskRewardAnalysis.takeProfit1.toLocaleString()} تومان`);
  reasoning.push(`│ حد سود دوم: ${riskRewardAnalysis.takeProfit2.toLocaleString()} تومان`);
  reasoning.push(`│ نسبت R/R: ${riskRewardAnalysis.riskRewardRatio.toFixed(2)}:1`);
  reasoning.push(`│ حجم پیشنهادی: ${riskRewardAnalysis.positionSize.toLocaleString()} تومان`);
  reasoning.push(`│ اعتماد لایه: ${riskRewardAnalysis.confidence}٪`);
  reasoning.push('└─────────────────────────────────────');
  reasoning.push('');
  
  if (baseSignal !== 'HOLD') {
    const tradeSetup = analyzeTradeSetup(candles, baseSignal, totalCapital, riskPerTrade);
    recommendations.push(...tradeSetup.recommendations);
  }
  
  // ==================== لایه ۳: تحلیل سنتیمنت اخبار ====================
  const sentimentAnalysis = analyzeNewsSentiment(newsItems);
  const sentimentAdjustment = adjustSignalBySentiment(
    baseSignal,
    regimeFilterResult.adjustedConfidence,
    sentimentAnalysis
  );
  
  reasoning.push('┌─────────────────────────────────────');
  reasoning.push('│ لایه ۳: تحلیل سنتیمنت اخبار');
  reasoning.push(`│ تعداد اخبار تحلیل‌شده: ${sentimentAnalysis.newsCount}`);
  reasoning.push(`│ امتیاز کلی: ${sentimentAnalysis.overallScore} از 100`);
  reasoning.push(`│ دسته‌بندی: ${sentimentAnalysis.category}`);
  reasoning.push(`│ روند: ${sentimentAnalysis.trend}`);
  reasoning.push(`│ تاثیر بر بازار: ${sentimentAnalysis.impactOnMarket}`);
  reasoning.push(`│ نتیجه تعدیل: ${sentimentAdjustment.passed ? '✅ تایید شد' : '❌ رد شد'}`);
  reasoning.push(`│ دلیل: ${sentimentAdjustment.reason}`);
  reasoning.push(`│ اعتماد نهایی: ${sentimentAdjustment.adjustedConfidence}٪`);
  reasoning.push('└─────────────────────────────────────');
  reasoning.push('');
  
  // ==================== محاسبه امتیاز نهایی ====================
  let layersPassed = 0;
  if (regimeFilterResult.passed || regimeFilterResult.adjustedConfidence >= 40) layersPassed++;
  if (riskRewardAnalysis.riskRewardRatio >= 1.5) layersPassed++;
  if (sentimentAdjustment.passed) layersPassed++;
  
  // محاسبه اعتماد نهایی با وزن‌دهی
  const weightedConfidence = (
    regimeFilterResult.adjustedConfidence * weights.regimeWeight +
    riskRewardAnalysis.confidence * weights.riskRewardWeight +
    sentimentAdjustment.adjustedConfidence * weights.sentimentWeight
  );
  
  // اعمال جریمه اگر لایه‌ای رد شده باشد
  let finalConfidence = weightedConfidence;
  if (layersPassed < 2) {
    finalConfidence *= 0.7;
    recommendations.push('⚠️ هشدار: تنها برخی لای‌ها تایید شدند - احتیاط کنید');
  }
  
  // محدود کردن به 0-100
  finalConfidence = Math.max(0, Math.min(100, finalConfidence));
  
  // تعیین سیگنال نهایی
  let finalSignal: FinalSignalType;
  
  if (baseSignal === 'HOLD') {
    finalSignal = 'HOLD';
    finalConfidence = 100;
  } else {
    // اگر سنتیمنت قویاً مخالف سیگنال باشد، سیگنال را معکوس کن
    if (baseSignal === 'BUY' && sentimentAnalysis.impactOnMarket === 'BEARISH' && sentimentAnalysis.overallScore < -50) {
      finalSignal = scoreToFinalSignal(100 - sentimentAdjustment.adjustedConfidence);
      if (finalSignal.includes('BUY')) {
        finalSignal = 'HOLD';
      }
      recommendations.push('🔄 سیگنال به دلیل اخبار منفی قوی تعدیل شد');
    } else if (baseSignal === 'SELL' && sentimentAnalysis.impactOnMarket === 'BULLISH' && sentimentAnalysis.overallScore > 50) {
      finalSignal = scoreToFinalSignal(100 - sentimentAdjustment.adjustedConfidence);
      if (finalSignal.includes('SELL')) {
        finalSignal = 'HOLD';
      }
      recommendations.push('🔄 سیگنال به دلیل اخبار مثبت قوی تعدیل شد');
    } else {
      finalSignal = scoreToFinalSignal(finalConfidence);
    }
  }
  
  // اضافه کردن توصیه‌های نهایی
  if (finalConfidence >= 75) {
    recommendations.push(`✅ سیگنال قوی: ${finalSignal} - اعتماد به نفس بالا`);
  } else if (finalConfidence >= 50) {
    recommendations.push(`🟡 سیگنال متوسط: ${finalSignal} - با مدیریت ریسک عمل کنید`);
  } else {
    recommendations.push(`🔴 سیگنال ضعیف: ${finalSignal} - از ورود خودداری کنید یا صبر کنید`);
  }
  
  reasoning.push('═══════════════════════════════════════');
  reasoning.push(`نتیجه نهایی: ${finalSignal}`);
  reasoning.push(`امتیاز اطمینان: ${finalConfidence.toFixed(0)}٪`);
  reasoning.push(`لایه‌های عبور کرده: ${layersPassed} از 3`);
  reasoning.push('═══════════════════════════════════════');
  
  return {
    baseSignal,
    baseConfidence,
    regimeAnalysis,
    regimeFilterResult,
    riskRewardAnalysis,
    sentimentAnalysis,
    sentimentAdjustment,
    finalSignal,
    finalConfidence: parseFloat(finalConfidence.toFixed(0)),
    layersPassed,
    reasoning,
    recommendations
  };
}

/**
 * تولید گزارش تحلیلی کامل
 */
export function generateAnalysisReport(analysis: MultiLayerAnalysis): string {
  const report: string[] = [];
  
  report.push('╔════════════════════════════════════════════════════════╗');
  report.push('║          گزارش تحلیل چندلایه نبض بازار              ║');
  report.push('╚════════════════════════════════════════════════════════╝');
  report.push('');
  report.push(`سیگنال پایه: ${analysis.baseSignal === 'BUY' ? 'خرید' : analysis.baseSignal === 'SELL' ? 'فروش' : ' HOLD'}`);
  report.push(`سیگنال نهایی: ${translateSignal(analysis.finalSignal)}`);
  report.push(`امتیاز اطمینان نهایی: ${analysis.finalConfidence}٪`);
  report.push('');
  
  report.push('📊 خلاصه لایه‌ها:');
  report.push(`  • رژیم بازار: ${analysis.regimeAnalysis.regime} (قدرت: ${analysis.regimeAnalysis.trendStrength}٪)`);
  report.push(`  • ریسک به ریوارد: ${analysis.riskRewardAnalysis.riskRewardRatio.toFixed(2)}:1`);
  report.push(`  • سنتیمنت اخبار: ${analysis.sentimentAnalysis.category} (${analysis.sentimentAnalysis.overallScore})`);
  report.push('');
  
  report.push('💰 نقاط کلیدی معامله:');
  report.push(`  • قیمت ورود: ${analysis.riskRewardAnalysis.entryPrice.toLocaleString()} تومان`);
  report.push(`  • حد ضرر: ${analysis.riskRewardAnalysis.stopLoss.toLocaleString()} تومان`);
  report.push(`  • حد سود اول: ${analysis.riskRewardAnalysis.takeProfit1.toLocaleString()} تومان`);
  report.push(`  • حد سود دوم: ${analysis.riskRewardAnalysis.takeProfit2.toLocaleString()} تومان`);
  report.push(`  • حجم پیشنهادی: ${analysis.riskRewardAnalysis.positionSize.toLocaleString()} تومان`);
  report.push('');
  
  report.push('📋 توصیه‌ها:');
  for (const rec of analysis.recommendations) {
    report.push(`  ${rec}`);
  }
  report.push('');
  
  report.push('🔍 دلایل تحلیل:');
  for (const line of analysis.reasoning) {
    report.push(`  ${line}`);
  }
  
  return report.join('\n');
}

/**
 * ترجمه سیگنال به فارسی
 */
function translateSignal(signal: FinalSignalType): string {
  switch (signal) {
    case 'STRONG_BUY': return 'خرید قوی';
    case 'BUY': return 'خرید';
    case 'HOLD': return 'نگهداری/صبر';
    case 'SELL': return 'فروش';
    case 'STRONG_SELL': return 'فروش قوی';
    default: return signal;
  }
}

export default {
  performMultiLayerAnalysis,
  generateAnalysisReport
};
