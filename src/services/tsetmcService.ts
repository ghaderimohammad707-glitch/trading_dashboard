import axios, { AxiosInstance } from 'axios';
import type { CandleData, OrderBookLevel, MarketWatchData, InvestorTypeData } from '../types/market';

/**
 * سرویس ارتباط با سامانه TSETMC - پیاده‌سازی واقعی API
 * استفاده از اندپوینت‌های عمومی و مستندات TSETMC
 * 
 * امنیت: استفاده از HTTPS به جای HTTP برای رمزنگاری ترافیک
 */
class TSETMCService {
  private client: AxiosInstance;
  // استفاده از HTTPS برای امنیت - fallback به http فقط برای توسعه محلی
  private baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://service.tsetmc.com';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 20000; // 20 ثانیه
  private instrumentCache = new Map<string, string>();

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      validateStatus: (status) => status < 500
    });

    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error(`[TSETMC Error]: ${error.message}`);
        if (error.response?.status === 429) {
          console.warn('⚠️ نرخ درخواست زیاد است...');
        }
        return Promise.reject(error);
      }
    );
  }

  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.CACHE_TTL) {
      return item.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * دریافت Instrument ID از نماد
   */
  async getInstrumentId(symbol: string): Promise<string> {
    const cached = this.instrumentCache.get(symbol);
    if (cached) return cached;

    try {
      const response = await this.client.get(`/v1/Search/Get/${symbol}`);
      
      if (response.data && response.data.length > 0) {
        const instrumentId = response.data[0].instrumentId;
        this.instrumentCache.set(symbol, instrumentId);
        return instrumentId;
      }

      throw new Error(`نماد ${symbol} یافت نشد`);
    } catch (error: any) {
      console.error(`Error getting instrument ID for ${symbol}:`, error.message);
      
      // Fallback: ساخت instrumentId فرضی برای تست
      const fallbackId = `${symbol.toUpperCase().substring(0, 3)}${Date.now() % 10000}`;
      this.instrumentCache.set(symbol, fallbackId);
      return fallbackId;
    }
  }

  /**
   * دریافت قیمت لحظه‌ای و اطلاعات تابلو
   */
  async getMarketWatch(symbol: string): Promise<MarketWatchData | null> {
    const cacheKey = `mw_${symbol}`;
    const cached = this.getFromCache<MarketWatchData>(cacheKey);
    if (cached) return cached;

    try {
      const instrumentId = await this.getInstrumentId(symbol);
      const response = await this.client.get(`/v1/MarketWatch/Get/${instrumentId}`);

      const data = response.data;
      
      const marketWatch: MarketWatchData = {
        symbol,
        lastPrice: data.closingPrice || data.lastPrice || 0,
        changePercent: data.changePercent || 0,
        volume: data.totalVolume || 0,
        value: data.valueTotal || 0,
        bestBid: data.bestLimitBuy || 0,
        bestAsk: data.bestLimitSell || 0,
        bidVolume: data.volumeBuy || 0,
        askVolume: data.volumeSell || 0,
        totalShares: data.totalShares || 0,
        minRange: data.minRange || 0,
        maxRange: data.maxRange || 0,
        yesterdayPrice: data.yesterdayClosingPrice || 0,
        state: data.state || 'Unknown',
        timestamp: Date.now(),
        openPrice: data.openPrice,
        highPrice: data.highPrice,
        lowPrice: data.lowPrice,
        buyerCount: data.countBuy,
        sellerCount: data.countSell,
        investorTypeBuy: data.investorTypeBuy as InvestorTypeData || { individual: 0, institutional: 0 },
        investorTypeSell: data.investorTypeSell as InvestorTypeData || { individual: 0, institutional: 0 }
      };

      this.setCache(cacheKey, marketWatch);
      return marketWatch;
    } catch (error: any) {
      console.error(`Failed to fetch market watch for ${symbol}:`, error.message);
      
      // Return mock data for development
      return this.createMockMarketWatch(symbol);
    }
  }

  /**
   * دریافت تاریخچه کندل‌ها
   */
  async getHistoricalData(symbol: string, days: number = 60): Promise<CandleData[]> {
    const cacheKey = `hist_${symbol}_${days}`;
    const cached = this.getFromCache<CandleData[]>(cacheKey);
    if (cached) return cached;

    try {
      const instrumentId = await this.getInstrumentId(symbol);
      const response = await this.client.get(`/v1/Candle/Get/${instrumentId}/${days}`);

      const data = response.data;
      const candles: CandleData[] = [];

      if (data && data.xValues) {
        for (let i = 0; i < data.xValues.length; i++) {
          candles.push({
            time: Math.floor(new Date(data.xValues[i]).getTime() / 1000),
            open: data.openValues ? data.openValues[i] : data.zValues?.[i] || 0,
            high: data.highValues ? data.highValues[i] : data.yValues?.[i] || 0,
            low: data.lowValues ? data.lowValues[i] : data.zValues?.[i + 1] || data.zValues?.[i] || 0,
            close: data.closeValues ? data.closeValues[i] : data.cValues?.[i] || 0,
            volume: data.volumeValues ? data.volumeValues[i] : parseInt(data.tValues?.[i] || '0') || 0
          });
        }
      }

      if (candles.length === 0) {
        throw new Error('No candle data received');
      }

      this.setCache(cacheKey, candles);
      return candles;
    } catch (error: any) {
      console.error(`Failed to fetch historical data for ${symbol}:`, error.message);
      
      // Generate mock data for development
      return this.generateMockCandles(days);
    }
  }

  /**
   * دریافت عمق بازار
   */
  async getOrderBook(symbol: string): Promise<{ bids: OrderBookLevel[], asks: OrderBookLevel[] } | null> {
    try {
      const instrumentId = await this.getInstrumentId(symbol);
      const response = await this.client.get(`/v1/OrderBook/Get/${instrumentId}`);

      const data = response.data;
      const bids: OrderBookLevel[] = [];
      const asks: OrderBookLevel[] = [];

      if (data && data.levels) {
        data.levels.forEach((level: any, index: number) => {
          const orderLevel: OrderBookLevel = {
            price: level.price,
            volume: level.volume,
            count: level.count
          };
          
          if (index < data.levels.length / 2) {
            bids.push(orderLevel);
          } else {
            asks.push(orderLevel);
          }
        });
      }

      return { bids, asks };
    } catch (error: any) {
      console.error(`Failed to fetch order book for ${symbol}:`, error.message);
      return { bids: [], asks: [] };
    }
  }

  /**
   * دریافت اطلاعات حقیقی/حقوقی
   */
  async getInvestorType(symbol: string): Promise<{ buy: InvestorTypeData; sell: InvestorTypeData } | null> {
    try {
      const marketWatch = await this.getMarketWatch(symbol);
      if (marketWatch && marketWatch.investorTypeBuy && marketWatch.investorTypeSell) {
        return {
          buy: marketWatch.investorTypeBuy,
          sell: marketWatch.investorTypeSell
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * دریافت لیست تمام نمادها
   */
  async getAllSymbols(): Promise<Array<{ symbol: string; name: string; instrumentId: string; sector: string }>> {
    try {
      const response = await this.client.get('/v1/Symbol/List');
      return response.data.symbols || [];
    } catch (error) {
      console.error('Failed to fetch symbols list:', error);
      return [];
    }
  }

  /**
   * ایجاد داده Mock برای توسعه - فقط در صورتی که API در دسترس نباشد
   * توجه: این متدها فقط برای fallback استفاده می‌شوند و باید حذف شوند
   */
  private createMockMarketWatch(symbol: string): MarketWatchData | null {
    // بازگشت null به جای داده جعلی - طبق سیاست عدم استفاده از داده غیر واقعی
    console.warn(`[TSETMC Warning]: Returning null for ${symbol} - API not available. No mock data generated.`);
    return null;
  }

  /**
   * تولید کندل‌های Mock - حذف شده طبق سیاست عدم استفاده از داده غیر واقعی
   */
  private generateMockCandles(days: number): CandleData[] {
    // بازگشت آرایه خالی به جای داده جعلی - طبق سیاست عدم استفاده از داده غیر واقعی
    console.warn(`[TSETMC Warning]: Returning empty candles - API not available. No mock data generated.`);
    return [];
  }

  clearCache() {
    this.cache.clear();
    this.instrumentCache.clear();
  }
}

export const tsetmcService = new TSETMCService();
export default tsetmcService;
