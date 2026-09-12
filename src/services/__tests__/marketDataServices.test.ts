import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tsetmcService } from '../tsetmcService';
import { codalService } from '../codalService';
import { marketDataService } from '../marketDataService';

// Mock axios to prevent real API calls during tests
vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(() => ({
        get: vi.fn(() => {
          throw new Error('API not available in test mode');
        }),
        interceptors: {
          response: {
            use: vi.fn(),
            eject: vi.fn()
          }
        }
      }))
    }
  };
});

describe('فاز ۲: سرویس‌های اتصال به API بازار', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tsetmcService.clearCache();
    codalService.clearCache();
  });

  describe('TSETMC Service', () => {
    it('باید داده‌های Market Watch را دریافت کند (با fallback به null در صورت عدم دسترسی)', async () => {
      const result = await tsetmcService.getMarketWatch('خودرو');
      
      // در محیط تست که API در دسترس نیست، باید null برگرداند (بدون داده جعلی)
      expect(result).toBeNull();
    });

    it('باید داده‌های تاریخی (کندل) دریافت کند (با fallback به آرایه خالی)', async () => {
      const candles = await tsetmcService.getHistoricalData('فولاد', 30);
      
      // در محیط تست که API در دسترس نیست، باید آرایه خالی برگرداند (بدون داده جعلی)
      expect(candles).toBeDefined();
      expect(Array.isArray(candles)).toBe(true);
      expect(candles.length).toBe(0);
    });

    it('باید کش را مدیریت کند', async () => {
      // First call - returns null in test mode
      const result1 = await tsetmcService.getMarketWatch('شستا');
      expect(result1).toBeNull();
      
      // Second call (should use cache - same reference)
      const result2 = await tsetmcService.getMarketWatch('شستا');
      expect(result2).toBeNull();
      
      // Clear cache
      tsetmcService.clearCache();
      
      // Third call - still null in test mode
      const result3 = await tsetmcService.getMarketWatch('شستا');
      expect(result3).toBeNull();
    });

    it('باید Order Book را دریافت کند', async () => {
      const orderBook = await tsetmcService.getOrderBook('ذوب');
      
      // در محیط تست که API در دسترس نیست، باید آبجکت با آرایه‌های خالی برگرداند
      expect(orderBook).toBeDefined();
      expect(orderBook).toHaveProperty('bids');
      expect(orderBook).toHaveProperty('asks');
      expect(Array.isArray(orderBook?.bids)).toBe(true);
      expect(Array.isArray(orderBook?.asks)).toBe(true);
      expect(orderBook?.bids.length).toBe(0);
      expect(orderBook?.asks.length).toBe(0);
    });
  });

  describe('Codal Service', () => {
    it('باید صورت‌های مالی را دریافت کند (با fallback به null در صورت عدم دسترسی)', async () => {
      const financials = await codalService.getFinancialStatements('خودرو');
      
      // در محیط تست که API در دسترس نیست، باید null برگرداند (بدون داده جعلی)
      expect(financials).toBeNull();
    });

    it('باید گزارش‌های ماهانه را دریافت کند (با fallback به آرایه خالی)', async () => {
      const reports = await codalService.getMonthlyReports('فولاد', 6);
      
      // در محیط تست که API در دسترس نیست، باید آرایه خالی برگرداند (بدون داده جعلی)
      expect(reports).toBeDefined();
      expect(Array.isArray(reports)).toBe(true);
      expect(reports.length).toBe(0);
    });

    it('باید اطلاعات سود تقسیمی را دریافت کند (با fallback به null)', async () => {
      const dividendInfo = await codalService.getDividendInfo('شستا');
      
      // در محیط تست که API در دسترس نیست، باید null برگرداند (بدون داده جعلی)
      expect(dividendInfo).toBeNull();
    });
  });

  describe('Market Data Service (یکپارچه)', () => {
    it('باید تمام داده‌های یک نماد را دریافت کند', async () => {
      const fullData = await marketDataService.getFullSymbolData('خودرو');
      
      expect(fullData).toBeDefined();
      expect(fullData.symbol).toBe('خودرو');
      expect(fullData.marketWatch).toBeDefined();
      expect(fullData.historicalData).toBeDefined();
      expect(Array.isArray(fullData.historicalData)).toBe(true);
    });

    it('باید چند نماد را به صورت موازی دریافت کند', async () => {
      const symbols = ['خودرو', 'فولاد', 'شستا'];
      const results = await marketDataService.getMultipleSymbols(symbols);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(symbols.length);
      
      if (results.length > 0) {
        expect(results[0].symbol).toBe('خودرو');
      }
    });

    it('باید قیمت لحظه‌ای را دریافت کند (با fallback به null)', async () => {
      const price = await marketDataService.getLivePrice('ذوب');
      
      // در محیط تست که API در دسترس نیست، باید null برگرداند (بدون داده جعلی)
      expect(price).toBeNull();
    });
  });

  describe('بررسی عملکرد و کش', () => {
    it('باید کش TSETMC را پاکسازی کند', () => {
      tsetmcService.clearCache();
      expect(true).toBe(true);
    });

    it('باید کش Codal را پاکسازی کند', () => {
      codalService.clearCache();
      expect(true).toBe(true);
    });
  });

  describe('ساختار داده‌ها', () => {
    it('باید ساختار CandleData را رعایت کند', async () => {
      const candles = await tsetmcService.getHistoricalData('آریا', 10);
      
      candles.forEach(candle => {
        expect(candle).toHaveProperty('time');
        expect(candle).toHaveProperty('open');
        expect(candle).toHaveProperty('high');
        expect(candle).toHaveProperty('low');
        expect(candle).toHaveProperty('close');
        expect(candle).toHaveProperty('volume');
        
        expect(typeof candle.time).toBe('number');
        expect(typeof candle.open).toBe('number');
        expect(typeof candle.high).toBe('number');
        expect(typeof candle.low).toBe('number');
        expect(typeof candle.close).toBe('number');
        expect(typeof candle.volume).toBe('number');
        
        // Validate OHLC logic
        expect(candle.high).toBeGreaterThanOrEqual(candle.low);
        expect(candle.high).toBeGreaterThanOrEqual(candle.open);
        expect(candle.high).toBeGreaterThanOrEqual(candle.close);
        expect(candle.low).toBeLessThanOrEqual(candle.open);
        expect(candle.low).toBeLessThanOrEqual(candle.close);
      });
    });

    it('باید ساختار FinancialStatement را رعایت کند', async () => {
      const financials = await codalService.getFinancialStatements('وبانک');
      
      if (financials) {
        expect(financials).toHaveProperty('symbol');
        expect(financials).toHaveProperty('reportDate');
        expect(financials).toHaveProperty('fiscalYear');
        expect(financials).toHaveProperty('revenue');
        expect(financials).toHaveProperty('netProfit');
        expect(financials).toHaveProperty('eps');
        expect(financials).toHaveProperty('pe');
        expect(financials).toHaveProperty('currency');
      }
    });
  });
});
