/**
 * موتور مدیریت پرتفوی و مشاور هوشمند سرمایه‌گذاری
 * تحلیل سبد دارایی کاربر، ارائه پیشنهادات خرید/فروش و تنظیم بهینه سبد
 */

import type { CompleteSignal } from './signalGenerator';

export interface PortfolioItem {
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  value: number;
  profitLoss: number;
  profitLossPercent: number;
  weight: number; // درصد از کل سبد
}

export interface PortfolioAnalysis {
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  items: PortfolioItem[];
  
  // تنوع‌بخشی
  sectorDiversification: Record<string, number>;
  riskLevel: 'low' | 'medium' | 'high';
  
  // پیشنهادات مشاور
  recommendations: InvestmentRecommendation[];
  overallAdvice: string;
}

export interface InvestmentRecommendation {
  id: string;
  type: 'buy' | 'sell' | 'hold' | 'rebalance';
  symbol: string;
  action: string; // توضیح کامل اقدام
  reason: string; // دلیل توصیه
  targetWeight?: number; // درصد هدف در سبد
  urgency: 'low' | 'medium' | 'high';
  expectedReturn?: number; // بازده مورد انتظار
  risk?: string; // ریسک مرتبط
}

/**
 * تحلیل کامل پرتفوی کاربر
 */
export function analyzePortfolio(
  holdings: Array<{ symbol: string; quantity: number; avgBuyPrice: number }>,
  currentPrices: Record<string, number>
): PortfolioAnalysis {
  const items: PortfolioItem[] = [];
  let totalValue = 0;
  let totalCost = 0;
  const sectorWeights: Record<string, number> = {};
  
  // محاسبه ارزش و سود/زیان هر سهم
  for (const holding of holdings) {
    const currentPrice = currentPrices[holding.symbol] || holding.avgBuyPrice;
    const value = holding.quantity * currentPrice;
    const cost = holding.quantity * holding.avgBuyPrice;
    const profitLoss = value - cost;
    const profitLossPercent = cost > 0 ? (profitLoss / cost) * 100 : 0;
    
    items.push({
      symbol: holding.symbol,
      quantity: holding.quantity,
      avgBuyPrice: holding.avgBuyPrice,
      currentPrice,
      value,
      profitLoss,
      profitLossPercent,
      weight: 0, // بعداً محاسبه می‌شود
    });
    
    totalValue += value;
    totalCost += cost;
    
    // تخمین صنعت بر اساس نماد (ساده‌شده)
    const sector = estimateSector(holding.symbol);
    sectorWeights[sector] = (sectorWeights[sector] || 0) + value;
  }
  
  // محاسبه وزن هر سهم
  if (totalValue > 0) {
    for (const item of items) {
      item.weight = (item.value / totalValue) * 100;
    }
    
    // نرمال‌سازی وزن صنایع
    for (const sector in sectorWeights) {
      sectorWeights[sector] = (sectorWeights[sector] / totalValue) * 100;
    }
  }
  
  const totalProfitLoss = totalValue - totalCost;
  const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;
  
  // تعیین سطح ریسک
  let riskLevel: PortfolioAnalysis['riskLevel'] = 'medium';
  if (items.length <= 3 || Object.keys(sectorWeights).length <= 2) {
    riskLevel = 'high';
  } else if (items.length >= 8 && Object.keys(sectorWeights).length >= 4) {
    riskLevel = 'low';
  }
  
  // تولید پیشنهادات سرمایه‌گذاری
  const recommendations = generateRecommendations(items, sectorWeights, riskLevel);
  
  // توصیه کلی
  const overallAdvice = generateOverallAdvice(totalProfitLossPercent, riskLevel, items.length);
  
  return {
    totalValue,
    totalProfitLoss,
    totalProfitLossPercent,
    items,
    sectorDiversification: sectorWeights,
    riskLevel,
    recommendations,
    overallAdvice,
  };
}

/**
 * تولید پیشنهادات سرمایه‌گذاری هوشمند
 */
