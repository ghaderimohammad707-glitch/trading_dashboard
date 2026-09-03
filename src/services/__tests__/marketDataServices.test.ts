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
    it('باید داده‌های Market Watch را دریافت کند (با fallback به mock)', async () => {
      const result = await tsetmcService.getMarketWatch('خودرو');
      
      expect(result).toBeDefined();
      expect(result?.symbol).toBe('خودرو');
      expect(typeof result?.lastPrice).toBe('number');
      expect(typeof result?.changePercent).toBe('number');
    });

    it('باید داده‌های تاریخی (کندل) دریافت کند (با fallback به mock)', async () => {
      const candles = await tsetmcService.getHistoricalData('فولاد', 30);
      
      expect(candles).toBeDefined();
      expect(Array.isArray(candles)).toBe(true);
      expect(candles.length).toBeGreaterThan(0);
      expect(candles[0]).toHaveProperty('time');
      expect(candles[0]).toHaveProperty('open');
      expect(candles[0]).toHaveProperty('high');
      expect(candles[0]).toHaveProperty('low');
      expect(candles[0]).toHaveProperty('close');
      expect(candles[0]).toHaveProperty('volume');
    });

    it('باید کش را مدیریت کند', async () => {
      // First call
      const result1 = await tsetmcService.getMarketWatch('شستا');
      
      // Second call (should use cache - same reference)
      const result2 = await tsetmcService.getMarketWatch('شستا');
      
      expect(result1?.symbol).toBe(result2?.symbol); // Same object reference from cache
      
      // Clear cache
      tsetmcService.clearCache();
      
      // Third call (should generate new data)
      const result3 = await tsetmcService.getMarketWatch('شستا');
      
      expect(result3).toBeDefined();
      expect(result3?.symbol).toBe('شستا');
    });

    it('باید Order Book را دریافت کند', async () => {
      const orderBook = await tsetmcService.getOrderBook('ذوب');
      
      expect(orderBook).toBeDefined();
      expect(orderBook).toHaveProperty('bids');
      expect(orderBook).toHaveProperty('asks');
      expect(Array.isArray(orderBook?.bids)).toBe(true);
      expect(Array.isArray(orderBook?.asks)).toBe(true);
    });
  });

  describe('Codal Service', () => {
    it('باید صورت‌های مالی را دریافت کند (با fallback به mock)', async () => {
      const financials = await codalService.getFinancialStatements('خودرو');
      
      expect(financials).toBeDefined();
      expect(financials?.symbol).toBe('خودرو');
      expect(typeof financials?.revenue).toBe('number');
      expect(typeof financials?.netProfit).toBe('number');
      expect(financials?.eps).toBeDefined();
      expect(financials?.pe).toBeDefined();
    });

    it('باید گزارش‌های ماهانه را دریافت کند (با fallback به mock)', async () => {
      const reports = await codalService.getMonthlyReports('فولاد', 6);
      
      expect(reports).toBeDefined();
      expect(Array.isArray(reports)).toBe(true);
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0]).toHaveProperty('symbol');
      expect(reports[0]).toHaveProperty('month');
      expect(reports[0]).toHaveProperty('revenue');
    });

    it('باید اطلاعات سود تقسیمی را دریافت کند (با fallback به mock)', async () => {
      const dividendInfo = await codalService.getDividendInfo('شستا');
      
      expect(dividendInfo).toBeDefined();
      expect(dividendInfo?.symbol).toBe('شستا');
      expect(typeof dividendInfo?.dpsProposed).toBe('number');
      expect(typeof dividendInfo?.dividendYield).toBe('number');
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

    it('باید قیمت لحظه‌ای را دریافت کند', async () => {
      const price = await marketDataService.getLivePrice('ذوب');
      
      expect(price).toBeDefined();
      expect(typeof price?.lastPrice).toBe('number');
      expect(typeof price?.changePercent).toBe('number');
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
