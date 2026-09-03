import axios, { AxiosInstance } from 'axios';

/**
 * سرویس ارتباط با سامانه کدال (Codal.ir)
 * دریافت اطلاعات صورت‌های مالی، گزارش‌های ماهانه و افشای اطلاعات
 */
class CodalService {
  private client: AxiosInstance;
  private baseUrl = 'https://api.codal.ir'; // آدرس API کدال (در صورت وجود)
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 300000; // 5 دقیقه برای داده‌های فاندامنتال

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'NabzBazar-Analysis-Tool/1.0'
      }
    });
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
   * جستجوی نماد در کدال
   */
  async searchSymbol(symbol: string): Promise<any[]> {
    const cacheKey = `search_${symbol}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    try {
      // در حال حاضر کدال API رسمی عمومی ندارد
      // این بخش باید به scraper یا API شخص ثالث متصل شود
      console.log(`[CODAL] Searching for symbol: ${symbol}`);
      return [];
    } catch (error) {
      console.error(`Failed to search symbol ${symbol}:`, error);
      return [];
    }
  }

  /**
   * دریافت آخرین گزارش‌های مالی
   */
  async getFinancialStatements(symbol: string): Promise<any> {
    const cacheKey = `financial_${symbol}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // شبیه‌سازی داده‌های صورت مالی
      const mockData = {
        symbol,
        revenue: 0,
        netProfit: 0,
        eps: 0,
        pe: 0,
        assets: 0,
        liabilities: 0,
        equity: 0,
        reportDate: new Date().toISOString(),
        fiscalYear: new Date().getFullYear()
      };

      this.setCache(cacheKey, mockData);
      return mockData;
    } catch (error) {
      console.error(`Failed to fetch financial statements for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * دریافت گزارش‌های ماهانه تولید و فروش
   */
  async getMonthlyReports(symbol: string): Promise<any[]> {
    try {
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * دریافت اطلاعات تقسیم سود
   */
  async getDividendInfo(symbol: string): Promise<any> {
    try {
      return {
        dividendPerShare: 0,
        dividendYield: 0,
        announcementDate: null,
        paymentDate: null
      };
    } catch (error) {
      return null;
    }
  }
}

export const codalService = new CodalService();
export default codalService;