function generateRecommendations(
  items: PortfolioItem[],
  sectorWeights: Record<string, number>,
  riskLevel: string
): InvestmentRecommendation[] {
  const recommendations: InvestmentRecommendation[] = [];
  
  // بررسی تمرکز بیش از حد
  for (const [sector, weight] of Object.entries(sectorWeights)) {
    if (weight > 40) {
      recommendations.push({
        id: `rec_${sector}_diversify`,
        type: 'rebalance',
        symbol: sector,
        action: `کاهش وزن ${sector} از ${weight.toFixed(1)}% به حداکثر 30%`,
        reason: `تمرکز بیش از حد در صنعت ${sector} ریسک سبد را افزایش داده است. پیشنهاد می‌شود با فروش بخشی از این صنعت و خرید از صنایع دیگر، تنوع‌بخشی مناسب ایجاد کنید.`,
        targetWeight: 30,
        urgency: 'high',
        risk: 'ریسک سیستماتیک صنعت',
      });
    }
  }
  
  // بررسی سهام با زیان زیاد
  for (const item of items) {
    if (item.profitLossPercent < -20) {
      recommendations.push({
        id: `rec_${item.symbol}_loss`,
        type: 'sell',
        symbol: item.symbol,
        action: `بررسی دقیق و احتمال فروش ${item.symbol} با ${(Math.abs(item.profitLossPercent)).toFixed(1)}% زیان`,
        reason: `این سهم ${(Math.abs(item.profitLossPercent)).toFixed(1)}% زیان دارد. اگر چشم‌انداز بنیادی آن تغییر کرده، بهتر است با زیان کمتر خارج شوید و سرمایه را در فرصت‌های بهتر قرار دهید.`,
        urgency: 'medium',
        expectedReturn: -10,
        risk: 'ادامه روند نزولی',
      });
    } else if (item.profitLossPercent > 50 && item.weight > 15) {
      recommendations.push({
        id: `rec_${item.symbol}_profit`,
        type: 'sell',
        symbol: item.symbol,
        action: `سیو سود جزئی از ${item.symbol} با ${item.profitLossPercent.toFixed(1)}% سود`,
        reason: `با توجه به سود ${(item.profitLossPercent).toFixed(1)}% و وزن بالای ${(item.weight).toFixed(1)}%، پیشنهاد می‌شود 30-50% از سهم را فروخته و سود را شناسایی کنید.`,
        targetWeight: 10,
        urgency: 'low',
        expectedReturn: 20,
        risk: 'اصلاح قیمت پس از رشد',
      });
    }
  }
  
  // بررسی تنوع‌بخشی
  if (items.length < 5) {
    recommendations.push({
      id: 'rec_diversify_general',
      type: 'buy',
      symbol: 'MARKET',
      action: 'افزایش تنوع سبد با خرید 3-5 سهم جدید از صنایع مختلف',
      reason: `سبد شما فقط ${items.length} سهم دارد که تنوع کافی نیست. برای کاهش ریسک، حداقل 8-10 سهم از 4-5 صنعت مختلف داشته باشید.`,
      urgency: 'high',
      expectedReturn: 15,
      risk: 'ریسک غیرسیستماتیک بالا',
    });
  }
  
  // پیشنهاد خرید صندوق طلا اگر هیچ طلایی وجود ندارد
  const hasGold = items.some(i => i.symbol.includes('طلا') || i.symbol.includes('عیار'));
  if (!hasGold) {
    recommendations.push({
      id: 'rec_gold_fund',
      type: 'buy',
      symbol: 'صندوق طلا (عیار)',
      action: 'اختصاص 10-15% از سبد به صندوق طلا مانند "عیار" یا "لوتوس"',
      reason: 'طلا به عنوان پوشش ریسک تورم و نوسانات بازار عمل می‌کند. در شرایط فعلی اقتصاد ایران، داشتن 10-15% طلا در سبد توصیه می‌شود.',
      targetWeight: 12,
      urgency: 'medium',
      expectedReturn: 25,
      risk: 'نوسانات قیمت جهانی طلا',
    });
  }
  
  return recommendations;
}

/**
 * تخمین صنعت بر اساس نماد
 */
function estimateSector(symbol: string): string {
  if (symbol.includes('خودرو') || symbol.includes('خساپا')) return 'خودرو';
  if (symbol.includes('فولاد') || symbol.includes('ذوب')) return 'فولاد و فلزات';
  if (symbol.includes('بانک') || symbol.includes('وب') || symbol.includes('ملت')) return 'بانکی';
  if (symbol.includes('پترو') || symbol.includes('شستا')) return 'پتروشیمی';
  if (symbol.includes('سیمان')) return 'سیمان';
  if (symbol.includes('قند') || symbol.includes('شکر')) return 'قند و شکر';
  if (symbol.includes('دارو') || symbol.includes('دوه')) return 'دارویی';
  if (symbol.includes('طلا') || symbol.includes('عیار')) return 'طلا';
  return 'سایر';
}

/**
 * تولید توصیه کلی
 */
function generateOverallAdvice(
  totalProfitLossPercent: number,
  riskLevel: string,
  itemCount: number
): string {
  const advice: string[] = [];
  
  if (totalProfitLossPercent > 20) {
    advice.push(`سبد شما با ${(totalProfitLossPercent).toFixed(1)}% سود عملکرد عالی داشته است.`);
  } else if (totalProfitLossPercent > 0) {
    advice.push(`سبد شما با ${(totalProfitLossPercent).toFixed(1)}% سود در وضعیت مناسبی است.`);
  } else if (totalProfitLossPercent > -10) {
    advice.push(`سبد شما ${(Math.abs(totalProfitLossPercent)).toFixed(1)}% زیان دارد که با نوسان بازار طبیعی است.`);
  } else {
    advice.push(`سبد شما ${(Math.abs(totalProfitLossPercent)).toFixed(1)}% زیان دارد. بازبینی استراتژی توصیه می‌شود.`);
  }
  
  if (riskLevel === 'high') {
    advice.push('ریسک سبد بالا است. حتماً تنوع‌بخشی را جدی بگیرید.');
  } else if (riskLevel === 'low') {
    advice.push('تنوع‌بخشی سبد مناسب است و ریسک کنترل شده است.');
  }
  
  if (itemCount < 5) {
    advice.push('تعداد سهام کم است. حداقل 8 سهم از صنایع مختلف داشته باشید.');
  }
  
  return advice.join(' ');
}

/**
 * شبیه‌سازی اثر پیشنهادها روی سبد
 */
export function simulateRebalance(
  currentHoldings: PortfolioItem[],
  recommendations: InvestmentRecommendation[]
): PortfolioItem[] {
  // کپی عمیق از holdings
  const simulated = currentHoldings.map(item => ({ ...item }));
  
  for (const rec of recommendations) {
    if (rec.type === 'sell' && rec.targetWeight) {
      const item = simulated.find(i => i.symbol === rec.symbol);
      if (item) {
        // کاهش وزن به مقدار هدف
        const reduction = item.weight - rec.targetWeight;
        if (reduction > 0) {
          item.weight = rec.targetWeight;
          item.value = item.value * (rec.targetWeight / (item.weight + reduction));
          item.quantity = Math.floor(item.value / item.currentPrice);
        }
      }
    }
  }
  
  return simulated;
}
