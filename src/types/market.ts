/**
 * انواع داده‌های بازار برای سرویس TSETMC و Codal
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
 * اطلاعات حقیقی و حقوقی
 */
export interface InvestorTypeData {
  individual: number; // درصد یا حجم حقیقی
  institutional: number; // درصد یا حجم حقوقی
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
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  buyerCount?: number;
  sellerCount?: number;
  investorTypeBuy?: InvestorTypeData;
  investorTypeSell?: InvestorTypeData;
}

/**
 * صورت‌های مالی (Financial Statements)
 */
export interface FinancialStatement {
  symbol: string;
  reportDate: Date;
  fiscalYear: number;
  period: string; // سالانه، میان‌دوره‌ای
  revenue: number;
  netProfit: number;
  grossProfit: number;
  operatingProfit: number;
  eps: number;
  pe: number;
  totalAssets: number;
  totalLiabilities: number;
  shareholdersEquity: number;
  currentAssets: number;
  currentLiabilities: number;
  cashFlow: number;
  debtToEquity: number;
  roe: number;
  roa: number;
  currency: string;
}

/**
 * گزارش ماهانه
 */
export interface MonthlyReport {
  symbol: string;
  month: string;
  year: number;
  reportDate: Date;
  revenue: number;
  productionVolume: number;
  salesVolume: number;
  productPrice: number;
  capacityUtilization: number;
  YoYRevenueGrowth: number;
  MoMRevenueGrowth: number;
  currency: string;
}

/**
 * اطلاعات سود تقسیمی
 */
export interface DividendInfo {
  symbol: string;
  fiscalYear: number;
  dpsProposed: number;
  dpsApproved: number;
  paymentDate: Date | null;
  exDividendDate: Date | null;
  dividendYield: number;
  payoutRatio: number;
  currency: string;
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
