/**
 * مدل‌های ارزش‌گذاری سهام
 * بدون هیچ داده‌ی هاردکد - فقط فرمول‌های ارزش‌گذاری
 */

import { FinancialStatement, ValuationResult } from './types.js';

/**
 * ارزش‌گذاری بر اساس جریان نقد تنزیل شده (DCF)
 * روش ساده‌شده برای محاسبه سریع
 */
export function calculateDCFValuation(
  freeCashFlow: number,
  growthRate: number,
  discountRate: number,
  terminalGrowthRate: number,
  sharesOutstanding: number,
  projectionYears: number = 5
): number | null {
  if (freeCashFlow <= 0 || sharesOutstanding <= 0 || discountRate <= terminalGrowthRate) {
    return null;
  }

  let presentValue = 0;
  let futureCashFlow = freeCashFlow;

  // محاسبه ارزش فعلی جریان‌های نقد آتی
  for (let year = 1; year <= projectionYears; year++) {
    futureCashFlow *= (1 + growthRate);
    const pv = futureCashFlow / Math.pow(1 + discountRate, year);
    presentValue += pv;
  }

  // محاسبه ارزش پایانی (Terminal Value)
  const terminalValue = (futureCashFlow * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
  const pvTerminal = terminalValue / Math.pow(1 + discountRate, projectionYears);

  // ارزش کل شرکت
  const enterpriseValue = presentValue + pvTerminal;

  // ارزش هر سهم
  return enterpriseValue / sharesOutstanding;
}

/**
 * ارزش‌گذاری بر اساس P/E نسبی
 */
export function calculatePEValuation(
  eps: number,
  industryPE: number,
  marketPE: number,
  companyGrowthRate: number,
  industryGrowthRate: number
): number | null {
  if (eps <= 0 || industryPE <= 0) {
    return null;
  }

  // تنظیم P/E بر اساس رشد
  const pegRatio = industryPE / industryGrowthRate;
  const fairPE = pegRatio * companyGrowthRate;

  // استفاده از میانگین P/E صنعت و P/E تعدیل‌شده
  const adjustedPE = (industryPE + fairPE) / 2;

  return eps * adjustedPE;
}

/**
 * ارزش‌گذاری بر اساس P/B نسبی
 */
export function calculatePBValuation(
  bookValuePerShare: number,
  industryPB: number,
  roe: number,
  requiredROE: number
): number | null {
  if (bookValuePerShare <= 0 || industryPB <= 0) {
    return null;
  }

  // تنظیم P/B بر اساس بازده حقوق صاحبان سهام
  const roeAdjustment = roe / requiredROE;
  const fairPB = industryPB * roeAdjustment;

  return bookValuePerShare * fairPB;
}

/**
 * ارزش‌گذاری بر اساس NAV (برای صندوق‌ها و شرکت‌های سرمایه‌گذاری)
 */
export function calculateNAVValuation(
  totalAssets: number,
  totalLiabilities: number,
  sharesOutstanding: number,
  discountToNav: number = 0.1
): number | null {
  if (sharesOutstanding <= 0) {
    return null;
  }

  const nav = (totalAssets - totalLiabilities) / sharesOutstanding;
  
  // اعمال تخفیف معمول به NAV
  return nav * (1 - discountToNav);
}

/**
 * ارزش‌گذاری بر اساس جریان نقد آزاد به ازای هر سهم
 */
export function calculateFCFValuation(
  freeCashFlowPerShare: number,
  industryFCFYield: number,
  riskFreeRate: number,
  equityRiskPremium: number
): number | null {
  if (freeCashFlowPerShare <= 0 || industryFCFYield <= 0) {
    return null;
  }

  const requiredReturn = riskFreeRate + equityRiskPremium;
  const fairFCFYield = (industryFCFYield + requiredReturn) / 2;

  return freeCashFlowPerShare / fairFCFYield;
}

/**
 * محاسبه ارزش ذاتی ترکیبی
 * میانگین وزنی روش‌های مختلف ارزش‌گذاری
 */
export function calculateIntrinsicValue(
  dcfValue: number | null,
  peValue: number | null,
  pbValue: number | null,
  navValue: number | null,
  weights: {
    dcf: number;
    pe: number;
    pb: number;
    nav: number;
  } = { dcf: 0.4, pe: 0.3, pb: 0.2, nav: 0.1 }
): number | null {
  const values: number[] = [];
  const appliedWeights: number[] = [];

  if (dcfValue !== null && !isNaN(dcfValue)) {
    values.push(dcfValue);
    appliedWeights.push(weights.dcf);
  }

  if (peValue !== null && !isNaN(peValue)) {
    values.push(peValue);
    appliedWeights.push(weights.pe);
  }

  if (pbValue !== null && !isNaN(pbValue)) {
    values.push(pbValue);
    appliedWeights.push(weights.pb);
  }

  if (navValue !== null && !isNaN(navValue)) {
    values.push(navValue);
    appliedWeights.push(weights.nav);
  }

  if (values.length === 0) {
    return null;
  }

  // نرمال‌سازی وزن‌ها
  const totalWeight = appliedWeights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = appliedWeights.map(w => w / totalWeight);

  // محاسبه میانگین وزنی
  let intrinsicValue = 0;
  for (let i = 0; i < values.length; i++) {
    intrinsicValue += values[i] * normalizedWeights[i];
  }

  return intrinsicValue;
}

/**
 * تعیین وضعیت ارزش‌گذاری
 */
export function determineValuationStatus(
  currentPrice: number,
  fairValue: number,
  marginOfSafety: number = 0.2
): {
  status: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED';
  discount: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
} {
  if (fairValue <= 0 || currentPrice <= 0) {
    return {
      status: 'FAIRLY_VALUED',
      discount: 0,
      confidence: 'LOW',
    };
  }

  const discount = (fairValue - currentPrice) / fairValue;

  if (discount > marginOfSafety) {
    return {
      status: 'UNDERVALUED',
      discount,
      confidence: discount > 0.4 ? 'HIGH' : 'MEDIUM',
    };
  } else if (discount < -marginOfSafety) {
    return {
      status: 'OVERVALUED',
      discount,
      confidence: discount < -0.4 ? 'HIGH' : 'MEDIUM',
    };
  } else {
    return {
      status: 'FAIRLY_VALUED',
      discount,
      confidence: 'MEDIUM',
    };
  }
}

/**
 * ایجاد نتیجه نهایی ارزش‌گذاری
 */
export function createValuationResult(
  currentPrice: number,
  dcfValue: number | null,
  peValue: number | null,
  pbValue: number | null,
  navValue: number | null,
  weights?: { dcf: number; pe: number; pb: number; nav: number }
): ValuationResult {
  const fairValueAverage = calculateIntrinsicValue(dcfValue, peValue, pbValue, navValue, weights);
  
  const valuationStatus = fairValueAverage 
    ? determineValuationStatus(currentPrice, fairValueAverage)
    : { status: 'FAIRLY_VALUED' as const, discount: 0, confidence: 'LOW' as const };

  return {
    fairValueDCF: dcfValue,
    fairValuePE: peValue,
    fairValuePB: pbValue,
    fairValueAverage: fairValueAverage,
    currentPrice,
    upside: fairValueAverage ? (fairValueAverage - currentPrice) / currentPrice : 0,
    discountToFairValue: valuationStatus.discount,
    valuationStatus: valuationStatus.status,
    confidenceLevel: valuationStatus.confidence,
  };
}
