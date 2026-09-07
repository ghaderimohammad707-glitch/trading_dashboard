/**
 * ماژول مدیریت سرمایه هوشمند
 * محاسبه اندازه پوزیشن بر اساس ریسک شخصی و نوسان بازار
 */

export interface PositionSizingInput {
  totalCapital: number;        // کل سرمایه به ریال
  riskPerTrade: number;        // درصد ریسک مجاز (مثلاً 0.02 برای 2٪)
  entryPrice: number;          // نقطه ورود
  stopLoss: number;            // حد ضرر
  positionType: 'long' | 'short'; // نوع پوزیشن
  leverage?: number;           // اهرم اختیاری
}

export interface PositionSizingOutput {
  shareCount: number;          // تعداد سهم دقیق
  positionValue: number;       // حجم دلاری/ریالی پوزیشن
  riskAmount: number;          // ریسک ریالی
  suggestedLeverage: number;   // اهرم پیشنهادی
  isValid: boolean;            // آیا محاسبات معتبر است
  errorMessage?: string;       // پیام خطا در صورت نامعتبر بودن
}

/**
 * محاسبه اندازه پوزیشن بر اساس فرمول:
 * Position Size = (Capital × Risk%) / (Entry - StopLoss)
 */
export function calculatePositionSize(input: PositionSizingInput): PositionSizingOutput {
  const {
    totalCapital,
    riskPerTrade,
    entryPrice,
    stopLoss,
    positionType,
    leverage = 1
  } = input;

  // بررسی اعتبار ورودی‌ها
  if (totalCapital <= 0) {
    return {
      shareCount: 0,
      positionValue: 0,
      riskAmount: 0,
      suggestedLeverage: 1,
      isValid: false,
      errorMessage: 'سرمایه کل باید مثبت باشد'
    };
  }

  if (riskPerTrade <= 0 || riskPerTrade > 1) {
    return {
      shareCount: 0,
      positionValue: 0,
      riskAmount: 0,
      suggestedLeverage: 1,
      isValid: false,
      errorMessage: 'درصد ریسک باید بین 0 تا 1 باشد'
    };
  }

  if (entryPrice <= 0) {
    return {
      shareCount: 0,
      positionValue: 0,
      riskAmount: 0,
      suggestedLeverage: 1,
      isValid: false,
      errorMessage: 'نقطه ورود باید مثبت باشد'
    };
  }

  // محاسبه فاصله حد ضرر تا نقطه ورود
  const priceDistance = positionType === 'long'
    ? entryPrice - stopLoss
    : stopLoss - entryPrice;

  // بررسی نزدیکی بیش از حد حد ضرر به نقطه ورود
  const minPriceDistance = entryPrice * 0.01; // حداقل 1٪ فاصله
  if (priceDistance <= minPriceDistance || priceDistance <= 0) {
    return {
      shareCount: 0,
      positionValue: 0,
      riskAmount: 0,
      suggestedLeverage: 1,
      isValid: false,
      errorMessage: 'فاصله حد ضرر تا نقطه ورود بسیار کم است (حداقل 1٪ فاصله لازم است)'
    };
  }

  // محاسبه مقدار ریسک مجاز به ریال
  const riskAmount = totalCapital * riskPerTrade;

  // محاسبه تعداد سهم بر اساس فرمول مدیریت سرمایه
  const shareCount = Math.floor(riskAmount / priceDistance);

  // محاسبه ارزش کل پوزیشن
  const positionValue = shareCount * entryPrice;

  // محاسبه اهرم پیشنهادی (در صورت نیاز)
  const maxPositionValue = totalCapital * 0.5; // حداکثر 50٪ سرمایه در یک پوزیشن
  const suggestedLeverage = positionValue > maxPositionValue
    ? Math.ceil(positionValue / maxPositionValue)
    : 1;

  return {
    shareCount,
    positionValue,
    riskAmount,
    suggestedLeverage: leverage || suggestedLeverage,
    isValid: shareCount > 0,
    errorMessage: shareCount <= 0 ? 'تعداد سهم محاسبه‌شده صفر است' : undefined
  };
}

/**
 * محاسبه اندازه پوزیشن با در نظر گرفتن کارمزد معاملات
 */
export function calculatePositionSizeWithFees(
  input: PositionSizingInput,
  commissionRate: number = 0.001 // کارمزد پیش‌فرض 0.1٪
): PositionSizingOutput {
  const baseResult = calculatePositionSize(input);

  if (!baseResult.isValid) {
    return baseResult;
  }

  // کسر کارمزد از مقدار ریسک
  const commissionCost = baseResult.positionValue * commissionRate * 2; // خرید + فروش
  const adjustedRiskAmount = baseResult.riskAmount - commissionCost;

  if (adjustedRiskAmount <= 0) {
    return {
      ...baseResult,
      isValid: false,
      errorMessage: 'کارمزد معاملات بیشتر از ریسک مجاز است'
    };
  }

  // بازمحاسبه تعداد سهم با ریسک تعدیل‌شده
  const priceDistance = input.positionType === 'long'
    ? input.entryPrice - input.stopLoss
    : input.stopLoss - input.entryPrice;

  const adjustedShareCount = Math.floor(adjustedRiskAmount / priceDistance);

  return {
    ...baseResult,
    shareCount: adjustedShareCount,
    positionValue: adjustedShareCount * input.entryPrice,
    riskAmount: adjustedRiskAmount
  };
}

/**
 * محاسبه نسبت ریسک به ریوارد (Risk/Reward Ratio)
 */
export function calculateRiskRewardRatio(
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  positionType: 'long' | 'short'
): number {
  const risk = positionType === 'long'
    ? entryPrice - stopLoss
    : stopLoss - entryPrice;

  const reward = positionType === 'long'
    ? takeProfit - entryPrice
    : entryPrice - takeProfit;

  if (risk <= 0 || reward <= 0) {
    return 0;
  }

  return reward / risk;
}

/**
 * محاسبه نقطه سر‌به‌سر (Break-even Point) با در نظر گرفتن کارمزد
 */
export function calculateBreakEvenPoint(
  entryPrice: number,
  commissionRate: number = 0.001,
  positionType: 'long' | 'short'
): number {
  const commissionCost = entryPrice * commissionRate * 2;

  return positionType === 'long'
    ? entryPrice + commissionCost
    : entryPrice - commissionCost;
}
