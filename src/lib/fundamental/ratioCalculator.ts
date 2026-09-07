/**
 * محاسبه‌گر نسبت‌های مالی
 * بدون هیچ داده‌ی هاردکد - فقط فرمول‌های محاسباتی
 */

import { FinancialStatement, QuarterlyData, AnnualData, FinancialRatios } from './types.js';

/**
 * محاسبه تمام نسبت‌های مالی از صورت‌های مالی
 */
export function calculateFinancialRatios(
  statement: FinancialStatement,
  previousStatement?: FinancialStatement,
  marketCap?: number,
  enterpriseValue?: number
): FinancialRatios {
  // نسبت‌های سودآوری
  const grossMargin = statement.revenue > 0 
    ? (statement.revenue - statement.costOfGoodsSold) / statement.revenue 
    : 0;
  
  const operatingMargin = statement.revenue > 0 
    ? (statement.revenue - statement.costOfGoodsSold - statement.operatingExpenses) / statement.revenue 
    : 0;
  
  const netMargin = statement.revenue > 0 
    ? statement.netIncome / statement.revenue 
    : 0;
  
  const roe = statement.shareholdersEquity > 0 
    ? statement.netIncome / statement.shareholdersEquity 
    : 0;
  
  const roa = statement.totalAssets > 0 
    ? statement.netIncome / statement.totalAssets 
    : 0;
  
  const roc = (statement.totalAssets - statement.currentLiabilities) > 0
    ? statement.netIncome / (statement.totalAssets - statement.currentLiabilities)
    : 0;
  
  const roi = statement.workingCapital > 0
    ? statement.netIncome / statement.workingCapital
    : 0;

  // نسبت‌های نقدینگی
  const currentRatio = statement.currentLiabilities > 0 
    ? statement.currentAssets / statement.currentLiabilities 
    : 0;
  
  const quickRatio = statement.currentLiabilities > 0 
    ? (statement.currentAssets - statement.inventory) / statement.currentLiabilities 
    : 0;
  
  const cashRatio = statement.currentLiabilities > 0
    ? (statement.currentAssets - statement.inventory - statement.accountsReceivable) / statement.currentLiabilities
    : 0;
  
  const workingCapital = statement.currentAssets - statement.currentLiabilities;

  // نسبت‌های اهرمی
  const debtToEquity = statement.shareholdersEquity > 0 
    ? (statement.shortTermDebt + statement.longTermDebt) / statement.shareholdersEquity 
    : 0;
  
  const debtToAssets = statement.totalAssets > 0 
    ? (statement.shortTermDebt + statement.longTermDebt) / statement.totalAssets 
    : 0;
  
  const interestCoverage = statement.interestExpense > 0 
    ? (statement.netIncome + statement.interestExpense + statement.taxExpense) / statement.interestExpense 
    : Infinity;
  
  const debtServiceCoverage = (statement.shortTermDebt + statement.longTermDebt) > 0
    ? statement.operatingCashFlow / (statement.shortTermDebt + statement.longTermDebt)
    : Infinity;

  // نسبت‌های کارایی
  const assetTurnover = statement.totalAssets > 0 
    ? statement.revenue / statement.totalAssets 
    : 0;
  
  const inventoryTurnover = statement.inventory > 0 
    ? statement.costOfGoodsSold / statement.inventory 
    : 0;
  
  const receivablesTurnover = statement.accountsReceivable > 0 
    ? statement.revenue / statement.accountsReceivable 
    : 0;
  
  const payablesTurnover = statement.accountsPayable > 0 
    ? statement.costOfGoodsSold / statement.accountsPayable 
    : 0;
  
  const daysInventory = inventoryTurnover > 0 ? 365 / inventoryTurnover : 0;
  const daysReceivables = receivablesTurnover > 0 ? 365 / receivablesTurnover : 0;
  const daysPayables = payablesTurnover > 0 ? 365 / payablesTurnover : 0;
  const cashConversionCycle = daysInventory + daysReceivables - daysPayables;

  // نسبت‌های ارزش‌گذاری
  const peRatio = marketCap && statement.netIncome > 0 
    ? marketCap / statement.netIncome 
    : 0;
  
  const pbRatio = statement.shareholdersEquity > 0 && marketCap 
    ? marketCap / statement.shareholdersEquity 
    : 0;
  
  const psRatio = statement.revenue > 0 && marketCap 
    ? marketCap / statement.revenue 
    : 0;
  
  const pcfRatio = statement.operatingCashFlow > 0 && marketCap 
    ? marketCap / statement.operatingCashFlow 
    : 0;
  
  const evToEbitda = enterpriseValue && (statement.netIncome + statement.interestExpense + statement.taxExpense + statement.depreciation) > 0
    ? enterpriseValue / (statement.netIncome + statement.interestExpense + statement.taxExpense + statement.depreciation)
    : 0;
  
  const evToRevenue = statement.revenue > 0 && enterpriseValue 
    ? enterpriseValue / statement.revenue 
    : 0;
  
  const pegRatio = 0; // نیاز به داده رشد EPS دارد

  // نسبت‌های رشد
  const revenueGrowth1Y = previousStatement && previousStatement.revenue > 0
    ? (statement.revenue - previousStatement.revenue) / previousStatement.revenue
    : 0;
  
  const epsGrowth1Y = previousStatement && previousStatement.commonSharesOutstanding > 0 && statement.commonSharesOutstanding > 0
    ? ((statement.netIncome / statement.commonSharesOutstanding) - (previousStatement.netIncome / previousStatement.commonSharesOutstanding)) / (previousStatement.netIncome / previousStatement.commonSharesOutstanding)
    : 0;

  return {
    profitability: {
      grossMargin,
      operatingMargin,
      netMargin,
      roe,
      roa,
      roc,
      roi,
    },
    liquidity: {
      currentRatio,
      quickRatio,
      cashRatio,
      workingCapital,
    },
    leverage: {
      debtToEquity,
      debtToAssets,
      interestCoverage,
      debtServiceCoverage,
    },
    efficiency: {
      assetTurnover,
      inventoryTurnover,
      receivablesTurnover,
      payablesTurnover,
      cashConversionCycle,
    },
    valuation: {
      peRatio,
      pbRatio,
      psRatio,
      pcfRatio,
      evToEbitda,
      evToRevenue,
      pegRatio,
    },
    growth: {
      revenueGrowth1Y,
      revenueGrowth3Y: 0, // نیاز به ۳ سال داده تاریخی
      revenueGrowth5Y: 0, // نیاز به ۵ سال داده تاریخی
      epsGrowth1Y,
      epsGrowth3Y: 0,
      epsGrowth5Y: 0,
      dividendGrowth1Y: 0,
      dividendGrowth3Y: 0,
    },
  };
}

