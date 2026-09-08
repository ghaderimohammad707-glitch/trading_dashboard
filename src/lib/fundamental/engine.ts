/**
 * موتور اصلی تحلیل بنیادی
 * بدون هیچ داده‌ی هاردکد - فقط هماهنگ‌کننده ماژول‌ها
 */

import { FinancialStatement, FundamentalAnalysisResult, CompanyProfile, QuarterlyData, AnnualData } from './types.js';
import { calculateFinancialRatios } from './ratioCalculator.js';
import { calculateDCFValuation, calculatePEValuation, calculatePBValuation, createValuationResult } from './valuator.js';
import { calculateFundamentalScore, analyzeTrends, determineRecommendation, identifyStrengthsAndRisks } from './scorer.js';

/**
 * ورودی کامل برای تحلیل بنیادی
 */
export interface FundamentalAnalysisInput {
  symbol: string;
  companyProfile: CompanyProfile;
  latestQuarterly: QuarterlyData | null;
  latestAnnual: AnnualData | null;
  previousAnnual?: AnnualData | null;
  industryData?: {
    avgPE: number;
    avgPB: number;
    avgROE: number;
    avgGrowth: number;
  };
  marketData?: {
    riskFreeRate: number;
    marketReturn: number;
    inflationRate: number;
  };
}

/**
 * انجام تحلیل بنیادی کامل
 */
export async function performFundamentalAnalysis(
  input: FundamentalAnalysisInput
): Promise<FundamentalAnalysisResult> {
  const {
    symbol,
    companyProfile,
    latestQuarterly,
    latestAnnual,
    previousAnnual,
    industryData,
    marketData,
  } = input;

  // استفاده از داده‌های سالانه اگر موجود باشند، در غیر این صورت فصلی
  const primaryStatement: FinancialStatement | null = latestAnnual || latestQuarterly;

  if (!primaryStatement) {
    throw new Error(`هیچ داده‌ی مالی برای ${symbol} یافت نشد.`);
  }

  // محاسبه نسبت‌های مالی
  const marketCap = companyProfile.marketCap;
  const enterpriseValue = marketCap + primaryStatement.longTermDebt + primaryStatement.shortTermDebt - primaryStatement.operatingCashFlow;

  const ratios = calculateFinancialRatios(
    primaryStatement,
    previousAnnual || undefined,
    marketCap,
    enterpriseValue
  );

  // محاسبه ارزش‌گذاری
  const eps = primaryStatement.netIncome / primaryStatement.commonSharesOutstanding;
  const bookValuePerShare = primaryStatement.shareholdersEquity / primaryStatement.commonSharesOutstanding;
  const freeCashFlowPerShare = primaryStatement.freeCashFlow / primaryStatement.commonSharesOutstanding;

  const dcfValue = calculateDCFValuation(
    primaryStatement.freeCashFlow,
    industryData?.avgGrowth || 0.08,
    (marketData?.marketReturn || 0.15) - (marketData?.riskFreeRate || 0.05),
    marketData?.inflationRate || 0.03,
    primaryStatement.commonSharesOutstanding
  );

  const peValue = calculatePEValuation(
    eps,
    industryData?.avgPE || 15,
    20,
    ratios.growth.revenueGrowth1Y || 0.05,
    industryData?.avgGrowth || 0.08
  );

  const pbValue = calculatePBValuation(
    bookValuePerShare,
    industryData?.avgPB || 2,
    ratios.profitability.roe,
    0.12
  );

  const valuation = createValuationResult(
    companyProfile.currentPrice,
    dcfValue,
    peValue,
    pbValue,
    null
  );

  // محاسبه امتیاز بنیادی
  const score = calculateFundamentalScore(ratios);

  // تحلیل روند
  const previousRatios = previousAnnual 
    ? calculateFinancialRatios(previousAnnual, undefined, marketCap, enterpriseValue)
    : undefined;

  const trends = analyzeTrends(ratios, previousRatios);

  // تعیین توصیه
  const recommendation = determineRecommendation(score, valuation.valuationStatus);

  // شناسایی نقاط قوت و ریسک‌ها
  const { strengths, risks } = identifyStrengthsAndRisks(ratios);

  return {
    symbol,
    analysisDate: new Date().toISOString(),
    companyProfile,
    latestQuarterly,
    latestAnnual,
    ratios,
    valuation,
    score,
    recommendation,
    risks,
    strengths,
    trends,
  };
}

