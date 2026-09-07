import { tsetmcService } from './tsetmcService';
import { codalService } from './codalService';
import { SymbolData, CandleData, MarketWatchData, InvestorTypeData } from '../types/market';

/**
 * سرویس یکپارچه داده‌های بازار
 * ترکیب داده‌های TSETMC و Codal برای تحلیل کامل
 */
class MarketDataService {
  
  /**
   * دریافت تمام داده‌های مورد نیاز برای یک نماد
   */
  async getFullSymbolData(symbol: string): Promise<SymbolData | null> {
    try {
      const [marketWatch, historicalData, orderBook] = await Promise.all([
        tsetmcService.getMarketWatch(symbol),
        tsetmcService.getHistoricalData(symbol, 90), // 90 روز تاریخچه
        tsetmcService.getOrderBook(symbol)
      ]);

      // دریافت داده‌های فاندامنتال از کدال
      const financials = await codalService.getFinancialStatements(symbol);
      const dividendInfo = await codalService.getDividendInfo(symbol);

      // پردازش اطلاعات حقیقی و حقوقی (فعلاً خالی)
      const realInvestor: InvestorTypeData | null = null;
      const legalInvestor: InvestorTypeData | null = null;

      return {
        symbol,
        name: symbol, // باید از API گرفته شود
        marketWatch,
        historicalData,
        orderBook,
        realInvestor,
        legalInvestor
      };
    } catch (error) {
      console.error(`Failed to fetch full data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * دریافت داده‌های چند نماد به صورت موازی
   */
  async getMultipleSymbols(symbols: string[]): Promise<SymbolData[]> {
    const results = await Promise.all(
      symbols.map(symbol => this.getFullSymbolData(symbol))
    );
    return results.filter((data): data is SymbolData => data !== null);
  }

  /**
   * دریافت کندل‌های استیک با محاسبه اندیکاتورها
   */
  async getCandlesWithIndicators(symbol: string, days: number = 60): Promise<CandleData[]> {
    return await tsetmcService.getHistoricalData(symbol, days);
  }

  /**
   * دریافت قیمت لحظه‌ای با کش
   */
  async getLivePrice(symbol: string): Promise<MarketWatchData | null> {
    return await tsetmcService.getMarketWatch(symbol);
  }

  /**
   * به‌روزرسانی دستی کش
   */
  refreshCache(symbol?: string) {
    if (symbol) {
      tsetmcService.clearCache();
    } else {
      tsetmcService.clearCache();
    }
  }
}

export const marketDataService = new MarketDataService();
export default marketDataService;
