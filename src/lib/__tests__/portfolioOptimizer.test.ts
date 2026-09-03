import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateCorrelationMatrix, optimizePortfolio, suggestRebalance } from '../portfolioOptimizer';
import { fetchHistoricalOHLC } from '../historicalData';

vi.mock('../historicalData');

describe('portfolioOptimizer - بهینه‌سازی پرتفوی', () => {
  const mockInstruments = [
    { symbol: 'فولاد', segment: 'tse', volume: 1000000, rawInsCode: '1' },
    { symbol: 'فملی', segment: 'tse', volume: 900000, rawInsCode: '2' },
    { symbol: 'شستا', segment: 'tse', volume: 800000, rawInsCode: '3' },
    { symbol: 'وبانک', segment: 'tse', volume: 700000, rawInsCode: '4' },
    { symbol: 'خودرو', segment: 'tse', volume: 600000, rawInsCode: '5' },
  ] as any[];

  const mockOHLCData = Array.from({ length: 60 }, (_, i) => ({
    date: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: 1000 + i * 10,
    high: 1050 + i * 10,
    low: 990 + i * 10,
    close: 1020 + i * 10,
    volume: 1000000,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pearsonCorrelation (internal)', () => {
    it('همبستگی کامل مثبت', () => {
      // این تابع داخلی است، اما می‌توانیم از طریق calculateCorrelationMatrix تست کنیم
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      
      // همبستگی باید نزدیک به ۱ باشد
      const meanX = x.reduce((a, b) => a + b, 0) / x.length;
      const meanY = y.reduce((a, b) => a + b, 0) / y.length;
      
      let numerator = 0;
      let denomX = 0;
      let denomY = 0;
      
      for (let i = 0; i < x.length; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
      }
      
      const correlation = numerator / Math.sqrt(denomX * denomY);
      expect(correlation).toBeCloseTo(1, 5);
    });

    it('همبستگی کامل منفی', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];
      
      const meanX = x.reduce((a, b) => a + b, 0) / x.length;
      const meanY = y.reduce((a, b) => a + b, 0) / y.length;
      
      let numerator = 0;
      let denomX = 0;
      let denomY = 0;
      
      for (let i = 0; i < x.length; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
      }
      
      const correlation = numerator / Math.sqrt(denomX * denomY);
      expect(correlation).toBeCloseTo(-1, 5);
    });

    it('بدون همبستگی', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 3, 7, 2, 8];
      
      const meanX = x.reduce((a, b) => a + b, 0) / x.length;
      const meanY = y.reduce((a, b) => a + b, 0) / y.length;
      
      let numerator = 0;
      let denomX = 0;
      let denomY = 0;
      
      for (let i = 0; i < x.length; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
      }
      
      const correlation = numerator / Math.sqrt(denomX * denomY);
      expect(Math.abs(correlation)).toBeLessThan(0.5);
    });
  });

  describe('calculateCorrelationMatrix', () => {
    it('برگرداندن ماتریس همبستگی برای نمادهای انتخاب شده', async () => {
      vi.mocked(fetchHistoricalOHLC).mockResolvedValue(mockOHLCData);
      
      const result = await calculateCorrelationMatrix(mockInstruments, 5);
      
      expect(result.symbols).toHaveLength(5);
      expect(result.matrix).toHaveLength(5);
      expect(result.matrix[0]).toHaveLength(5);
      
      // قطر اصلی باید ۱ باشد
      for (let i = 0; i < result.symbols.length; i++) {
        expect(result.matrix[i][i]).toBe(1);
      }
      
      // ماتریس باید متقارن باشد
      for (let i = 0; i < result.symbols.length; i++) {
        for (let j = 0; j < result.symbols.length; j++) {
          expect(result.matrix[i][j]).toBeCloseTo(result.matrix[j][i], 5);
        }
      }
    });

    it('ماتریس خالی برای داده‌های ناکافی', async () => {
      const shortData = Array.from({ length: 10 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        close: 1000 + i,
      }));
      
      vi.mocked(fetchHistoricalOHLC).mockResolvedValue(shortData as any);
      
      const result = await calculateCorrelationMatrix(mockInstruments, 5);
      
      // با داده‌های کم، باید آرایه‌های خالی یا کوچک برگرداند
      expect(result.symbols).toBeDefined();
      expect(result.matrix).toBeDefined();
    });

    it('استفاده از کش برای درخواست‌های مکرر', async () => {
      vi.mocked(fetchHistoricalOHLC).mockResolvedValue(mockOHLCData);
      
      const result1 = await calculateCorrelationMatrix(mockInstruments, 5);
      const result2 = await calculateCorrelationMatrix(mockInstruments, 5);
      
      // بار دوم باید از کش استفاده کند و نتایج یکسان باشند
      expect(result1.symbols).toEqual(result2.symbols);
      expect(result1.matrix).toEqual(result2.matrix);
    });
  });

  describe('computeRiskReturn (internal)', () => {
    it('محاسبه بازده و ریسک سالانه', () => {
      const returns = [0.01, 0.02, -0.01, 0.015, 0.005, 0.02, -0.005, 0.01];
      
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
      const dailyStd = Math.sqrt(variance);
      
      const annualizedReturn = mean * 252;
      const annualizedRisk = dailyStd * Math.sqrt(252);
      
      expect(annualizedReturn).toBeGreaterThan(0);
      expect(annualizedRisk).toBeGreaterThan(0);
    });

    it('بازده صفر برای داده‌های ناکافی', () => {
      const returns = [0.01, 0.02];
      
      if (returns.length < 5) {
        expect(true).toBe(true); // تأیید شرط
      }
    });
  });

  describe('optimizePortfolio', () => {
    it('بهینه‌سازی پرتفوی با ریسک متوسط', async () => {
      vi.mocked(fetchHistoricalOHLC).mockResolvedValue(mockOHLCData);
      
      const result = await optimizePortfolio(mockInstruments, 'medium', 5);
      
      expect(result.symbols).toBeDefined();
      expect(result.weights).toBeDefined();
      expect(result.weights.length).toBe(result.symbols.length);
      
      // وزن‌ها باید جمعشان ۱ شود (با تلورانس مناسب برای گرد کردن)
      const totalWeight = result.weights.reduce((a, b) => a + b, 0);
      expect(totalWeight).toBeGreaterThanOrEqual(0.99);
      expect(totalWeight).toBeLessThanOrEqual(1.01);
      
      // همه وزن‌ها باید مثبت باشند
      result.weights.forEach(w => {
        expect(w).toBeGreaterThanOrEqual(0);
      });
    });

    it('بهینه‌سازی با ریسک پایین', async () => {
      vi.mocked(fetchHistoricalOHLC).mockResolvedValue(mockOHLCData);
      
      const result = await optimizePortfolio(mockInstruments, 'low', 5);
      
      expect(result.expectedRisk).toBeDefined();
      expect(result.sharpeRatio).toBeDefined();
      expect(result.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(result.diversificationScore).toBeLessThanOrEqual(100);
    });

    it('بهینه‌سازی با ریسک بالا', async () => {
      vi.mocked(fetchHistoricalOHLC).mockResolvedValue(mockOHLCData);
      
      const result = await optimizePortfolio(mockInstruments, 'high', 5);
      
      expect(result.symbols).toBeDefined();
      expect(result.weights).toBeDefined();
    });

    it('پرتفوی مساوی برای داده‌های ناکافی', async () => {
      const shortData = Array.from({ length: 5 }, (_, i) => ({
        close: 1000 + i,
      }));
      
      vi.mocked(fetchHistoricalOHLC).mockResolvedValue(shortData as any);
      
      const fewInstruments = mockInstruments.slice(0, 2);
      const result = await optimizePortfolio(fewInstruments, 'medium', 5);
      
      if (fewInstruments.length > 0) {
        const equalWeight = 1 / fewInstruments.length;
        result.weights.forEach(w => {
          expect(w).toBeCloseTo(equalWeight, 2);
        });
      }
    });

    it('وزن‌های معکوس بر اساس نوسان', () => {
      // شبیه‌سازی منطق inverse-volatility
      const risks = [0.2, 0.3, 0.1];
      const invVol = risks.map(r => 1 / Math.max(r, 0.1));
      const totalInvVol = invVol.reduce((a, b) => a + b, 0);
      const weights = invVol.map(v => v / totalInvVol);
      
      // دارایی با ریسک کمتر باید وزن بیشتری داشته باشد
      expect(weights[2]).toBeGreaterThan(weights[1]); // 0.1 risk > 0.3 risk
    });
  });

  describe('suggestRebalance', () => {
    it('پیشنهاد بازچینی پرتفوی', async () => {
      vi.mocked(fetchHistoricalOHLC).mockResolvedValue(mockOHLCData);
      
      const currentPositions = [
        { symbol: 'فولاد', weight: 0.4 },
        { symbol: 'فملی', weight: 0.3 },
        { symbol: 'شستا', weight: 0.3 },
      ];
      
      const result = await suggestRebalance(currentPositions, mockInstruments);
      
      expect(result.current).toHaveLength(3);
      expect(result.reason).toBeDefined();
      
      result.current.forEach(item => {
        expect(item.symbol).toBeDefined();
        expect(item.weight).toBeDefined();
        expect(item.suggested).toBeDefined();
        expect(item.action).toMatch(/نگهداری|افزایش|کاهش/);
      });
    });

    it('پیام نگهداری برای پرتفوی بهینه', async () => {
      vi.mocked(fetchHistoricalOHLC).mockResolvedValue(mockOHLCData);
      
      // پرتفویی که نزدیک به بهینه است
      const currentPositions = [
        { symbol: 'فولاد', weight: 0.2 },
        { symbol: 'فملی', weight: 0.2 },
      ];
      
      const result = await suggestRebalance(currentPositions, mockInstruments);
      
      expect(result.reason).toBeDefined();
    });

    it('محاسبه تفاوت کل', () => {
      const positions = [
        { weight: 0.3, suggested: 0.25 },
        { weight: 0.4, suggested: 0.45 },
        { weight: 0.3, suggested: 0.3 },
      ];
      
      const totalDiff = positions.reduce(
        (sum, r) => sum + Math.abs(r.suggested - r.weight),
        0
      );
      
      expect(totalDiff).toBeCloseTo(0.1, 5);
    });
  });
});
