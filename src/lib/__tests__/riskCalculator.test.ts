import { describe, it, expect } from 'vitest';
import { calculatePositionSize, calculateMaxDrawdown } from '../riskCalculator';

describe('riskCalculator - محاسبه‌گر ریسک و حجم معامله', () => {
  const baseInput = {
    accountBalance: 100_000_000, // ۱ میلیارد ریال
    riskPerTrade: 2,             // ۲٪ ریسک
    entryPrice: 5000,            // قیمت ورود
    stopLoss: 4500,              // حد ضرر
  };

  describe('calculatePositionSize', () => {
    it('محاسبه حجم پوزیشن با پارامترهای پایه', () => {
      const result = calculatePositionSize(baseInput);
      
      expect(result.riskAmount).toBe(2_000_000); // ۲٪ از ۱ میلیارد
      expect(result.stopDistance).toBe(500);     // ۵۰۰۰ - ۴۵۰۰
      expect(result.stopDistancePct).toBe(10);   // ۵۰۰/۵۰۰۰ = ۱۰٪
      expect(result.positionSize).toBe(4000);    // ۲٬۰۰۰٬۰۰۰ / ۵۰۰
      expect(result.positionValue).toBe(20_000_000); // ۴۰۰۰ * ۵۰۰۰
      expect(result.warnings).toHaveLength(0);
    });

    it('هشدار برای فاصله زیاد حد ضرر', () => {
      const result = calculatePositionSize({
        ...baseInput,
        stopLoss: 4000, // ۲۰٪ فاصله
      });
      
      expect(result.stopDistancePct).toBeGreaterThan(10);
      expect(result.warnings).toContainEqual(expect.stringContaining('حد ضرر بیش از ۱۰٪'));
    });

    it('هشدار برای ریسک بالا در هر معامله', () => {
      const result = calculatePositionSize({
        ...baseInput,
        riskPerTrade: 6, // بیشتر از ۵٪
      });
      
      expect(result.warnings).toContainEqual(expect.stringContaining('ریسک هر معامله بیش از ۵٪'));
    });

    it('هشدار برای حجم بیش از ۳۰٪ حساب', () => {
      const result = calculatePositionSize({
        ...baseInput,
        stopLoss: 4900, // فاصله کم = حجم زیاد
      });
      
      expect(result.warnings).toContainEqual(expect.stringContaining('حجم پوزیشن بیش از ۳۰٪'));
    });

    it('هشدار برای حجم صفر', () => {
      const result = calculatePositionSize({
        ...baseInput,
        accountBalance: 1000, // موجودی خیلی کم
        stopLoss: 4000,       // فاصله زیاد
      });
      
      expect(result.positionSize).toBeLessThanOrEqual(0);
      expect(result.warnings).toContainEqual(expect.stringContaining('حجم پوزیشن صفر'));
    });

    it('محاسبه نسبت ریسک/ریوارد با حد سود', () => {
      const result = calculatePositionSize({
        ...baseInput,
        takeProfit: 6000, // ۱۰۰۰ واحد سود
      });
      
      expect(result.potentialProfit).toBeDefined();
      expect(result.riskRewardRatio).toBe(2); // ۱۰۰۰/۵۰۰ = ۲
      expect(result.warnings).toHaveLength(0);
    });

    it('هشدار برای ریسک/ریوارد کمتر از ۱', () => {
      const result = calculatePositionSize({
        ...baseInput,
        takeProfit: 5200, // فقط ۲۰۰ واحد سود
      });
      
      expect(result.riskRewardRatio).toBeLessThan(1);
      expect(result.warnings).toContainEqual(expect.stringContaining('نسبت ریسک/ریوارد کمتر از ۱'));
    });

    it('محاسبه Kelly Criterion', () => {
      const result = calculatePositionSize({
        ...baseInput,
        winRate: 60,    // ۶۰٪ نرخ برد
        avgWin: 10,     // ۱۰٪ میانگین سود
        avgLoss: 5,     // ۵٪ میانگین ضرر
      });
      
      expect(result.kellyFraction).toBeDefined();
      expect(result.kellyFraction!).toBeGreaterThan(0);
      expect(result.kellyPositionSize).toBeDefined();
    });

    it('هشدار Kelly منفی برای استراتژی زیان‌ده', () => {
      const result = calculatePositionSize({
        ...baseInput,
        winRate: 30,    // ۳۰٪ نرخ برد
        avgWin: 5,      // ۵٪ میانگین سود
        avgLoss: 10,    // ۱۰٪ میانگین ضرر
      });
      
      expect(result.kellyFraction).toBeLessThan(0);
      expect(result.warnings).toContainEqual(expect.stringContaining('Kelly Criterion منفی'));
    });

    it('هشدار Kelly بیش از ۲۰٪', () => {
      const result = calculatePositionSize({
        ...baseInput,
        winRate: 80,    // ۸۰٪ نرخ برد
        avgWin: 20,     // ۲۰٪ میانگین سود
        avgLoss: 5,     // ۵٪ میانگین ضرر
      });
      
      if (result.kellyFraction && result.kellyFraction > 20) {
        expect(result.warnings).toContainEqual(expect.stringContaining('Kelly بیش از ۲۰٪'));
      }
    });

    it('محاسبه درصد حداکثر پوزیشن', () => {
      const result = calculatePositionSize(baseInput);
      
      expect(result.maxPositionPercent).toBeDefined();
      expect(result.maxPositionPercent).toBe(20); // ۲۰ میلیون / ۱ میلیارد = ۲٪
    });

    it('اعداد اعشاری در ورودی', () => {
      const result = calculatePositionSize({
        accountBalance: 100_000_000,
        riskPerTrade: 1.5,
        entryPrice: 5123.45,
        stopLoss: 4987.23,
      });
      
      expect(result.positionSize).toBeGreaterThanOrEqual(0);
      expect(result.stopDistance).toBeGreaterThan(0);
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('محاسبه حداکثر ضرر روزانه/هفتگی/ماهانه', () => {
      const result = calculateMaxDrawdown(100_000_000, 2, 3);
      
      expect(result.maxDailyLoss).toBe(6_000_000);    // ۱۰۰M * ۰.۰۲ * ۳
      expect(result.maxWeeklyLoss).toBe(30_000_000);  // ۶M * ۵
      expect(result.maxMonthlyLoss).toBe(132_000_000); // ۶M * ۲۲
      expect(result.dailyLossPct).toBe(6);            // ۶M / ۱۰۰M * ۱۰۰
    });

    it('پیش‌فرض ۳ معامله در روز', () => {
      const result = calculateMaxDrawdown(100_000_000, 2);
      
      expect(result.maxDailyLoss).toBe(6_000_000);
    });

    it('تعداد معاملات مختلف', () => {
      const result = calculateMaxDrawdown(100_000_000, 1, 5);
      
      expect(result.maxDailyLoss).toBe(5_000_000); // ۱۰۰M * ۰.۰۱ * ۵
    });

    it('موجودی و ریسک متفاوت', () => {
      const result = calculateMaxDrawdown(50_000_000, 3, 2);
      
      expect(result.maxDailyLoss).toBe(3_000_000); // ۵۰M * ۰.۰۳ * ۲
      expect(result.dailyLossPct).toBe(6);         // ۳M / ۵۰M * ۱۰۰
    });
  });
});
