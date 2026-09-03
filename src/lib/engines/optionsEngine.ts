/**
 * Options Pricing Engine - موتور قیمت‌گذاری اختیار معامله
 * Implements Black-Scholes model, Greeks calculation, and Max Pain theory
 */

export interface OptionGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  intrinsicValue: number;
  timeValue: number;
  theoreticalPrice: number;
}

export interface OptionContract {
  symbol: string;
  underlyingSymbol: string;
  strike: number;
  expiry: Date;
  optionType: 'call' | 'put';
  marketPrice: number;
  underlyingPrice: number;
  volume: number;
  openInterest: number;
}

export interface MaxPainResult {
  maxPainPrice: number;
  totalCallValue: number;
  totalPutValue: number;
  painByStrike: Array<{
    strike: number;
    callPain: number;
    putPain: number;
    totalPain: number;
  }>;
}

export interface ImpliedVolatilityResult {
  iv: number;
  iterations: number;
  converged: boolean;
}

/**
 * Standard Normal Cumulative Distribution Function
 */
function normCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1 + sign * y);
}

/**
 * Standard Normal Probability Density Function
 */
function normPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Black-Scholes Option Pricing Model
 * @param S - Spot price of underlying
 * @param K - Strike price
 * @param T - Time to expiration (in years)
 * @param r - Risk-free interest rate (annualized)
 * @param sigma - Volatility (annualized)
 * @param optionType - 'call' or 'put'
 */
