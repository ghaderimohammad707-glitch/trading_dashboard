/**
 * Social Trading Module — غیرفعال
 * 
 * توجه: این ماژول فعلاً غیرفعال است زیرا داده‌های ساختگی تولید می‌کرد.
 * تا زمانی که سیستم احراز هویت واقعی و داده‌های واقعی تریدرها موجود نباشد،
 * این ماژول نباید فعال شود.
 */

export interface SocialTrade {
  id: string;
  traderName: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  price: number;
  timestamp: number;
  confidence?: number;
  notes?: string;
}

class SocialTradingEngine {
  /**
   * دریافت تریدهای اجتماعی
   * فعلاً خالی برمی‌گرداند تا داده ساختگی نمایش داده نشود
   */
  getRecentTrades(): SocialTrade[] {
    console.log("[social-trading] ⚠️ Module disabled - no fake data");
    return [];
  }
  
  /**
   * دنبال کردن یک تریدر
   */
  followTrader(traderId: string): boolean {
    console.log("[social-trading] ⚠️ Follow disabled - auth required");
    return false;
  }
  
  /**
   * ثبت ترید جدید
   */
  postTrade(trade: Omit<SocialTrade, 'id' | 'timestamp'>): SocialTrade | null {
    console.log("[social-trading] ⚠️ Post trade disabled - auth required");
    return null;
  }
}

export const socialTrading = new SocialTradingEngine();
export default socialTrading;
