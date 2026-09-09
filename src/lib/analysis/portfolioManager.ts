/**
 * موتور مدیریت پرتفوی و مشاور هوشمند سرمایه‌گذاری
 * ارائه مشاوره‌های حرفه‌ای بر اساس داده‌های واقعی و تحلیل جامع
 * بدون هیچگونه داده فیک یا شبیه‌سازی شده
 */

import { CompleteSignal } from './signalGenerator';
import { TSETMCStockData } from '../../services/tsetmcRealDataService';

export interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  weight: number; // درصد در سبد
  purchaseDate: string;
}

export interface PortfolioAnalysis {
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  
  // تنوع‌بخشی
  sectorDiversification: Record<string, number>;
  riskLevel: 'کم' | 'متوسط' | 'بالا' | 'خیلی بالا';
  
  // معیارهای عملکرد
  sharpeRatio?: number;
  maxDrawdown?: number;
  beta?: number;
  
  // توصیه‌ها
  recommendations: PortfolioRecommendation[];
  warnings: string[];
  opportunities: string[];
}

export interface PortfolioRecommendation {
  type: 'BUY' | 'SELL' | 'HOLD' | 'REBALANCE' | 'ADD' | 'REDUCE';
  symbol?: string;
  action: string; // توضیح کامل اقدام
  reason: string; // دلیل کامل
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedImpact: string; // تأثیر مورد انتظار
  details: {
    currentSituation: string;
    suggestedAction: string;
    rationale: string;
    riskConsideration: string;
  };
}

export interface InvestmentAdvice {
  adviceId: string;
  timestamp: number;
  adviceType: 'ورود به سهم' | 'خروج از سهم' | 'افزایش موقعیت' | 'کاهش موقعیت' | 'تنظیم سبد' | 'نگهداری';
  
  // جزئیات دارایی
  symbol: string;
  name: string;
  assetType: 'سهم' | 'صندوق سهامی' | 'صندوق طلا' | 'صندوق درآمد ثابت' | 'اوراق بدهی';
  
  // توصیه دقیق
  action: 'خرید' | 'فروش' | 'نگهداری' | 'تبدیل';
  quantity?: number; // تعداد پیشنهادی
  value?: number; // ارزش پیشنهادی به تومان
  percentageOfPortfolio?: number; // درصد از سبد
  
  // نقاط ورود/خروج
  entryPrice?: number;
  entryRange?: { min: number; max: number };
  stopLoss?: number;
  takeProfitTargets?: { tp1: number; tp2: number; tp3: number };
  
  // زمان‌بندی
  timeHorizon: 'کوتاه‌مدت (۱-۷ روز)' | 'میان‌مدت (۱-۴ هفته)' | 'بلندمدت (۱+ ماه)';
  validUntil: string;
  
  // دلایل کامل و شفاف
  reasons: string[];
  technicalReasons?: string[];
  fundamentalReasons?: string[];
  smartMoneyReasons?: string[];
  
  // ریسک‌ها و هشدارها
  risks: string[];
  warnings: string[];
  
  // مشخصات نماد
  exchange?: string; // بورس یا فرابورس
  fundCode?: string; // کد صندوق برای ETFها
  minimumInvestment?: number; // حداقل سرمایه‌گذاری
  
  // امتیاز اطمینان
  confidence: number;
}

/**
 * تحلیل سبد سرمایه‌گذاری کاربر
 */
