/**
 * محاسبه‌گر ریسک و حجم معامله
 * Position Sizing, Kelly Criterion, Risk/Reward, Max Drawdown
 */

export interface PositionSizeInput {
  accountBalance: number;      // موجودی حساب (ریال)
  riskPerTrade: number;        // درصد ریسک هر معامله (مثلاً 2 = ۲٪)
  entryPrice: number;          // قیمت ورود
  stopLoss: number;            // حد ضرر
  takeProfit?: number;         // حد سود (اختیاری)
  winRate?: number;            // نرخ برد تاریخی (درصد)
  avgWin?: number;             // میانگین سود (درصد)
  avgLoss?: number;            // میانگین ضرر (درصد)
}

export interface PositionSizeResult {
  riskAmount: number;          // مبلغ ریسک (ریال)
  stopDistance: number;        // فاصله تا حد ضرر (ریال)
  stopDistancePct: number;     // فاصله تا حد ضرر (درصد)
  positionSize: number;        // حجم پیشنهادی (تعداد سهم)
  positionValue: number;       // ارزش پوزیشن (ریال)
  potentialLoss: number;       // ضرر احتمالی (ریال)
  potentialProfit?: number;    // سود احتمالی (ریال)
  riskRewardRatio?: number;    // نسبت ریسک/ریوارد
  kellyFraction?: number;      // کسری کلی
  kellyPositionSize?: number;  // حجم بر اساس کلی
  maxPositionPercent?: number; // حداکثر درصد مجاز از حساب
  warnings: string[];
}

export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const warnings: string[] = [];
  const { accountBalance, riskPerTrade, entryPrice, stopLoss } = input;

  // محاسبه فاصله حد ضرر
  const stopDistance = Math.abs(entryPrice - stopLoss);
  const stopDistancePct = (stopDistance / entryPrice) * 100;

  // مبلغ ریسک
  const riskAmount = accountBalance * (riskPerTrade / 100);

  // حجم پوزیشن
  let positionSize = Math.floor(riskAmount / stopDistance);
  const positionValue = positionSize * entryPrice;
  const potentialLoss = positionSize * stopDistance;

  // هشدارها
  if (stopDistancePct > 10) {
    warnings.push("⚠️ حد ضرر بیش از ۱۰٪ فاصله دارد — ریسک بالا");
  }
  if (riskPerTrade > 5) {
    warnings.push("🔴 ریسک هر معامله بیش از ۵٪ حساب است");
  }
  if (positionValue > accountBalance * 0.3) {
    warnings.push("⚠️ حجم پوزیشن بیش از ۳۰٪ حساب است");
  }
  if (positionSize <= 0) {
    warnings.push("❌ حجم پوزیشن صفر — ریسک بیش از حد مجاز");
    positionSize = 0;
  }

  // نسبت ریسک/ریوارد
  let riskRewardRatio: number | undefined;
  let potentialProfit: number | undefined;
  if (input.takeProfit) {
    const profitDistance = Math.abs(input.takeProfit - entryPrice);
    potentialProfit = positionSize * profitDistance;
    riskRewardRatio = Math.round((profitDistance / stopDistance) * 100) / 100;

    if (riskRewardRatio < 1) {
      warnings.push("⚠️ نسبت ریسک/ریوارد کمتر از ۱ است");
    }
  }

  // Kelly Criterion
  let kellyFraction: number | undefined;
  let kellyPositionSize: number | undefined;
  if (input.winRate && input.avgWin && input.avgLoss && input.avgLoss > 0) {
    const W = input.winRate / 100;
    const R = input.avgWin / input.avgLoss;
    kellyFraction = Math.round((W - (1 - W) / R) * 10000) / 100;
    kellyPositionSize = Math.floor((kellyFraction / 100) * accountBalance / entryPrice);

    if (kellyFraction < 0) {
      warnings.push("🔴 Kelly Criterion منفی — این استراتژی سودآور نیست!");
      kellyPositionSize = 0;
    } else if (kellyFraction > 20) {
      warnings.push("⚠️ Kelly بیش از ۲۰٪ — حجم را نصف کنید");
    }
  }

  const maxPositionPercent = Math.round((positionValue / accountBalance) * 100);

  return {
    riskAmount,
    stopDistance,
    stopDistancePct: Math.round(stopDistancePct * 100) / 100,
    positionSize,
    positionValue,
    potentialLoss,
    potentialProfit,
    riskRewardRatio,
    kellyFraction,
    kellyPositionSize,
    maxPositionPercent,
    warnings,
  };
}

/** محاسبه حداکثر ضرر روزانه/هفتگی/ماهانه */
export function calculateMaxDrawdown(
  accountBalance: number,
  riskPerTrade: number,
  tradesPerDay: number = 3,
): {
  maxDailyLoss: number;
  maxWeeklyLoss: number;
  maxMonthlyLoss: number;
  dailyLossPct: number;
} {
  const dailyLoss = accountBalance * (riskPerTrade / 100) * tradesPerDay;
  return {
    maxDailyLoss: Math.round(dailyLoss),
    maxWeeklyLoss: Math.round(dailyLoss * 5),
    maxMonthlyLoss: Math.round(dailyLoss * 22),
    dailyLossPct: Math.round((dailyLoss / accountBalance) * 10000) / 100,
  };
}