/**
 * تحلیل سریع بنیادی (بدون نیاز به داده‌های تاریخی)
 */
export function quickFundamentalAnalysis(
  statement: FinancialStatement,
  currentPrice: number,
  marketCap: number
): Omit<FundamentalAnalysisResult, 'latestQuarterly' | 'latestAnnual' | 'trends'> & { latestQuarterly: null; latestAnnual: null } {
  const ratios = calculateFinancialRatios(statement, undefined, marketCap, undefined);
  
  const eps = statement.netIncome / statement.commonSharesOutstanding;
  const bookValuePerShare = statement.shareholdersEquity / statement.commonSharesOutstanding;

  const peValue = calculatePEValuation(eps, 15, 20, 0.05, 0.08);
  const pbValue = calculatePBValuation(bookValuePerShare, 2, ratios.profitability.roe, 0.12);

  const valuation = createValuationResult(currentPrice, null, peValue, pbValue, null);
  const score = calculateFundamentalScore(ratios);
  const recommendation = determineRecommendation(score, valuation.valuationStatus);
  const { strengths, risks } = identifyStrengthsAndRisks(ratios);

  return {
    symbol: statement.symbol,
    analysisDate: new Date().toISOString(),
    companyProfile: {
      symbol: statement.symbol,
      name: '',
      sector: '',
      industry: '',
      marketCap,
      sharesOutstanding: statement.commonSharesOutstanding,
      currentPrice,
      dayHigh: 0,
      dayLow: 0,
      week52High: 0,
      week52Low: 0,
      avgVolume: 0,
      beta: 1,
      description: '',
      website: '',
      ceo: '',
      employees: 0,
      foundedYear: 0,
      headquarters: '',
    },
    latestQuarterly: null,
    latestAnnual: null,
    ratios,
    valuation,
    score,
    recommendation,
    risks,
    strengths,
  };
}

/**
 * مقایسه چند نماد از نظر بنیادی
 */
export function compareFundamentals(
  results: FundamentalAnalysisResult[]
): {
  rankedByScore: FundamentalAnalysisResult[];
  rankedByValuation: FundamentalAnalysisResult[];
  rankedByROE: FundamentalAnalysisResult[];
  rankedByGrowth: FundamentalAnalysisResult[];
} {
  const rankedByScore = [...results].sort((a, b) => b.score.percentage - a.score.percentage);
  const rankedByValuation = [...results].sort((a, b) => b.valuation.discountToFairValue - a.valuation.discountToFairValue);
  const rankedByROE = [...results].sort((a, b) => b.ratios.profitability.roe - a.ratios.profitability.roe);
  const rankedByGrowth = [...results].sort((a, b) => b.ratios.growth.revenueGrowth1Y - a.ratios.growth.revenueGrowth1Y);

  return {
    rankedByScore,
    rankedByValuation,
    rankedByROE,
    rankedByGrowth,
  };
}

/**
 * فیلتر کردن سهام بر اساس معیارهای بنیادی
 */
export function screenStocks(
  results: FundamentalAnalysisResult[],
  criteria: {
    minScore?: number;
    maxPE?: number;
    maxPB?: number;
    minROE?: number;
    minRevenueGrowth?: number;
    maxDebtToEquity?: number;
    undervaluedOnly?: boolean;
  }
): FundamentalAnalysisResult[] {
  return results.filter(result => {
    if (criteria.minScore && result.score.percentage < criteria.minScore) return false;
    if (criteria.maxPE && result.ratios.valuation.peRatio > criteria.maxPE) return false;
    if (criteria.maxPB && result.ratios.valuation.pbRatio > criteria.maxPB) return false;
    if (criteria.minROE && result.ratios.profitability.roe < criteria.minROE) return false;
    if (criteria.minRevenueGrowth && result.ratios.growth.revenueGrowth1Y < criteria.minRevenueGrowth) return false;
    if (criteria.maxDebtToEquity && result.ratios.leverage.debtToEquity > criteria.maxDebtToEquity) return false;
    if (criteria.undervaluedOnly && result.valuation.valuationStatus !== 'UNDERVALUED') return false;
    return true;
  });
}