export function analyzePortfolio(
  holdings: PortfolioHolding[],
  marketConditions?: { volatility: number; trend: 'صعودی' | 'نزولی' | 'خنثی' }
): PortfolioAnalysis {
  const totalValue = holdings.reduce((sum, h) => h.totalValue, 0);
  const totalCost = holdings.reduce((sum, h) => h.avgBuyPrice * h.quantity, 0);
  const totalProfitLoss = totalValue - totalCost;
  const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
  
  // محاسبه وزن هر سهم
  holdings.forEach(h => {
    h.weight = totalValue > 0 ? (h.totalValue / totalValue) * 100 : 0;
  });
  
  // تحلیل تنوع‌بخشی (بر اساس صنایع - نیاز به داده صنعت دارد)
  const sectorDiversification: Record<string, number> = {};
  holdings.forEach(h => {
    // در نسخه کامل، صنعت از داده‌های TSETMC استخراج می‌شود
    const sector = 'متفرقه'; // Placeholder
    sectorDiversification[sector] = (sectorDiversification[sector] || 0) + h.weight;
  });
  
  // تعیین سطح ریسک سبد
  let riskScore = 0;
  
  // ریسک تمرکز
  const maxWeight = Math.max(...holdings.map(h => h.weight));
  if (maxWeight > 50) riskScore += 3;
  else if (maxWeight > 30) riskScore += 2;
  else if (maxWeight > 20) riskScore += 1;
  
  // ریسک نوسان
  const losingPositions = holdings.filter(h => h.profitLossPercent < -10).length;
  if (losingPositions > holdings.length * 0.5) riskScore += 2;
  else if (losingPositions > holdings.length * 0.3) riskScore += 1;
  
  // ریسک بازار
  if (marketConditions?.volatility && marketConditions.volatility > 3) riskScore += 2;
  
  let riskLevel: PortfolioAnalysis['riskLevel'] = 'متوسط';
  if (riskScore >= 6) riskLevel = 'خیلی بالا';
  else if (riskScore >= 4) riskLevel = 'بالا';
  else if (riskScore <= 1) riskLevel = 'کم';
  
  // تولید توصیه‌ها
  const recommendations: PortfolioRecommendation[] = [];
  const warnings: string[] = [];
  const opportunities: string[] = [];
  
  // بررسی تمرکز بیش از حد
  if (maxWeight > 40) {
    const concentratedStock = holdings.find(h => h.weight === maxWeight);
    if (concentratedStock) {
      recommendations.push({
        type: 'REDUCE',
        symbol: concentratedStock.symbol,
        action: `کاهش وزن ${concentratedStock.symbol} از ${(concentratedStock.weight).toFixed(1)}% به حداکثر ۲۵%`,
        reason: 'تمرکز بیش از حد سبد در یک نماد - ریسک غیرسیستماتیک بالا',
        priority: 'HIGH',
        expectedImpact: 'کاهش ریسک سبد بدون کاهش قابل توجه بازده مورد انتظار',
        details: {
          currentSituation: `${concentratedStock.weight.toFixed(1)}% از سبد در ${concentratedStock.symbol} متمرکز است`,
          suggestedAction: 'فروش پله‌ای ۳۰-۴۰٪ از موقعیت فعلی',
          rationale: 'اصل تنوع‌بخشی حکم می‌کند هیچ سهمی بیش از ۲۵-۳۰٪ سبد نباشد',
          riskConsideration: 'اگر این سهم ریزش کند، ضرر بزرگی به سبد وارد می‌شود'
        }
      });
      warnings.push(`⚠️ تمرکز خطرناک: ${(concentratedStock.weight).toFixed(1)}% سبد در ${concentratedStock.symbol}`);
    }
  }
  
  // بررسی سهام زیان‌ده
  holdings.forEach(h => {
    if (h.profitLossPercent < -20) {
      recommendations.push({
        type: 'SELL',
        symbol: h.symbol,
        action: `بررسی خروج از ${h.symbol} با ${(Math.abs(h.profitLossPercent)).toFixed(1)}% ضرر`,
        reason: 'ضرر انباشته بیش از ۲۰٪ - نیاز به بازنگری در тез سرمایه‌گذاری',
        priority: 'MEDIUM',
        expectedImpact: 'جلوگیری از ضرر بیشتر و آزادسازی سرمایه برای فرصت‌های بهتر',
        details: {
          currentSituation: `${h.name} با ${(h.profitLossPercent).toFixed(1)}% ضرر مواجه است`,
          suggestedAction: 'اگر تحلیل بنیادی تغییر کرده، خروج پله‌ای؛ اگر نه، میانگین کم کردن',
          rationale: 'هزینه فرصت سرمایه قفل شده در سهم زیان‌ده',
          riskConsideration: 'خروج قطعی ممکن است باعث realization ضرر شود'
        }
      });
    } else if (h.profitLossPercent > 50) {
      opportunities.push(`✅ سود عالی ${h.symbol}: ${(h.profitLossPercent).toFixed(1)}%+ -可以考虑 سیو سود پله‌ای`);
      
      recommendations.push({
        type: 'REDUCE',
        symbol: h.symbol,
        action: `سیو سود پله‌ای از ${h.symbol} با ${(h.profitLossPercent).toFixed(1)}% سود`,
        reason: 'رسیدن به هدف سود - قفل کردن بخشی از سود',
        priority: 'LOW',
        expectedImpact: 'حفظ بخشی از سود کسب شده و کاهش ریسک بازگشت قیمت',
        details: {
          currentSituation: `${h.name} با ${(h.profitLossPercent).toFixed(1)}% سود مواجه است`,
          suggestedAction: 'فروش ۳۰-۵۰٪ از موقعیت و جابجایی به سهم مستعد دیگر',
          rationale: 'سیو سود پله‌ای اصل مهم مدیریت سرمایه است',
          riskConsideration: 'ممکن است سهم به رشد ادامه دهد'
        }
      });
    }
  });
  
  // بررسی تنوع‌بخشی
  const holdingCount = holdings.length;
  if (holdingCount < 5) {
    warnings.push(`⚠️ تنوع‌بخشی پایین: فقط ${holdingCount} نماد در سبد وجود دارد`);
    opportunities.push('پیشنهاد: افزایش تنوع به ۸-۱۲ نماد از صنایع مختلف');
  } else if (holdingCount > 20) {
    warnings.push(`ℹ️ تنوع‌بخشی بیش از حد: ${holdingCount} نماد - مدیریت سخت می‌شود`);
  }
  
  return {
    totalValue,
    totalProfitLoss,
    totalProfitLossPercent,
    sectorDiversification,
    riskLevel,
    recommendations,
    warnings,
    opportunities
  };
}

