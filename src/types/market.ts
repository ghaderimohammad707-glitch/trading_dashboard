/**
 * انواع داده‌های بازار برای سرویس TSETMC
 */

/**
 * داده‌های کندل استیک برای تحلیل تکنیکال
 */
export interface CandleData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * سطحی از دفتر سفارشات (Order Book)
 */
export interface OrderBookLevel {
  price: number;
  volume: number;
  count?: number; // تعداد سفارشات
}

/**
 * داده‌های تابلوخوانی (Market Watch)
 */
export interface MarketWatchData {
  symbol: string;
  lastPrice: number;
  changePercent: number;
  volume: number;
  value: number; // ارزش معاملات
  bestBid: number; // بهترین قیمت خرید
  bestAsk: number; // بهترین قیمت فروش
  bidVolume: number;
  askVolume: number;
  totalShares: number; // تعداد کل سهام
  minRange: number; // کمترین قیمت روز
  maxRange: number; // بیشترین قیمت روز
  yesterdayPrice: number; // قیمت پایانی دیروز
  state: 'Open' | 'Closed' | 'Unknown'; // وضعیت نماد
  timestamp: number;
}

/**
 * اطلاعات حقیقی و حقوقی
 */
export interface InvestorTypeData {
  buyVolume: number;
  sellVolume: number;
  buyCount: number;
  sellCount: number;
  netBuyVolume: number;
  avgBuyPrice: number;
  avgSellPrice: number;
}

/**
 * داده‌های کامل نماد برای تحلیل
 */
export interface SymbolData {
  symbol: string;
  name: string;
  marketWatch: MarketWatchData | null;
  historicalData: CandleData[];
  orderBook: { bids: OrderBookLevel[]; asks: OrderBookLevel[] } | null;
  realInvestor: InvestorTypeData | null;
  legalInvestor: InvestorTypeData | null;
}
