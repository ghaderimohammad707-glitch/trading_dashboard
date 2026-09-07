/**
 * تست‌های واحد برای ماژول مدیریت سرمایه (Position Sizing)
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePositionSize,
  calculatePositionSizeWithFees,
  calculateRiskRewardRatio,
  calculateBreakEvenPoint
} from '../positionSizer';

describe('فاز ۴: گزارش‌دهی و مدیریت سرمایه - Position Sizer', () => {
  
  describe('calculatePositionSize', () => {
    it('باید اندازه پوزیشن را برای سیگنال خرید محاسبه کند', () => {
      const result = calculatePositionSize({
        totalCapital: 100_000_000, // ۱۰۰ میلیون ریال
        riskPerTrade: 0.02, // ۲٪ ریسک
        entryPrice: 10_000,
        stopLoss: 9_500,
        positionType: 'long'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.shareCount).toBeGreaterThan(0);
      expect(result.riskAmount).toBe(2_000_000); // ۲٪ از ۱۰۰ میلیون
      expect(result.positionValue).toBeGreaterThan(0);
    });
    
    it('باید اندازه پوزیشن را برای سیگنال فروش محاسبه کند', () => {
      const result = calculatePositionSize({
        totalCapital: 100_000_000,
        riskPerTrade: 0.02,
        entryPrice: 10_000,
        stopLoss: 10_500,
        positionType: 'short'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.shareCount).toBeGreaterThan(0);
    });
    
    it('باید در صورت نزدیکی حد ضرر به نقطه ورود خطا دهد', () => {
      const result = calculatePositionSize({
        totalCapital: 100_000_000,
        riskPerTrade: 0.02,
        entryPrice: 10_000,
        stopLoss: 9_950, // فقط ۰.۵٪ فاصله (کمتر از ۱٪ حداقل)
        positionType: 'long'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('فاصله حد ضرر');
    });
    
    it('باید در صورت سرمایه منفی خطا دهد', () => {
      const result = calculatePositionSize({
        totalCapital: -100_000_000,
        riskPerTrade: 0.02,
        entryPrice: 10_000,
        stopLoss: 9_500,
        positionType: 'long'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('سرمایه');
    });
    
    it('باید در صورت ریسک نامعتبر خطا دهد', () => {
      const result = calculatePositionSize({
        totalCapital: 100_000_000,
        riskPerTrade: 1.5, // بیشتر از ۱
        entryPrice: 10_000,
        stopLoss: 9_500,
        positionType: 'long'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('ریسک');
    });
  });
  
  describe('calculatePositionSizeWithFees', () => {
    it('باید کارمزد معاملات را در محاسبات لحاظ کند', () => {
      const result = calculatePositionSizeWithFees({
        totalCapital: 100_000_000,
        riskPerTrade: 0.02,
        entryPrice: 10_000,
        stopLoss: 9_500,
        positionType: 'long'
      }, 0.001); // کارمزد ۰.۱٪
      
      expect(result.isValid).toBe(true);
      // تعداد سهم باید کمتر از حالت بدون کارمزد باشد
      const baseResult = calculatePositionSize({
        totalCapital: 100_000_000,
        riskPerTrade: 0.02,
        entryPrice: 10_000,
        stopLoss: 9_500,
        positionType: 'long'
      });
      expect(result.shareCount).toBeLessThanOrEqual(baseResult.shareCount);
    });
    
    it('باید در صورت زیاد بودن کارمزد خطا دهد', () => {
      const result = calculatePositionSizeWithFees({
        totalCapital: 10_000_000, // سرمایه کم
        riskPerTrade: 0.01, // ریسک کم
        entryPrice: 10_000,
        stopLoss: 9_900, // فاصله بسیار کم
        positionType: 'long'
      }, 0.1); // کارمزد بسیار بالا ۱۰٪
      
      expect(result.isValid).toBe(false);
    });
  });
  
  describe('calculateRiskRewardRatio', () => {
    it('باید نسبت ریسک به ریوارد را برای پوزیشن Long محاسبه کند', () => {
      const ratio = calculateRiskRewardRatio(
        10_000, // entry
        9_500,  // stop loss (500 ریسک)
        11_000, // take profit (1000 ریوارد)
        'long'
      );
      
      expect(ratio).toBe(2); // ریوارد ۲ برابر ریسک
    });
    
    it('باید نسبت ریسک به ریوارد را برای پوزیشن Short محاسبه کند', () => {
      const ratio = calculateRiskRewardRatio(
        10_000, // entry
        10_500, // stop loss (500 ریسک)
        9_000,  // take profit (1000 ریوارد)
        'short'
      );
      
      expect(ratio).toBe(2);
    });
    
    it('باید صفر برگرداند اگر ریسک یا ریوارد منفی باشد', () => {
      const ratio = calculateRiskRewardRatio(
        10_000,
        10_500, // استاپ بالاتر از ورود در پوزیشن لانگ (غلط)
        11_000,
        'long'
      );
      
      expect(ratio).toBe(0);
    });
  });
  
  describe('calculateBreakEvenPoint', () => {
    it('باید نقطه سر‌به‌سر را برای پوزیشن Long محاسبه کند', () => {
      const breakEven = calculateBreakEvenPoint(10_000, 0.001, 'long');
      
      // نقطه سر‌به‌سر باید بالاتر از قیمت ورود باشد (به خاطر کارمزد)
      expect(breakEven).toBeGreaterThan(10_000);
      expect(breakEven).toBeCloseTo(10_020, 0); // حدود ۰.۲٪ کارمزد
    });
    
    it('باید نقطه سر‌به‌سر را برای پوزیشن Short محاسبه کند', () => {
      const breakEven = calculateBreakEvenPoint(10_000, 0.001, 'short');
      
      // نقطه سر‌به‌سر باید پایین‌تر از قیمت ورود باشد
      expect(breakEven).toBeLessThan(10_000);
    });
  });
});