/**
 * تولید مشاوره سرمایه‌گذاری حرفه‌ای بر اساس سیگنال‌ها
 */
export function generateInvestmentAdvice(
  signal: CompleteSignal,
  portfolioValue: number,
  existingHoldings: PortfolioHolding[]
): InvestmentAdvice | null {
  // اگر سیگنال خرید نیست، مشاوره محدود می‌دهد
  if (!signal.signal.includes('BUY')) {
    if (signal.signal === 'SELL' || signal.signal === 'STRONG_SELL') {
      const existingPosition = existingHoldings.find(h => h.symbol === signal.symbol);
      if (existingPosition) {
        return {
          adviceId: `adv_${Date.now()}_${signal.symbol}`,
          timestamp: Date.now(),
          adviceType: 'خروج از سهم',
          symbol: signal.symbol,
          name: signal.name,
          assetType: 'سهم',
          action: 'فروش',
          quantity: existingPosition.quantity,
          value: existingPosition.totalValue,
          percentageOfPortfolio: existingPosition.weight,
          timeHorizon: 'کوتاه‌مدت (۱-۷ روز)',
          validUntil: signal.validUntil,
          reasons: signal.reasons,
          technicalReasons: signal.technicalReasons,
          fundamentalReasons: signal.fundamentalReasons,
          smartMoneyReasons: signal.smartMoneyReasons,
          risks: signal.risks,
          warnings: signal.warnings,
          confidence: signal.confidence
        };
      }
    }
    return null;
  }
  
  // محاسبه مقدار پیشنهادی برای خرید
  const suggestedPercent = signal.suggestedPosition;
  const suggestedValue = (portfolioValue * suggestedPercent) / 100;
  const suggestedQuantity = suggestedValue / signal.entryPrice;
  
  // تعیین افق زمانی بر اساس نوع تحلیل
  let timeHorizon: InvestmentAdvice['timeHorizon'] = 'میان‌مدت (۱-۴ هفته)';
  if (signal.technicalAnalysis.type === 'STRONG_BUY' && signal.fundamentalAnalysis.upside < 20) {
    timeHorizon = 'کوتاه‌مدت (۱-۷ روز)';
  } else if (signal.fundamentalAnalysis.upside > 50) {
    timeHorizon = 'بلندمدت (۱+ ماه)';
  }
  
  // ساخت مشاوره کامل
  const advice: InvestmentAdvice = {
    adviceId: `adv_${Date.now()}_${signal.symbol}`,
    timestamp: Date.now(),
    adviceType: signal.signal === 'STRONG_BUY' ? 'ورود به سهم' : 'افزایش موقعیت',
    symbol: signal.symbol,
    name: signal.name,
    assetType: 'سهم',
    action: 'خرید',
    quantity: Math.round(suggestedQuantity),
    value: Math.round(suggestedValue),
    percentageOfPortfolio: suggestedPercent,
    
    entryPrice: signal.entryPrice,
    entryRange: signal.entryRange,
    stopLoss: signal.stopLoss,
    takeProfitTargets: {
      tp1: signal.takeProfit1,
      tp2: signal.takeProfit2,
      tp3: signal.takeProfit3
    },
    
    timeHorizon,
    validUntil: signal.validUntil,
    
    reasons: signal.reasons,
    technicalReasons: signal.technicalReasons,
    fundamentalReasons: signal.fundamentalReasons,
    smartMoneyReasons: signal.smartMoneyReasons,
    
    risks: signal.risks,
    warnings: signal.warnings,
    
    confidence: signal.confidence
  };
  
  return advice;
}

