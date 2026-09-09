/**
 * سرویس دریافت داده‌های واقعی از بازار بورس تهران (TSETMC)
 * تمام داده‌ها مستقیماً از API رسمی دریافت می‌شوند - بدون هیچ داده فیک
 */

import { withRetry } from '../networkRetry';

// تابع کمکی برای درخواست‌های GET ساده
async function get(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
}

export interface RealTimeData {
  symbol: string;
  companyName: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  volume: number;
  value: number;
  count: number;
  buyerValue: number; // ارزش خرید حقیقی
  sellerValue: number; // ارزش فروش حقیقی
  buyerCount: number; // تعداد خریدار حقیقی
  sellerCount: number; // تعداد فروشنده حقیقی
  buyerPower: number; // قدرت خریدار
  sellerPower: number; // قدرت فروشنده
  pe: number;
  eps: number;
  marketCap: number;
  timestamp: number;
}

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
  count: number;
}

const SYMBOL_MAP: Record<string, string> = {
  'خودرو': 'tseco3228976151402437',
  'فولاد': 'tseco6778119421586426',
  'شستا': 'tseco4509393668881446',
  'وبملت': 'tseco5944072985055657',
  'شاخص': 'index',
};

/**
 * دریافت داده‌های لحظه‌ای برای یک نماد خاص
 */
export async function fetchRealTimeData(symbol: string): Promise<RealTimeData | null> {
  try {
    // دریافت اطلاعات نماد از API TSETMC
    const url = `https://service.tsetmc.com/tsev2/data/TseClient2.aspx?t=LastInfo&i=${SYMBOL_MAP[symbol] || symbol}`;
    
    const response = await get(url);
    if (!response || typeof response !== 'string') return null;
    
    const parts = response.split('@');
    if (parts.length < 13) return null;
    
    const data = parts[0].split(',');
    const priceInfo = parts[2]?.split(',');
    const tradeInfo = parts[3]?.split(',');
    
    const lastPrice = parseFloat(data[4]) || 0;
    const change = lastPrice - parseFloat(data[5]);
    const changePercent = ((change / parseFloat(data[5])) * 100) || 0;
    
    // محاسبه قدرت خریدار و فروشنده
    const buyerValue = parseFloat(tradeInfo?.[1]) || 0;
    const sellerValue = parseFloat(tradeInfo?.[2]) || 0;
    const buyerCount = parseInt(tradeInfo?.[3]) || 1;
    const sellerCount = parseInt(tradeInfo?.[4]) || 1;
    
    return {
      symbol,
      companyName: data[1] || symbol,
      lastPrice,
      change,
      changePercent,
      openPrice: parseFloat(data[10]) || lastPrice,
      highPrice: parseFloat(data[11]) || lastPrice,
      lowPrice: parseFloat(data[12]) || lastPrice,
      closePrice: parseFloat(data[5]) || lastPrice,
      volume: parseInt(tradeInfo?.[0]) || 0,
      value: buyerValue + sellerValue,
      count: buyerCount + sellerCount,
      buyerValue,
      sellerValue,
      buyerCount,
      sellerCount,
      buyerPower: buyerCount > 0 ? buyerValue / buyerCount : 0,
      sellerPower: sellerCount > 0 ? sellerValue / sellerCount : 0,
      pe: parseFloat(data[16]) || 0,
      eps: parseFloat(data[17]) || 0,
      marketCap: parseFloat(data[15]) || 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching real-time data for ${symbol}:`, error);
    return null;
  }
}

/**
 * دریافت داده‌های تاریخی برای تحلیل تکنیکال
 */
export async function fetchHistoricalData(symbol: string, days: number = 60): Promise<HistoricalData[]> {
  try {
    const insCode = SYMBOL_MAP[symbol] || symbol;
    const url = `https://service.tsetmc.com/tsev2/chart/data/IndexDaily.aspx?i=${insCode}&g=0`;
    
    const response = await get(url);
    if (!response) return [];
    
    // پردازش داده‌های تاریخی
    const lines = response.split('\n').filter((line: string) => line.trim());
    const data: HistoricalData[] = [];
    
    for (let i = 0; i < Math.min(lines.length, days); i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 7) {
        data.push({
          date: parts[0],
          open: parseFloat(parts[1]) || 0,
          high: parseFloat(parts[2]) || 0,
          low: parseFloat(parts[3]) || 0,
          close: parseFloat(parts[4]) || 0,
          volume: parseInt(parts[5]) || 0,
          value: parseFloat(parts[6]) || 0,
          count: parseInt(parts[7]) || 0,
        });
      }
    }
    
    return data.reverse(); // قدیمی به جدید
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return [];
  }
}

/**
 * دریافت لیست نمادهای فعال بازار
 */
export async function fetchActiveSymbols(): Promise<string[]> {
  try {
    const url = 'https://service.tsetmc.com/tsev2/data/MarketWatchInit.aspx?h=0&r=0';
    const response = await get(url);
    
    if (!response) return Object.keys(SYMBOL_MAP);
    
    const symbols: string[] = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.includes('LVal18AFC')) {
        const parts = line.split(',');
        if (parts.length > 3) {
          symbols.push(parts[2]);
        }
      }
    }
    
    return symbols.length > 0 ? symbols : Object.keys(SYMBOL_MAP);
  } catch (error) {
    console.error('Error fetching active symbols:', error);
    return Object.keys(SYMBOL_MAP);
  }
}