/**
 * محاسبه حاشیه سود ناخالص
 */
export function calculateGrossMargin(revenue: number, cogs: number): number {
  if (revenue <= 0) return 0;
  return (revenue - cogs) / revenue;
}

/**
 * محاسبه حاشیه سود عملیاتی
 */
export function calculateOperatingMargin(revenue: number, operatingIncome: number): number {
  if (revenue <= 0) return 0;
  return operatingIncome / revenue;
}

/**
 * محاسبه حاشیه سود خالص
 */
export function calculateNetMargin(revenue: number, netIncome: number): number {
  if (revenue <= 0) return 0;
  return netIncome / revenue;
}

/**
 * محاسبه بازده حقوق صاحبان سهام (ROE)
 */
export function calculateROE(netIncome: number, shareholdersEquity: number): number {
  if (shareholdersEquity <= 0) return 0;
  return netIncome / shareholdersEquity;
}

/**
 * محاسبه بازده دارایی‌ها (ROA)
 */
export function calculateROA(netIncome: number, totalAssets: number): number {
  if (totalAssets <= 0) return 0;
  return netIncome / totalAssets;
}

/**
 * محاسبه نسبت بدهی به حقوق صاحبان سهام
 */
export function calculateDebtToEquity(totalDebt: number, shareholdersEquity: number): number {
  if (shareholdersEquity <= 0) return 0;
  return totalDebt / shareholdersEquity;
}

/**
 * محاسبه نسبت جاری
 */
export function calculateCurrentRatio(currentAssets: number, currentLiabilities: number): number {
  if (currentLiabilities <= 0) return 0;
  return currentAssets / currentLiabilities;
}

/**
 * محاسبه نسبت آنی
 */
export function calculateQuickRatio(currentAssets: number, inventory: number, currentLiabilities: number): number {
  if (currentLiabilities <= 0) return 0;
  return (currentAssets - inventory) / currentLiabilities;
}

/**
 * محاسبه پوشش بهره
 */
export function calculateInterestCoverage(ebit: number, interestExpense: number): number {
  if (interestExpense <= 0) return Infinity;
  return ebit / interestExpense;
}

/**
 * محاسبه گردش دارایی
 */
export function calculateAssetTurnover(revenue: number, totalAssets: number): number {
  if (totalAssets <= 0) return 0;
  return revenue / totalAssets;
}

/**
 * محاسبه دوره وصول مطالبات
 */
export function calculateDaysReceivables(receivablesTurnover: number): number {
  if (receivablesTurnover <= 0) return 0;
  return 365 / receivablesTurnover;
}

/**
 * محاسبه دوره گردش موجودی
 */
export function calculateDaysInventory(inventoryTurnover: number): number {
  if (inventoryTurnover <= 0) return 0;
  return 365 / inventoryTurnover;
}

/**
 * محاسبه چرخه تبدیل نقد
 */
export function calculateCashConversionCycle(
  daysInventory: number,
  daysReceivables: number,
  daysPayables: number
): number {
  return daysInventory + daysReceivables - daysPayables;
}
