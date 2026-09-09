/**
 * موتور اصلی تولید سیگنال جامع
 * ترکیب تحلیل‌های تکنیکال، جریان پول هوشمند و بنیادی
 * برای تولید سیگنال‌های قطعی با دلایل کامل و شفاف
 * بدون هیچگونه داده فیک یا شبیه‌سازی شده
 */

import { TSETMCStockData, HistoricalDataPoint, OrderBookData, fetchMarketSymbols, fetchStockRealTimeData, fetchHistoricalData, fetchOrderBookAndFlow } from '../../services/tsetmcRealDataService';
import { TechnicalSignal, analyzeTechnical } from './technicalEngine';
import { SmartMoneyAnalysis, analyzeSmartMoneyFlow } from './smartMoneyEngine';
import { FundamentalAnalysis, analyzeFundamental } from './fundamentalEngine';
import { withRetry } from '../../lib/networkRetry';
import type { Instrument } from '@/lib/clientFetch';

export interface CompleteSignal {
  symbol: string;
  name: string;
  timestamp: number;
  
  // سیگنال نهایی
  signal: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';
  confidence: number; // 0-100
  
  // نقاط ورود و خروج
  entryPrice: number;
  entryRange: { min: number; max: number };
  stopLoss: number;
  takeProfit1: number; // حد سود اول (کم‌ریسک)
  takeProfit2: number; // حد سود دوم (متوسط)
  takeProfit3: number; // حد سود سوم (پرریسک)
  
  // مدیریت سرمایه
  suggestedPosition: number; // درصد پیشنهادی از سبد (0-100)
  riskRewardRatio: number;
  
  // دلایل کامل و شفاف
  reasons: string[];
  technicalReasons: string[];
  smartMoneyReasons: string[];
  fundamentalReasons: string[];
  
  // هشدارها و ریسک‌ها
  warnings: string[];
  risks: string[];
  
  // جزئیات تحلیل‌ها
  technicalAnalysis: TechnicalSignal;
  smartMoneyAnalysis: SmartMoneyAnalysis;
  fundamentalAnalysis: FundamentalAnalysis;
  
  // وضعیت فعلی
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  
  // متادیتا
  analysisDate: string;
  validUntil: string;
}

/**
 * محاسبه حد ضرر بر اساس ATR و حمایت‌های کلیدی
 */
function calculateStopLoss(
  currentPrice: number,
  atr: number,
  technicalSignal: TechnicalSignal
): number {
  const baseStop = currentPrice - (atr * 2.5); // حد ضرر اولیه بر اساس ATR
  
  // اگر سیگنال قوی است، حد ضرر را تنگ‌تر بگیر
  if (technicalSignal.type === 'STRONG_BUY' || technicalSignal.type === 'BUY') {
    return Math.max(baseStop, currentPrice * 0.92); // حداکثر ۸٪ ضرر
  }
  
  return baseStop;
}

/**
 * محاسبه اهداف سود بر اساس مقاومت‌ها و ریسک‌ریوارد
 */
function calculateTakeProfits(
  currentPrice: number,
  stopLoss: number,
  technicalSignal: TechnicalSignal
): { tp1: number; tp2: number; tp3: number } {
  const risk = currentPrice - stopLoss;
  
  // هدف اول: ریسک‌ریوارد ۱:۱.۵
  const tp1 = currentPrice + (risk * 1.5);
  
  // هدف دوم: ریسک‌ریوارد ۱:۲.۵
  const tp2 = currentPrice + (risk * 2.5);
  
  // هدف سوم: ریسک‌ریوارد ۱:۴ یا بر اساس باندهای بولینگر
  const bbUpper = technicalSignal.indicators.bollingerBands.upper;
  const tp3 = bbUpper > 0 ? Math.min(currentPrice + (risk * 4), bbUpper) : currentPrice + (risk * 4);
  
  return { tp1, tp2, tp3 };
}

/**
 * تعیین درصد پیشنهادی سرمایه‌گذاری بر اساس اطمینان و ریسک
 */
