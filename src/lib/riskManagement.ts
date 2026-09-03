/**
 * مدیریت ریسک خودکار — محاسبه حجم معامله، حد ضرر، حد سود
 * بر اساس اصول مدیریت سرمایه حرفه‌ای
 */

export interface RiskManagementResult {
  /** حجم پیشنهادی معامله (تعداد سهم) */
  suggestedQuantity: number;
  /** مبلغ پیشنهادی معامله (ریال) */
  suggestedAmount: number;
  /** درصد ریسک هر معامله */
  riskPercent: number;
  /** حد ضرر پیشنهادی */
  stopLoss: number;
  /** حد سود پیشنهادی */
  takeProfit: number;
  /** نسبت ریسک به ریوارد */
  riskRewardRatio: number;
  /** فاصله حد ضرر تا قیمت فعلی (درصد) */
  stopLossDistance: number;
  /** فاصله حد سود تا قیمت فعلی (درصد) */
  takeProfitDistance: number;
  /** سطح ریسک */
  riskLevel: "کم" | "متوسط" | "زیاد" | "بسیار زیاد";
  /** توضیح */
  description: string;
}

/**
 * محاسبه مدیریت ریسک خودکار
 * @param entryPrice - قیمت ورود (قیمت فعلی یا سیگنال)
 * @param atr - ATR واقعی (Average True Range)
 * @param support - سطح حمایت
 * @param resistance - سطح مقاومت
 * @param totalCapital - کل سرمایه (ریال)
 * @param maxRiskPerTrade - حداکثر ریسک هر معامله (درصد، پیش‌فرض 2%)
 * @param signal - نوع سیگنال (buy/sell)
 */
export function calculateRiskManagement(
  entryPrice: number,
  atr: number | null,
  support: number | null,
  resistance: number | null,
  totalCapital: number,
  maxRiskPerTrade: number = 2,
  signal: "buy" | "sell" = "buy",
): RiskManagementResult {
  if (entryPrice <= 0) {
    return {
      suggestedQuantity: 0,
      suggestedAmount: 0,
      riskPercent: 0,
      stopLoss: 0,
      takeProfit: 0,
      riskRewardRatio: 0,
      stopLossDistance: 0,
      takeProfitDistance: 0,
      riskLevel: "بسیار زیاد",
      description: "قیمت نامعتبر",
    };
  }

  // ─── 1. محاسبه حد ضرر ───
  let stopLoss = 0;
  if (atr && atr > 0) {
    // ATR-based stop loss (2x ATR)
    stopLoss = signal === "buy"
      ? entryPrice - atr * 2
      : entryPrice + atr * 2;
  } else if (support && support > 0) {
    // Support-based stop loss
    stopLoss = signal === "buy"
      ? support * 0.99 // 1% below support
      : support * 1.01;
  } else {
    // Default: 5% stop loss
    stopLoss = signal === "buy"
      ? entryPrice * 0.95
      : entryPrice * 1.05;
  }

  // ─── 2. محاسبه حد سود ───
  let takeProfit = 0;
  if (resistance && resistance > 0) {
    takeProfit = signal === "buy"
      ? resistance * 0.99 // 1% below resistance
      : resistance * 1.01;
  } else if (atr && atr > 0) {
    // ATR-based take profit (3x ATR)
    takeProfit = signal === "buy"
      ? entryPrice + atr * 3
      : entryPrice - atr * 3;
  } else {
    // Default: 10% take profit
    takeProfit = signal === "buy"
      ? entryPrice * 1.10
      : entryPrice * 0.90;
  }

  // ─── 3. محاسبه فاصله‌ها ───
  const stopLossDistance = Math.abs((entryPrice - stopLoss) / entryPrice) * 100;
  const takeProfitDistance = Math.abs((takeProfit - entryPrice) / entryPrice) * 100;
  const riskRewardRatio = stopLossDistance > 0
    ? Math.round((takeProfitDistance / stopLossDistance) * 100) / 100
    : 0;

  // ─── 4. محاسبه حجم معامله ───
  const maxLossAmount = totalCapital * (maxRiskPerTrade / 100);
  const lossPerShare = Math.abs(entryPrice - stopLoss);
  const suggestedQuantity = lossPerShare > 0
    ? Math.floor(maxLossAmount / lossPerShare)
    : 0;

  // Round to lot size (TSETMC: lots of 1)
  const roundedQuantity = Math.max(0, suggestedQuantity);
  const suggestedAmount = roundedQuantity * entryPrice;

  // ─── 5. سطح ریسک ───
  let riskLevel: RiskManagementResult["riskLevel"];
  if (stopLossDistance < 3) riskLevel = "کم";
  else if (stopLossDistance < 5) riskLevel = "متوسط";
  else if (stopLossDistance < 8) riskLevel = "زیاد";
  else riskLevel = "بسیار زیاد";

  // ─── 6. توضیح ───
  const description = [
    `📊 حجم پیشنهادی: ${roundedQuantity.toLocaleString("fa-IR")} سهم`,
    `💰 مبلغ: ${suggestedAmount.toLocaleString("fa-IR")} ریال`,
    `🛑 حد ضرر: ${Math.round(stopLossDistance)}٪ (${lossPerShare.toLocaleString("fa-IR")} ریال/سهم)`,
    `🎯 حد سود: ${Math.round(takeProfitDistance)}٪`,
    `⚖️ R:R = ۱:${riskRewardRatio}`,
    `⚠️ ریسک: ${maxRiskPerTrade}٪ سرمایه (${maxLossAmount.toLocaleString("fa-IR")} ریال)`,
  ].join(" | ");

  return {
    suggestedQuantity: roundedQuantity,
    suggestedAmount,
    riskPercent: maxRiskPerTrade,
    stopLoss: Math.round(stopLoss),
    takeProfit: Math.round(takeProfit),
    riskRewardRatio,
    stopLossDistance: Math.round(stopLossDistance * 100) / 100,
    takeProfitDistance: Math.round(takeProfitDistance * 100) / 100,
    riskLevel,
    description,
  };
}

/**
 * محاسبه حداکثر حجم معامله بر اساس قوانین مدیریت سرمایه
 */
export function maxPositionSize(
  entryPrice: number,
  stopLoss: number,
  capital: number,
  riskPercent: number = 2,
): number {
  const riskAmount = capital * (riskPercent / 100);
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  return riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
}

/**
 * محاسبه ارزش پرتفوی و سود/زیان
 */
export function calculatePortfolioPnL(
  positions: Array<{ symbol: string; quantity: number; avgPrice: number; currentPrice: number }>,
): { totalValue: number; totalPnL: number; totalPnLPercent: number; positions: Array<{ symbol: string; pnl: number; pnlPercent: number; value: number }> } {
  let totalValue = 0;
  let totalCost = 0;

  const detailed = positions.map((pos) => {
    const value = pos.quantity * pos.currentPrice;
    const cost = pos.quantity * pos.avgPrice;
    const pnl = value - cost;
    const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
    totalValue += value;
    totalCost += cost;
    return { symbol: pos.symbol, pnl, pnlPercent, value };
  });

  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return {
    totalValue,
    totalPnL,
    totalPnLPercent,
    positions: detailed,
  };
}
