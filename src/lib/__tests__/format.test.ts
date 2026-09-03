import { describe, it, expect } from 'vitest';
import { toFa, faNumber, faRound, faSigned, faPercent, compactNumber, compactToman, faPrice } from '../format';

describe('format - توابع فرمت‌بندی', () => {
  describe('toFa', () => {
    it('تبدیل عدد انگلیسی به فارسی', () => {
      expect(toFa('123')).toBe('۱۲۳');
      expect(toFa('0123456789')).toBe('۰۱۲۳۴۵۶۷۸۹');
    });

    it('متن مخلوط', () => {
      expect(toFa('abc123xyz')).toBe('abc۱۲۳xyz');
    });

    it('تبدیل عدد به صورت خودکار', () => {
      expect(toFa(123)).toBe('۱۲۳');
    });
  });

  describe('faNumber', () => {
    it('فرمت اعداد معمولی', () => {
      expect(faNumber(1234567)).toContain('۱');
      expect(faNumber(1234567)).toContain('۲');
    });

    it('فرمت اعداد اعشاری', () => {
      expect(faNumber(1234.567, 3)).toContain('۱٬۲۳۴');
    });

    it('اعداد کوچک', () => {
      expect(faNumber(0)).toBe('۰');
      expect(faNumber(1)).toBe('۱');
    });
  });

  describe('faRound', () => {
    it('رند کردن اعشار', () => {
      expect(faRound(1234.567, 1)).toContain('۱٬۲۳۴');
    });
  });

  describe('faSigned', () => {
    it('عدد مثبت', () => {
      const result = faSigned(1234, 0);
      expect(result).not.toContain('-');
    });

    it('عدد منفی', () => {
      const result = faSigned(-1234, 0);
      expect(result).toContain('-');
    });
  });

  describe('faPercent', () => {
    it('درصد با علامت', () => {
      const result = faPercent(4.5, 2);
      expect(result).toContain('٪');
    });
  });

  describe('compactNumber', () => {
    it('حجم کم', () => {
      expect(compactNumber(1000)).toContain('هزار');
    });

    it('حجم متوسط (میلیون)', () => {
      expect(compactNumber(1500000)).toContain('میلیون');
    });

    it('حجم بالا (میلیارد)', () => {
      expect(compactNumber(2500000000)).toContain('میلیارد');
    });

    it('هزار میلیارد', () => {
      expect(compactNumber(1500000000000)).toContain('هزار میلیارد');
    });
  });

  describe('compactToman', () => {
    it('مبالغ کم', () => {
      expect(compactToman(1000)).not.toContain('همت');
    });

    it('همت (هزار میلیارد تومان)', () => {
      expect(compactToman(1500000000000)).toContain('همت');
    });
  });

  describe('faPrice', () => {
    it('فرمت قیمت سهام', () => {
      expect(faPrice(5000)).toContain('۵');
    });

    it('قیمت با واحد', () => {
      expect(faPrice(5000, 'تومان')).toContain('تومان');
    });

    it('قیمت صفر', () => {
      expect(faPrice(0)).toBe('۰');
    });
  });
});