function calculateSuggestedPosition(
  confidence: number,
  signalType: CompleteSignal['signal'],
  fundamentalUpside: number
): number {
  let basePosition = 10; // حداقل ۱۰٪
  
  // افزایش بر اساس اطمینان
  basePosition += (confidence / 100) * 20; // تا ۲۰٪ اضافه
  
  // افزایش برای سیگنال‌های قوی
  if (signalType === 'STRONG_BUY') basePosition += 15;
  else if (signalType === 'BUY') basePosition += 10;
  else if (signalType === 'STRONG_SELL' || signalType === 'SELL') return 0;
  
  // افزایش بر اساس پتانسیل رشد بنیادی
  if (fundamentalUpside > 50) basePosition += 10;
  else if (fundamentalUpside > 30) basePosition += 5;
  
  return Math.min(Math.round(basePosition), 50); // حداکثر ۵۰٪ در یک سهم
}

/**
 * تولید سیگنال جامع نهایی
 */
export function generateCompleteSignal(
  symbol: string,
  name: string,
  stockData: TSETMCStockData,
  historicalData: HistoricalDataPoint[],
  orderBook: OrderBookData | null
): CompleteSignal | null {
  // اجرای تمام موتورها
  const technicalAnalysis = analyzeTechnical(historicalData);
  const smartMoneyAnalysis = analyzeSmartMoneyFlow(stockData, orderBook);
  const fundamentalAnalysis = analyzeFundamental(stockData);
  
  // امتیازدهی وزنی به هر موتور
  const technicalWeight = 0.35; // ۳۵٪ وزن به تحلیل تکنیکال
  const smartMoneyWeight = 0.35; // ۳۵٪ وزن به جریان پول هوشمند
  const fundamentalWeight = 0.30; // ۳۰٪ وزن به تحلیل بنیادی
  
  // تبدیل سیگنال‌ها به امتیاز عددی
  const signalToScore = (sig: string): number => {
    switch (sig) {
      case 'STRONG_BUY': return 5;
      case 'BUY': return 3;
      case 'HOLD': return 0;
      case 'SELL': return -3;
      case 'STRONG_SELL': return -5;
      default: return 0;
    }
  };
  
  const techScore = signalToScore(technicalAnalysis.type) * (technicalAnalysis.confidence / 100);
  const smScore = signalToScore(smartMoneyAnalysis.smartMoneySignal) * (smartMoneyAnalysis.confidence / 100);
  const fundScore = signalToScore(fundamentalAnalysis.recommendation) * (fundamentalAnalysis.confidence / 100);
  
  // امتیاز نهایی ترکیبی
  const finalScore = 
    (techScore * technicalWeight) + 
    (smScore * smartMoneyWeight) + 
    (fundScore * fundamentalWeight);
  
  // تعیین سیگنال نهایی
  let signal: CompleteSignal['signal'] = 'HOLD';
  if (finalScore >= 3.5) signal = 'STRONG_BUY';
  else if (finalScore >= 1.5) signal = 'BUY';
  else if (finalScore <= -3.5) signal = 'STRONG_SELL';
  else if (finalScore <= -1.5) signal = 'SELL';
  
  // محاسبه اطمینان نهایی
  const avgConfidence = 
    (technicalAnalysis.confidence * technicalWeight) +
    (smartMoneyAnalysis.confidence * smartMoneyWeight) +
    (fundamentalAnalysis.confidence * fundamentalWeight);
  
  const confidence = Math.min(95, Math.round(avgConfidence + Math.abs(finalScore) * 5));
  
  // اگر داده کافی نیست، سیگنال HOLD با اطمینان پایین
  if (historicalData.length < 50 || !stockData.pe || stockData.pe <= 0) {
    return {
      symbol,
      name,
      timestamp: Date.now(),
      signal: 'HOLD',
      confidence: Math.round(confidence * 0.5),
      entryPrice: stockData.price,
      entryRange: { min: stockData.price * 0.98, max: stockData.price * 1.02 },
      stopLoss: stockData.price * 0.9,
      takeProfit1: stockData.price * 1.05,
      takeProfit2: stockData.price * 1.1,
      takeProfit3: stockData.price * 1.15,
      suggestedPosition: 0,
      riskRewardRatio: 0,
      reasons: ['داده‌های ناکافی برای تولید سیگنال قطعی'],
      technicalReasons: technicalAnalysis.reasons.slice(0, 2),
      smartMoneyReasons: smartMoneyAnalysis.reasons.slice(0, 2),
      fundamentalReasons: fundamentalAnalysis.reasons.slice(0, 2),
      warnings: ['تحلیل با داده‌های ناقص انجام شده است'],
      risks: ['عدم قطعیت بالا به دلیل داده‌های محدود'],
      technicalAnalysis,
      smartMoneyAnalysis,
      fundamentalAnalysis,
      currentPrice: stockData.price,
      priceChange: stockData.change,
      priceChangePercent: stockData.changePercent,
      analysisDate: new Date().toLocaleDateString('fa-IR'),
      validUntil: new Date(Date.now() + 86400000).toLocaleDateString('fa-IR') // معتبر تا ۲۴ ساعت
    };
  }
  
  // محاسبه نقاط ورود و خروج
  const atr = technicalAnalysis.indicators.atr;
  const stopLoss = calculateStopLoss(stockData.price, atr, technicalAnalysis);
  const { tp1, tp2, tp3 } = calculateTakeProfits(stockData.price, stopLoss, technicalAnalysis);
  
  const risk = stockData.price - stopLoss;
  const reward = tp2 - stockData.price;
  const riskRewardRatio = risk > 0 ? reward / risk : 0;
  
  // محدوده ورود بهینه
  const entryMin = signal.includes('BUY') ? stockData.price * 0.98 : stockData.price;
  const entryMax = signal.includes('BUY') ? stockData.price * 1.02 : stockData.price;
  
  // محاسبه درصد پیشنهادی سرمایه‌گذاری
  const suggestedPosition = calculateSuggestedPosition(confidence, signal, fundamentalAnalysis.upside);
  
  // جمع‌آوری دلایل کامل
  const allReasons: string[] = [];
  
  // دلایل تکنیکال
  const techReasons = technicalAnalysis.reasons.map(r => `📊 تکنیکال: ${r}`);
  allReasons.push(...techReasons);
  
  // دلایل جریان پول هوشمند
  const smReasons = smartMoneyAnalysis.reasons.map(r => `💰 پول هوشمند: ${r}`);
  allReasons.push(...smReasons);
  
  // دلایل بنیادی
  const fundReasons = fundamentalAnalysis.reasons.map(r => `📈 بنیادی: ${r}`);
  allReasons.push(...fundReasons);
  
  // جمع‌آوری هشدارها و ریسک‌ها
  const warnings = [
    ...smartMoneyAnalysis.alerts,
    ...(riskRewardRatio < 1.5 ? ['⚠️ نسبت ریسک به ریوارد کمتر از ۱.۵ است'] : [])
  ];
  
  const risks = [
    ...fundamentalAnalysis.risks,
    ...(stockData.changePercent < -5 ? ['ریسک ادامه روند نزولی کوتاه‌مدت'] : []),
    ...(atr > stockData.price * 0.05 ? ['نوسان‌پذیری بالا - نیاز به مدیریت دقیق‌تر'] : [])
  ];
  
  // تاریخ اعتبار سیگنال
  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + (signal.includes('BUY') ? 3 : 1));
  
  return {
    symbol,
    name,
    timestamp: Date.now(),
    signal,
    confidence,
    entryPrice: stockData.price,
    entryRange: { min: Math.round(entryMin), max: Math.round(entryMax) },
    stopLoss: Math.round(stopLoss),
    takeProfit1: Math.round(tp1),
    takeProfit2: Math.round(tp2),
    takeProfit3: Math.round(tp3),
    suggestedPosition,
    riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
    reasons: allReasons,
    technicalReasons: technicalAnalysis.reasons,
    smartMoneyReasons: smartMoneyAnalysis.reasons,
    fundamentalReasons: fundamentalAnalysis.reasons,
    warnings,
    risks,
    technicalAnalysis,
    smartMoneyAnalysis,
    fundamentalAnalysis,
    currentPrice: stockData.price,
    priceChange: stockData.change,
    priceChangePercent: stockData.changePercent,
    analysisDate: today.toLocaleDateString('fa-IR'),
    validUntil: validUntil.toLocaleDateString('fa-IR')
  };
}
