/**
 * انواع داده‌های مالی برای موتور تحلیل بنیادی
 * بدون هیچ داده‌ی هاردکد یا موکی - فقط تعریف تایپ‌ها
 */

export interface FinancialStatement {
  symbol: string;
  date: string;
  revenue: number;
  netIncome: number;
  totalAssets: number;
  totalLiabilities: number;
  shareholdersEquity: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  currentAssets: number;
  currentLiabilities: number;
  longTermDebt: number;
  shortTermDebt: number;
  inventory: number;
  accountsReceivable: number;
  accountsPayable: number;
  costOfGoodsSold: number;
  operatingExpenses: number;
  interestExpense: number;
  taxExpense: number;
  depreciation: number;
  amortization: number;
  capex: number;
  workingCapital: number;
  retainedEarnings: number;
  commonSharesOutstanding: number;
}

export interface QuarterlyData extends FinancialStatement {
  quarter: number;
  year: number;
  eps: number;
  peRatio: number;
  pbRatio: number;
  roe: number;
  roa: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  assetTurnover: number;
  inventoryTurnover: number;
  receivablesTurnover: number;
  dividendPerShare: number;
  dividendYield: number;
  payoutRatio: number;
  bookValuePerShare: number;
  tangibleBookValue: number;
  enterpriseValue: number;
  evToEbitda: number;
  evToRevenue: number;
  priceToSales: number;
  priceToFreeCashFlow: number;
}

export interface AnnualData extends FinancialStatement {
  year: number;
  eps: number;
  peRatio: number;
  pbRatio: number;
  roe: number;
  roa: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  assetTurnover: number;
  inventoryTurnover: number;
  receivablesTurnover: number;
  dividendPerShare: number;
  dividendYield: number;
  payoutRatio: number;
  bookValuePerShare: number;
  tangibleBookValue: number;
  enterpriseValue: number;
  evToEbitda: number;
  evToRevenue: number;
  priceToSales: number;
  priceToFreeCashFlow: number;
  revenueGrowth: number;
  netIncomeGrowth: number;
  epsGrowth: number;
  equityGrowth: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  sharesOutstanding: number;
  currentPrice: number;
  dayHigh: number;
  dayLow: number;
  week52High: number;
  week52Low: number;
  avgVolume: number;
  beta: number;
  description: string;
  website: string;
  ceo: string;
  employees: number;
  foundedYear: number;
  headquarters: string;
}

export interface FundamentalAnalysisResult {
  symbol: string;
  analysisDate: string;
  companyProfile: CompanyProfile;
  latestQuarterly: QuarterlyData | null;
  latestAnnual: AnnualData | null;
  ratios: FinancialRatios;
  valuation: ValuationResult;
  score: FundamentalScore;
  recommendation: 'BUY_STRONG' | 'BUY' | 'HOLD' | 'SELL' | 'SELL_STRONG';
  risks: string[];
  strengths: string[];
  trends: TrendAnalysis;
}

export interface FinancialRatios {
  profitability: {
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    roe: number;
    roa: number;
    roc: number;
    roi: number;
  };
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    workingCapital: number;
  };
  leverage: {
    debtToEquity: number;
    debtToAssets: number;
    interestCoverage: number;
    debtServiceCoverage: number;
  };
  efficiency: {
    assetTurnover: number;
    inventoryTurnover: number;
    receivablesTurnover: number;
    payablesTurnover: number;
    cashConversionCycle: number;
  };
  valuation: {
    peRatio: number;
    pbRatio: number;
    psRatio: number;
    pcfRatio: number;
    evToEbitda: number;
    evToRevenue: number;
    pegRatio: number;
  };
  growth: {
    revenueGrowth1Y: number;
    revenueGrowth3Y: number;
    revenueGrowth5Y: number;
    epsGrowth1Y: number;
    epsGrowth3Y: number;
    epsGrowth5Y: number;
    dividendGrowth1Y: number;
    dividendGrowth3Y: number;
  };
}

export interface ValuationResult {
  fairValueDCF: number | null;
  fairValuePE: number | null;
  fairValuePB: number | null;
  fairValueAverage: number | null;
  currentPrice: number;
  upside: number;
  discountToFairValue: number;
  valuationStatus: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED';
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface FundamentalScore {
  totalScore: number;
  maxScore: number;
  percentage: number;
  breakdown: {
    profitability: number;
    financialHealth: number;
    growth: number;
    valuation: number;
    efficiency: number;
  };
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';
}

export interface TrendAnalysis {
  revenueTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  profitTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  marginTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  debtTrend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  overallTrend: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export interface CodalRawData {
  symbol: string;
  reportType: string;
  filingDate: string;
  periodEndDate: string;
  rawData: Record<string, any>;
  sourceUrl: string;
}