/**
 * تولید گزارش تحلیلی کامل از سبد
 */
export function generatePortfolioReport(
  analysis: PortfolioAnalysis,
  holdings: PortfolioHolding[]
): string {
  let report = `📊 گزارش جامع سبد سرمایه‌گذاری\n`;
  report += `══════════════════════════════════\n\n`;
  
  report += `💰 ارزش کل سبد: ${analysis.totalValue.toLocaleString()} تومان\n`;
  report += `📈 سود/زیان کل: ${analysis.totalProfitLoss.toLocaleString()} تومان (${analysis.totalProfitLossPercent.toFixed(2)}%)\n`;
  report += `⚠️ سطح ریسک: ${analysis.riskLevel}\n\n`;
  
  report += `📋 وضعیت نمادها:\n`;
  holdings.forEach(h => {
    const emoji = h.profitLossPercent >= 0 ? '✅' : '❌';
    report += `${emoji} ${h.symbol}: ${h.profitLossPercent.toFixed(2)}% (${h.weight.toFixed(1)}% سبد)\n`;
  });
  
  if (analysis.recommendations.length > 0) {
    report += `\n🎯 توصیه‌های اجرایی:\n`;
    analysis.recommendations.forEach((rec, i) => {
      const priorityEmoji = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
      report += `${priorityEmoji} ${i + 1}. ${rec.action}\n`;
      report += `   دلیل: ${rec.reason}\n`;
    });
  }
  
  if (analysis.warnings.length > 0) {
    report += `\n⚠️ هشدارها:\n`;
    analysis.warnings.forEach(w => report += `• ${w}\n`);
  }
  
  if (analysis.opportunities.length > 0) {
    report += `\n✨ فرصت‌ها:\n`;
    analysis.opportunities.forEach(o => report += `• ${o}\n`);
  }
  
  return report;
}
