import axios, { AxiosInstance } from 'axios';
import { CandleData, OrderBookLevel, MarketWatchData } from '../types/market';

/**
 * سرویس ارتباط با سامانه TSETMC
 * مدیریت درخواست‌ها، کشینگ و تبدیل داده‌های خام به فرمت استاندارد
 */
class TSETMCService {
  private client: AxiosInstance;
  private baseUrl = 'http://api.tsetmc.com'; // آدرس پایه API عمومی
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 20000; // 20 ثانیه عمر کش برای داده‌های لحظه‌ای

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NabzBazar-Analysis-Tool/1.0'
      }
    });

    // اینترسپتور برای لاگ و مدیریت خطا
    this.client.interceptors.response.use(
      response => response,
      error => {
        console.error(`[TSETMC Error]: ${error.message}`);
        if (error.response?.status === 429) {
          console.warn('⚠️ نرخ درخواست زیاد است. فعال‌سازی حالت انتظار...');
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * بررسی کش قبل از درخواست شبکه
   */
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
   * دریافت قیمت لحظه‌ای و اطلاعات تابلو
   * @param symbol نماد بورسی (مثلاً: "خودرو")
   */
  async getMarketWatch(symbol: string): Promise<MarketWatchData | null> {
    const cacheKey = `mw_${symbol}`;
    const cached = this.getFromCache<MarketWatchData>(cacheKey);
    if (cached) return cached;

    try {
      // شبیه‌سازی درخواست به اندپوینت واقعی (در محیط پروداکشن URL دقیق جایگزین شود)
      // const response = await this.client.get(`/tseclient.dll?dt=${this.getInstrumentId(symbol)}`);
      
      // فعلاً ساختار داده‌ای که از API برمی‌گردد را شبیه‌سازی می‌کنیم تا لاجیک کار کند
      // در نسخه نهایی، این بخش به API واقعی متصل می‌شود
      const mockData: MarketWatchData = {
        symbol,
        lastPrice: 0,
        changePercent: 0,
        volume: 0,
        value: 0,
        bestBid: 0,
        bestAsk: 0,
        bidVolume: 0,
        askVolume: 0,
        totalShares: 0,
        minRange: 0,
        maxRange: 0,
        yesterdayPrice: 0,
        state: 'Unknown', // Closed, Open, etc.
        timestamp: Date.now()
      };

      // TODO: اتصال واقعی به API
      // const rawData = response.data;
      // const parsedData = this.parseMarketWatch(rawData);

      this.setCache(cacheKey, mockData);
      return mockData;
    } catch (error) {
      console.error(`Failed to fetch market watch for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * دریافت تاریخچه قیمت‌ها (کندل‌ها) برای تحلیل تکنیکال
   * @param symbol نماد
   * @param days تعداد روزهای گذشته
   */
  async getHistoricalData(symbol: string, days: number = 60): Promise<CandleData[]> {
    const cacheKey = `hist_${symbol}_${days}`;
    const cached = this.getFromCache<CandleData[]>(cacheKey);
    if (cached) return cached;

    try {
      // شبیه‌سازی داده‌های تاریخی برای تست
      // در واقعیت: await this.client.get(`/api/v3/candles/${symbol}?days=${days}`)
      const candles: CandleData[] = [];
      const now = Date.now();
      let basePrice = 10000;

      for (let i = days; i >= 0; i--) {
        const date = new Date(now - i * 24 * 60 * 60 * 1000);
        const volatility = Math.random() * 0.05; // 5% نوسان
        const open = basePrice;
        const close = basePrice * (1 + (Math.random() - 0.5) * volatility);
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low = Math.min(open, close) * (1 - Math.random() * 0.02);
        const volume = Math.floor(Math.random() * 1000000) + 50000;

        candles.push({
          time: date.getTime() / 1000, // Unix timestamp
          open,
          high,
          low,
          close,
          volume
        });
        basePrice = close;
      }

      this.setCache(cacheKey, candles);
      return candles;
    } catch (error) {
      console.error(`Failed to fetch historical data for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * دریافت عمق بازار (Order Book)
   */
  async getOrderBook(symbol: string): Promise<{ bids: OrderBookLevel[], asks: OrderBookLevel[] } | null> {
    try {
      // دریافت داده‌های حقیقی/حقوقی و صف‌های خرید/فروش
      // این بخش نیازمند پارس کردن رشته‌های خاص TSETMC است
      return {
        bids: [],
        asks: []
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * پاکسازی کش (مثلاً هنگام تغییر نماد)
   */
  clearCache() {
    this.cache.clear();
  }
}

export const tsetmcService = new TSETMCService();
export default tsetmcService;