export function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  optionType: 'call' | 'put'
): number {
  if (T <= 0) {
    // At expiration
    if (optionType === 'call') {
      return Math.max(0, S - K);
    } else {
      return Math.max(0, K - S);
    }
  }

  if (sigma <= 0) {
    // No volatility - deterministic
    const forward = S * Math.exp(r * T);
    if (optionType === 'call') {
      return Math.max(0, forward - K) * Math.exp(-r * T);
    } else {
      return Math.max(0, K - forward) * Math.exp(-r * T);
    }
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  if (optionType === 'call') {
    return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
  }
}

/**
 * Calculate Option Greeks using Black-Scholes model
 */
export function calculateGreeks(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  optionType: 'call' | 'put'
): OptionGreeks {
  if (T <= 0 || sigma <= 0) {
    const intrinsic = optionType === 'call' 
      ? Math.max(0, S - K) 
      : Math.max(0, K - S);
    
    return {
      delta: optionType === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      intrinsicValue: intrinsic,
      timeValue: 0,
      theoreticalPrice: intrinsic,
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const Nd1 = normCDF(d1);
  const Nd2 = normCDF(d2);
  const nD1 = normPDF(d1);
  const expRT = Math.exp(-r * T);

  // Delta
  const delta = optionType === 'call' 
    ? Nd1 
    : Nd1 - 1;

  // Gamma (same for call and put)
  const gamma = nD1 / (S * sigma * sqrtT);

  // Theta (per day)
  let theta: number;
  if (optionType === 'call') {
    theta = (-(S * nD1 * sigma) / (2 * sqrtT) - r * K * expRT * Nd2) / 365;
  } else {
    theta = (-(S * nD1 * sigma) / (2 * sqrtT) + r * K * expRT * normCDF(-d2)) / 365;
  }

  // Vega (per 1% change in volatility)
  const vega = (S * nD1 * sqrtT) / 100;

  // Rho (per 1% change in interest rate)
  const rho = optionType === 'call'
    ? (K * T * expRT * Nd2) / 100
    : (-K * T * expRT * normCDF(-d2)) / 100;

  // Theoretical price
  const theoreticalPrice = blackScholes(S, K, T, r, sigma, optionType);

  // Intrinsic and Time Value
  const intrinsicValue = optionType === 'call'
    ? Math.max(0, S - K)
    : Math.max(0, K - S);
  
  const timeValue = Math.max(0, theoreticalPrice - intrinsicValue);

  return {
    delta: Math.round(delta * 10000) / 10000,
    gamma: Math.round(gamma * 10000) / 10000,
    theta: Math.round(theta * 10000) / 10000,
    vega: Math.round(vega * 10000) / 10000,
    rho: Math.round(rho * 10000) / 10000,
    intrinsicValue: Math.round(intrinsicValue * 100) / 100,
    timeValue: Math.round(timeValue * 100) / 100,
    theoreticalPrice: Math.round(theoreticalPrice * 100) / 100,
  };
}

/**
 * Calculate Implied Volatility using Newton-Raphson method
 */
export function calculateImpliedVolatility(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r: number,
  optionType: 'call' | 'put',
  maxIterations: number = 100,
  tolerance: number = 0.0001
): ImpliedVolatilityResult {
  // Initial guess
  let sigma = 0.5;
  
  for (let i = 0; i < maxIterations; i++) {
    const price = blackScholes(S, K, T, r, sigma, optionType);
    const diff = price - marketPrice;
    
    if (Math.abs(diff) < tolerance) {
      return {
        iv: Math.round(sigma * 10000) / 10000,
        iterations: i + 1,
        converged: true,
      };
    }

    // Vega for Newton-Raphson
    const sqrtT = Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
    const vega = (S * normPDF(d1) * sqrtT) / 100;

    if (vega < 0.0001) {
      // Vega too small, adjust sigma manually
      sigma = diff > 0 ? sigma * 0.9 : sigma * 1.1;
      continue;
    }

    sigma = sigma - diff / (vega * 100);
    
    // Bound sigma to reasonable values
    if (sigma <= 0.001) sigma = 0.001;
    if (sigma > 5.0) sigma = 5.0;
  }

  return {
    iv: Math.round(sigma * 10000) / 10000,
    iterations: maxIterations,
    converged: false,
  };
}

/**
 * Calculate Max Pain - the strike price where option buyers experience maximum loss
 * This is based on the theory that market makers will push the price to this level at expiration
 */
export function calculateMaxPain(
  contracts: OptionContract[],
  underlyingPrice: number
): MaxPainResult {
  if (contracts.length === 0) {
    return {
      maxPainPrice: underlyingPrice,
      totalCallValue: 0,
      totalPutValue: 0,
      painByStrike: [],
    };
  }

  // Group by strike price
  const strikesMap = new Map<number, { calls: OptionContract[]; puts: OptionContract[] }>();
  
  contracts.forEach(contract => {
    if (!strikesMap.has(contract.strike)) {
      strikesMap.set(contract.strike, { calls: [], puts: [] });
    }
    const group = strikesMap.get(contract.strike)!;
    if (contract.optionType === 'call') {
      group.calls.push(contract);
    } else {
      group.puts.push(contract);
    }
  });

  const strikes = Array.from(strikesMap.keys()).sort((a, b) => a - b);
  const painByStrike: Array<{
    strike: number;
    callPain: number;
    putPain: number;
    totalPain: number;
  }> = [];

  // Calculate pain at each strike
  strikes.forEach(strike => {
    const group = strikesMap.get(strike)!;
    
    // Call pain: value of all call options if underlying expires at this strike
    let callPain = 0;
    group.calls.forEach(contract => {
      const intrinsicValue = Math.max(0, strike - contract.strike);
      const buyerLoss = Math.max(0, contract.marketPrice - intrinsicValue);
      callPain += buyerLoss * contract.openInterest;
    });

    // Put pain: value of all put options if underlying expires at this strike
    let putPain = 0;
    group.puts.forEach(contract => {
      const intrinsicValue = Math.max(0, contract.strike - strike);
      const buyerLoss = Math.max(0, contract.marketPrice - intrinsicValue);
      putPain += buyerLoss * contract.openInterest;
    });

    painByStrike.push({
      strike,
      callPain: Math.round(callPain),
      putPain: Math.round(putPain),
      totalPain: Math.round(callPain + putPain),
    });
  });

  // Find strike with maximum pain
  const maxPainStrike = painByStrike.reduce((max, current) => 
    current.totalPain > max.totalPain ? current : max
  , painByStrike[0]);

  const totalCallValue = painByStrike.reduce((sum, p) => sum + p.callPain, 0);
  const totalPutValue = painByStrike.reduce((sum, p) => sum + p.putPain, 0);

  return {
    maxPainPrice: maxPainStrike.strike,
    totalCallValue: Math.round(totalCallValue),
    totalPutValue: Math.round(totalPutValue),
    painByStrike,
  };
}

/**
 * Analyze a single option contract
 */
export function analyzeOption(
  contract: OptionContract,
  riskFreeRate: number = 0.25 // 25% for Iran market
): {
  greeks: OptionGreeks;
  impliedVolatility: ImpliedVolatilityResult;
  fairValue: number;
  recommendation: string;
} {
  const T = (contract.expiry.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000);
  const timeInYears = Math.max(1 / 365, T);

  // Calculate Greeks
  const sigma = 0.6; // Default volatility estimate
  const greeks = calculateGreeks(
    contract.underlyingPrice,
    contract.strike,
    timeInYears,
    riskFreeRate,
    sigma,
    contract.optionType
  );

  // Calculate Implied Volatility
  const iv = calculateImpliedVolatility(
    contract.marketPrice,
    contract.underlyingPrice,
    contract.strike,
    timeInYears,
    riskFreeRate,
    contract.optionType
  );

  // Recalculate Greeks with actual IV
  const accurateGreeks = iv.converged
    ? calculateGreeks(
        contract.underlyingPrice,
        contract.strike,
        timeInYears,
        riskFreeRate,
        iv.iv,
        contract.optionType
      )
    : greeks;

  // Generate recommendation
  let recommendation = '';
  const moneyness = contract.optionType === 'call'
    ? (contract.underlyingPrice - contract.strike) / contract.strike
    : (contract.strike - contract.underlyingPrice) / contract.strike;

  if (accurateGreeks.delta > 0.7) {
    recommendation = contract.optionType === 'call'
      ? 'عمیق در سود (ITM) - حساسیت بالا به حرکت زیربنایی'
      : 'عمیق در سود (ITM) - احتمال اعمال بالا';
  } else if (accurateGreeks.delta < 0.3) {
    recommendation = contract.optionType === 'call'
      ? 'خارج از سود (OTM) - ریسک بی‌ارزش شدن'
      : 'خارج از سود (OTM) - نیاز به حرکت قوی';
  } else {
    recommendation = 'در نزدیکی سود (ATM) - بیشترین حساسیت زمانی';
  }

  // Theta decay warning
  if (accurateGreeks.theta < -0.5) {
    recommendation += ' ⚠️ افت زمانی شدید';
  }

  // IV assessment
  if (iv.converged && iv.iv > 1.0) {
    recommendation += ' 📈 نوسان‌پذیری ضمنی بسیار بالا';
  } else if (iv.converged && iv.iv < 0.3) {
    recommendation += ' 📉 نوسان‌پذیری ضمنی پایین';
  }

  return {
    greeks: accurateGreeks,
    impliedVolatility: iv,
    fairValue: greeks.theoreticalPrice,
    recommendation,
  };
}

/**
 * Options Strategy Builder - Common strategies
 */
export interface OptionStrategy {
  name: string;
  description: string;
  legs: Array<{
    optionType: 'call' | 'put';
    strike: number;
    quantity: number;
    action: 'buy' | 'sell';
  }>;
  maxProfit: number;
  maxLoss: number;
  breakEvenPoints: number[];
  bullish: boolean;
}

/**
 * Create a Straddle strategy (buy call + buy put at same strike)
 */
export function createStraddle(
  strike: number,
  callPremium: number,
  putPremium: number
): OptionStrategy {
  const totalPremium = callPremium + putPremium;
  
  return {
    name: 'استرادل (Straddle)',
    description: 'سود از نوسان بزرگ در هر جهت - مناسب برای اخبار مهم',
    legs: [
      { optionType: 'call', strike, quantity: 1, action: 'buy' },
      { optionType: 'put', strike, quantity: 1, action: 'buy' },
    ],
    maxProfit: Infinity,
    maxLoss: totalPremium,
    breakEvenPoints: [strike - totalPremium, strike + totalPremium],
    bullish: false, // Neutral strategy
  };
}

/**
 * Create a Strangle strategy (buy OTM call + buy OTM put)
 */
export function createStrangle(
  callStrike: number,
  putStrike: number,
  callPremium: number,
  putPremium: number
): OptionStrategy {
  const totalPremium = callPremium + putPremium;
  
  return {
    name: 'استرانگل (Strangle)',
    description: 'سود از نوسان بسیار بزرگ - ارزان‌تر از استرادل',
    legs: [
      { optionType: 'call', strike: callStrike, quantity: 1, action: 'buy' },
      { optionType: 'put', strike: putStrike, quantity: 1, action: 'buy' },
    ],
    maxProfit: Infinity,
    maxLoss: totalPremium,
    breakEvenPoints: [putStrike - totalPremium, callStrike + totalPremium],
    bullish: false,
  };
}

/**
 * Create a Bull Call Spread
 */
export function createBullCallSpread(
  lowerStrike: number,
  higherStrike: number,
  lowerPremium: number,
  higherPremium: number
): OptionStrategy {
  const netDebit = lowerPremium - higherPremium;
  
  return {
    name: 'اسپرد صعودی (Bull Call Spread)',
    description: 'سود محدود از رشد متوسط - ریسک محدود',
    legs: [
      { optionType: 'call', strike: lowerStrike, quantity: 1, action: 'buy' },
      { optionType: 'call', strike: higherStrike, quantity: 1, action: 'sell' },
    ],
    maxProfit: (higherStrike - lowerStrike) - netDebit,
    maxLoss: netDebit,
    breakEvenPoints: [lowerStrike + netDebit],
    bullish: true,
  };
}

/**
 * Create a Protective Put (own stock + buy put)
 */
export function createProtectivePut(
  stockPrice: number,
  putStrike: number,
  putPremium: number
): OptionStrategy {
  return {
    name: 'پوت محافظتی (Protective Put)',
    description: 'حفاظت از سهام در برابر ریزش - بیمه پرتفوی',
    legs: [
      { optionType: 'put', strike: putStrike, quantity: 1, action: 'buy' },
    ],
    maxProfit: Infinity,
    maxLoss: (stockPrice - putStrike) + putPremium,
    breakEvenPoints: [stockPrice + putPremium],
    bullish: true,
  };
}

/**
 * Class-based Options Engine for easy integration
 */
export class OptionsEngine {
  private riskFreeRate: number;

  constructor(riskFreeRate: number = 0.25) {
    this.riskFreeRate = riskFreeRate;
  }

  price(contract: OptionContract): number {
    const T = (contract.expiry.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000);
    const timeInYears = Math.max(1 / 365, T);
    
    return blackScholes(
      contract.underlyingPrice,
      contract.strike,
      timeInYears,
      this.riskFreeRate,
      0.6, // Default sigma
      contract.optionType
    );
  }

  getGreeks(contract: OptionContract): OptionGreeks {
    const T = (contract.expiry.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000);
    const timeInYears = Math.max(1 / 365, T);
    
    return calculateGreeks(
      contract.underlyingPrice,
      contract.strike,
      timeInYears,
      this.riskFreeRate,
      0.6,
      contract.optionType
    );
  }

  getImpliedVolatility(contract: OptionContract): ImpliedVolatilityResult {
    const T = (contract.expiry.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000);
    const timeInYears = Math.max(1 / 365, T);
    
    return calculateImpliedVolatility(
      contract.marketPrice,
      contract.underlyingPrice,
      contract.strike,
      timeInYears,
      this.riskFreeRate,
      contract.optionType
    );
  }

  findMaxPain(contracts: OptionContract[], underlyingPrice: number): MaxPainResult {
    return calculateMaxPain(contracts, underlyingPrice);
  }

  analyze(contract: OptionContract) {
    return analyzeOption(contract, this.riskFreeRate);
  }

  createStrategy(type: string, params: any): OptionStrategy | null {
    switch (type) {
      case 'straddle':
        return createStraddle(params.strike, params.callPremium, params.putPremium);
      case 'strangle':
        return createStrangle(params.callStrike, params.putStrike, params.callPremium, params.putPremium);
      case 'bullCallSpread':
        return createBullCallSpread(params.lowerStrike, params.higherStrike, params.lowerPremium, params.higherPremium);
      case 'protectivePut':
        return createProtectivePut(params.stockPrice, params.putStrike, params.putPremium);
      default:
        return null;
    }
  }
}

// Singleton instance
export const optionsEngine = new OptionsEngine();
