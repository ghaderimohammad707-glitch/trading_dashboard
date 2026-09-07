/**
 * سیستم امتیازدهی بنیادی به سبک Benjamin Graham
 * بدون هیچ داده‌ی هاردکد - فقط منطق امتیازدهی
 */

import { FinancialRatios, FundamentalScore, TrendAnalysis } from './types.js';

const MAX_SCORE = 100;

/**
 * امتیازدهی به سودآوری (حداکثر ۲۵ امتیاز)
 */
function scoreProfitability(ratios: FinancialRatios): number {
  let score = 0;

  // ROE > 15%: ۱۰ امتیاز
  if (ratios.profitability.roe > 0.15) score += 10;
  else if (ratios.profitability.roe > 0.10) score += 7;
  else if (ratios.profitability.roe > 0.05) score += 4;

  // حاشیه سود خالص > 10%: ۸ امتیاز
  if (ratios.profitability.netMargin > 0.10) score += 8;
  else if (ratios.profitability.netMargin > 0.05) score += 5;
  else if (ratios.profitability.netMargin > 0) score += 2;

  // حاشیه سود عملیاتی > 15%: ۷ امتیاز
  if (ratios.profitability.operatingMargin > 0.15) score += 7;
  else if (ratios.profitability.operatingMargin > 0.08) score += 4;
  else if (ratios.profitability.operatingMargin > 0) score += 2;

  return Math.min(score, 25);
}

/**
 * امتیازدهی به سلامت مالی (حداکثر ۲۵ امتیاز)
 */
function scoreFinancialHealth(ratios: FinancialRatios): number {
  let score = 0;

  // نسبت جاری > 2: ۸ امتیاز
  if (ratios.liquidity.currentRatio > 2) score += 8;
  else if (ratios.liquidity.currentRatio > 1.5) score += 5;
  else if (ratios.liquidity.currentRatio > 1) score += 3;

  // نسبت بدهی به حقوق صاحبان سهام < 0.5: ۹ امتیاز
  if (ratios.leverage.debtToEquity < 0.5) score += 9;
  else if (ratios.leverage.debtToEquity < 1) score += 6;
  else if (ratios.leverage.debtToEquity < 2) score += 3;

  // پوشش بهره > 5: ۸ امتیاز
  if (ratios.leverage.interestCoverage > 5) score += 8;
  else if (ratios.leverage.interestCoverage > 3) score += 5;
  else if (ratios.leverage.interestCoverage > 1.5) score += 3;

  return Math.min(score, 25);
}

/**
 * امتیازدهی به رشد (حداکثر ۲۰ امتیاز)
 */
function scoreGrowth(ratios: FinancialRatios): number {
  let score = 0;

  // رشد درآمد سالانه > 10%: ۷ امتیاز
  if (ratios.growth.revenueGrowth1Y > 0.10) score += 7;
  else if (ratios.growth.revenueGrowth1Y > 0.05) score += 4;
  else if (ratios.growth.revenueGrowth1Y > 0) score += 2;

  // رشد EPS سالانه > 10%: ۷ امتیاز
  if (ratios.growth.epsGrowth1Y > 0.10) score += 7;
  else if (ratios.growth.epsGrowth1Y > 0.05) score += 4;
  else if (ratios.growth.epsGrowth1Y > 0) score += 2;

  // رشد درآمد ۳ ساله > 8%: ۶ امتیاز
  if (ratios.growth.revenueGrowth3Y > 0.08) score += 6;
  else if (ratios.growth.revenueGrowth3Y > 0.04) score += 3;
  else if (ratios.growth.revenueGrowth3Y > 0) score += 1;

  return Math.min(score, 20);
}

/**
 * امتیازدهی به ارزش‌گذاری (حداکثر ۲۰ امتیاز)
 */
function scoreValuation(ratios: FinancialRatios): number {
  let score = 0;

  // P/E < 15: ۷ امتیاز
  if (ratios.valuation.peRatio > 0 && ratios.valuation.peRatio < 15) score += 7;
  else if (ratios.valuation.peRatio > 0 && ratios.valuation.peRatio < 20) score += 4;
  else if (ratios.valuation.peRatio > 0 && ratios.valuation.peRatio < 25) score += 2;

  // P/B < 2: ۷ امتیاز
  if (ratios.valuation.pbRatio > 0 && ratios.valuation.pbRatio < 2) score += 7;
  else if (ratios.valuation.pbRatio > 0 && ratios.valuation.pbRatio < 3) score += 4;
  else if (ratios.valuation.pbRatio > 0 && ratios.valuation.pbRatio < 4) score += 2;

  // P/S < 3: ۶ امتیاز
  if (ratios.valuation.psRatio > 0 && ratios.valuation.psRatio < 3) score += 6;
  else if (ratios.valuation.psRatio > 0 && ratios.valuation.psRatio < 5) score += 3;
  else if (ratios.valuation.psRatio > 0 && ratios.valuation.psRatio < 8) score += 1;

  return Math.min(score, 20);
}

/**
 * امتیازدهی به کارایی (حداکثر ۱۰ امتیاز)
 */
function scoreEfficiency(ratios: FinancialRatios): number {
  let score = 0;

  // گردش دارایی > 1: ۴ امتیاز
  if (ratios.efficiency.assetTurnover > 1) score += 4;
  else if (ratios.efficiency.assetTurnover > 0.7) score += 2;
  else if (ratios.efficiency.assetTurnover > 0.4) score += 1;

  // گردش موجودی > 6: ۳ امتیاز
  if (ratios.efficiency.inventoryTurnover > 6) score += 3;
  else if (ratios.efficiency.inventoryTurnover > 4) score += 2;
  else if (ratios.efficiency.inventoryTurnover > 2) score += 1;

  // چرخه تبدیل نقد < 60 روز: ۳ امتیاز
  if (ratios.efficiency.cashConversionCycle > 0 && ratios.efficiency.cashConversionCycle < 60) score += 3;
  else if (ratios.efficiency.cashConversionCycle >= 60 && ratios.efficiency.cashConversionCycle < 90) score += 2;
  else if (ratios.efficiency.cashConversionCycle >= 90 && ratios.efficiency.cashConversionCycle < 120) score += 1;

  return Math.min(score, 10);
}

/**
 * محاسبه امتیاز کل و شکست آن
 */
export function calculateFundamentalScore(ratios: FinancialRatios): FundamentalScore {
  const profitabilityScore = scoreProfitability(ratios);
  const financialHealthScore = scoreFinancialHealth(ratios);
  const growthScore = scoreGrowth(ratios);
  const valuationScore = scoreValuation(ratios);
  const efficiencyScore = scoreEfficiency(ratios);

  const totalScore = profitabilityScore + financialHealthScore + growthScore + valuationScore + efficiencyScore;
  const percentage = (totalScore / MAX_SCORE) * 100;

  // تعیین رتبه
  let grade: FundamentalScore['grade'];
  if (percentage >= 90) grade = 'A+';
  else if (percentage >= 85) grade = 'A';
  else if (percentage >= 80) grade = 'A-';
  else if (percentage >= 75) grade = 'B+';
  else if (percentage >= 70) grade = 'B';
  else if (percentage >= 65) grade = 'B-';
  else if (percentage >= 60) grade = 'C+';
  else if (percentage >= 55) grade = 'C';
  else if (percentage >= 50) grade = 'C-';
  else if (percentage >= 40) grade = 'D';
  else grade = 'F';

  return {
    totalScore,
    maxScore: MAX_SCORE,
    percentage,
    breakdown: {
      profitability: profitabilityScore,
      financialHealth: financialHealthScore,
      growth: growthScore,
      valuation: valuationScore,
      efficiency: efficiencyScore,
    },
    grade,
  };
}

/**
 * تحلیل روند
 */
export function analyzeTrends(
  currentRatios: FinancialRatios,
  previousRatios?: FinancialRatios
): TrendAnalysis {
  if (!previousRatios) {
    return {
      revenueTrend: 'STABLE',
      profitTrend: 'STABLE',
      marginTrend: 'STABLE',
      debtTrend: 'STABLE',
      overallTrend: 'NEUTRAL',
    };
  }

  const revenueImproving = currentRatios.growth.revenueGrowth1Y > previousRatios.growth.revenueGrowth1Y;
  const profitImproving = currentRatios.profitability.netMargin > previousRatios.profitability.netMargin;
  const marginImproving = currentRatios.profitability.operatingMargin > previousRatios.profitability.operatingMargin;
  const debtImproving = currentRatios.leverage.debtToEquity < previousRatios.leverage.debtToEquity;

  const revenueTrend = revenueImproving ? 'IMPROVING' : currentRatios.growth.revenueGrowth1Y < 0 ? 'DECLINING' : 'STABLE';
  const profitTrend = profitImproving ? 'IMPROVING' : currentRatios.profitability.netMargin < 0 ? 'DECLINING' : 'STABLE';
  const marginTrend = marginImproving ? 'IMPROVING' : currentRatios.profitability.netMargin < previousRatios.profitability.netMargin ? 'DECLINING' : 'STABLE';
  const debtTrend = debtImproving ? 'IMPROVING' : currentRatios.leverage.debtToEquity > previousRatios.leverage.debtToEquity ? 'WORSENING' : 'STABLE';

  const positiveCount = [revenueImproving, profitImproving, marginImproving, debtImproving].filter(Boolean).length;
  const overallTrend = positiveCount >= 3 ? 'POSITIVE' : positiveCount <= 1 ? 'NEGATIVE' : 'NEUTRAL';

  return {
    revenueTrend,
    profitTrend,
    marginTrend,
    debtTrend,
    overallTrend,
  };
}

/**
 * تعیین توصیه نهایی بر اساس امتیاز و ارزش‌گذاری
 */
export function determineRecommendation(
  score: FundamentalScore,
  valuationStatus: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED'
): 'BUY_STRONG' | 'BUY' | 'HOLD' | 'SELL' | 'SELL_STRONG' {
  const { percentage } = score;

  if (percentage >= 80 && valuationStatus === 'UNDERVALUED') {
    return 'BUY_STRONG';
  } else if (percentage >= 70 && valuationStatus === 'UNDERVALUED') {
    return 'BUY';
  } else if (percentage >= 60 || valuationStatus === 'FAIRLY_VALUED') {
    return 'HOLD';
  } else if (percentage < 50 && valuationStatus === 'OVERVALUED') {
    return 'SELL_STRONG';
  } else if (percentage < 60 || valuationStatus === 'OVERVALUED') {
    return 'SELL';
  }

  return 'HOLD';
}

/**
 * شناسایی نقاط قوت و ریسک‌ها
 */
export function identifyStrengthsAndRisks(ratios: FinancialRatios): {
  strengths: string[];
  risks: string[];
} {
  const strengths: string[] = [];
  const risks: string[] = [];

  // نقاط قوت
  if (ratios.profitability.roe > 0.15) strengths.push('بازده حقوق صاحبان سهام عالی (بالای ۱۵٪)');
  if (ratios.profitability.netMargin > 0.10) strengths.push('حاشیه سود خالص بالا (بالای ۱۰٪)');
  if (ratios.liquidity.currentRatio > 2) strengths.push('نقدینگی قوی (نسبت جاری بالای ۲)');
  if (ratios.leverage.debtToEquity < 0.5) strengths.push('بدهی پایین نسبت به حقوق صاحبان سهام');
  if (ratios.growth.revenueGrowth1Y > 0.10) strengths.push('رشد درآمد بالای ۱۰٪');
  if (ratios.growth.epsGrowth1Y > 0.10) strengths.push('رشد سود هر سهم بالای ۱۰٪');
  if (ratios.efficiency.assetTurnover > 1) strengths.push('کارایی بالای دارایی‌ها');

  // ریسک‌ها
  if (ratios.profitability.roe < 0.05) risks.push('بازده حقوق صاحبان سهام پایین (زیر ۵٪)');
  if (ratios.profitability.netMargin < 0) risks.push('زیان‌ده (حاشیه سود منفی)');
  if (ratios.liquidity.currentRatio < 1) risks.push('نقدینگی ضعیف (نسبت جاری زیر ۱)');
  if (ratios.leverage.debtToEquity > 2) risks.push('بدهی بالا نسبت به حقوق صاحبان سهام');
  if (ratios.growth.revenueGrowth1Y < -0.10) risks.push('کاهش درآمد بیش از ۱۰٪');
  if (ratios.growth.epsGrowth1Y < -0.10) risks.push('کاهش سود هر سهم بیش از ۱۰٪');
  if (ratios.leverage.interestCoverage < 1.5) risks.push('پوشش بهره ناکافی');
  if (ratios.efficiency.cashConversionCycle > 120) risks.push('چرخه تبدیل نقد طولانی (بیش از ۱۲۰ روز)');

  return { strengths, risks };
}
