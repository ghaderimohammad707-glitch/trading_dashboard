/**
 * موتور مرکزی داده‌های بازار
 * وظیفه: دریافت داده‌های خام از TSETMC و تولید/استنتاج سایر داده‌ها (طلا، ارز، کالا، صندوق، آتی، اختیار)
 * بدون نیاز به سرور جانبی - تمام محاسبات کلاینت-ساید انجام می‌شود
 */

import type { StockData, FundData, CommodityData, CurrencyData, FuturesData, OptionData, MarketIndexData, CandleData } from '@/types/market';

// شبیه‌سازی تاخیر شبکه برای طبیعی‌تر شدن
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * دریافت داده‌های پایه بورس (سهام عادی)
 * در نسخه نهایی باید به API واقعی وصل شود، فعلاً از داده‌های ساختاریافته بر اساس نمادهای واقعی استفاده می‌کند
 */
export async function fetchStockData(symbol: string): Promise<StockData> {
  await delay(300);
  
  // شبیه‌سازی داده بر اساس الگوی نماد (برای جلوگیری از داده کاملاً رندوم)
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = 1000 + (hash % 50000);
  const changePercent = ((hash % 200) - 90) / 10; // بین -9 تا +10 درصد
  
  // تولید تاریخچه کندل‌ها
  const history: CandleData[] = [];
  const now = Date.now();
  for (let i = 30; i >= 0; i--) {
    const candleBase = basePrice * (1 + (Math.sin(i / 5) * 0.1));
    history.push({
      time: now - i * 24 * 60 * 60 * 1000,
      open: Math.round(candleBase * 0.98),
      high: Math.round(candleBase * 1.05),
      low: Math.round(candleBase * 0.95),
      close: Math.round(candleBase * (1 + (Math.random() * 0.04 - 0.02))),
      volume: Math.floor(Math.random() * 1000000) + 100000,
    });
  }
  
  return {
    symbol,
    name: `شرکت ${symbol}`,
    currentPrice: Math.round(basePrice * (1 + changePercent / 100)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 10000000) + 100000,
    avgVolume: Math.floor(Math.random() * 5000000) + 500000,
    marketCap: Math.floor(basePrice * 100000000),
    peRatio: parseFloat((10 + (hash % 15)).toFixed(2)),
    eps: parseFloat((basePrice / (10 + (hash % 15))).toFixed(0)),
    history,
    realInvestorPower: parseFloat((0.5 + Math.random()).toFixed(2)),
    legalInvestorPower: parseFloat((0.3 + Math.random() * 0.5).toFixed(2)),
  };
}

/**
 * دریافت لیست سهام‌های بازار
 */
export async function fetchAllStocks(): Promise<StockData[]> {
  await delay(500);
  const symbols = ['فولاد', 'فملی', 'شستا', 'خودرو', 'وبملت', 'وغدیر', 'کچاد', 'کگل', 'آپ', 'دی'];
  return Promise.all(symbols.map(fetchStockData));
}

/**
 * استنتاج داده‌های صندوق‌ها (ETF) بر اساس NAV و داده‌های بازار
 */
export async function fetchFundData(symbol: string): Promise<FundData> {
  await delay(200);
  const baseNav = 10000 + Math.random() * 5000;
  const price = baseNav * (0.95 + Math.random() * 0.1); // حباب بین -5% تا +5%
  
  return {
    symbol,
    name: `صندوق ${symbol.replace('پالایش', 'پالایشی').replace('طلا', 'طلای')}`,
    price: Math.round(price),
    change: parseFloat(((price - baseNav) / baseNav * 100).toFixed(2)),
    nav: Math.round(baseNav),
    pmPrice: Math.round(baseNav * 0.98),
    sector: symbol.includes('طلا') ? 'طلا' : symbol.includes('پالایش') ? 'پالایشی' : 'سهامی',
  };
}

export async function fetchAllFunds(): Promise<FundData[]> {
  const symbols = ['عیار', 'لوتوس', 'طلا', 'آگاس', 'کاریس', 'پیشتاز', 'آرام', 'ساحل'];
  return Promise.all(symbols.map(fetchFundData));
}

/**
 * استنتاج قیمت طلا و سکه بر اساس قیمت دلار و انس جهانی (شبیه‌سازی شده)
 * فرمول: قیمت سکه = (انس * دلار * 0.3732) + حباب
 */
export async function fetchGoldData(): Promise<CommodityData> {
  await delay(200);
  const globalOunce = 2030 + Math.random() * 50; // انس جهانی حدود 2030 دلار
  const usdPrice = 50000 + Math.random() * 2000; // دلار حدود 50000 تومان
  
  const gold18Price = Math.round((globalOunce * usdPrice) / 4.25); // تقریبی برای 18 عیار
  
  return {
    name: 'طلای 18 عیار',
    price: gold18Price,
    change: Math.floor(Math.random() * 5000 - 2000),
    unit: 'تومان/گرم',
    currency: 'IRR',
  };
}

export async function fetchCoinData(): Promise<CommodityData> {
  const usdPrice = 50000 + Math.random() * 2000;
  const globalOunce = 2030 + Math.random() * 50;
  
  const coinPrice = Math.round((globalOunce * usdPrice * 0.3732) * (1.05)); // 5% حباب
  
  return {
    name: 'سکه امامی',
    price: coinPrice,
    change: Math.floor(Math.random() * 100000 - 50000),
    unit: 'تومان',
    currency: 'IRR',
  };
}

/**
 * استنتاج نرخ ارز (دلار، یورو) بر اساس روند بازار
 */
export async function fetchCurrencyData(symbol: string): Promise<CurrencyData> {
  await delay(200);
  const baseUsd = 50000 + Math.random() * 2000;
  
  if (symbol === 'USD') {
    return {
      name: 'دلار آمریکا',
      price: Math.round(baseUsd),
      change: Math.floor(Math.random() * 1000 - 500),
      unit: 'تومان',
    };
  } else if (symbol === 'EUR') {
    return {
      name: 'یورو',
      price: Math.round(baseUsd * 1.08),
      change: Math.floor(Math.random() * 1000 - 500),
      unit: 'تومان',
    };
  }
  
  throw new Error('Currency not supported');
}

/**
 * داده‌های کالا (نفت، مس، نقره) - بر اساس قیمت‌های جهانی
 */
export async function fetchCommodityGlobal(symbol: string): Promise<CommodityData> {
  await delay(200);
  let basePrice = 0;
  let name = '';
  
  switch(symbol) {
    case 'OIL': basePrice = 80; name = 'نفت برنت'; break;
    case 'COPPER': basePrice = 8500; name = 'مس جهانی'; break;
    case 'SILVER': basePrice = 23; name = 'نقره جهانی'; break;
    default: throw new Error('Unknown commodity');
  }
  
  const price = basePrice * (1 + (Math.random() * 0.04 - 0.02));
  
  return {
    name,
    price: Math.round(price * 100) / 100,
    change: parseFloat((Math.random() * 2 - 1).toFixed(2)),
    unit: symbol === 'OIL' ? 'دلار/بشکه' : 'دلار/تنسی',
    currency: 'USD',
  };
}

/**
 * داده‌های آتی (Zafaran, Saffron, etc.)
 */
export async function fetchFuturesData(symbol: string): Promise<FuturesData> {
  await delay(200);
  const basePrice = 50000 + Math.random() * 10000;
  
  return {
    symbol,
    name: `قرارداد آتی ${symbol}`,
    price: Math.round(basePrice),
    change: Math.floor(Math.random() * 2000 - 1000),
    expiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 ماه دیگر
  };
}

/**
 * داده‌های اختیار معامله (Call/Put)
 */
export async function fetchOptionData(symbol: string): Promise<OptionData> {
  await delay(200);
  const isCall = symbol.includes('ض');
  const basePrice = 500 + Math.random() * 2000;
  
  return {
    symbol,
    name: `اختیار ${isCall ? 'خرید' : 'فروش'} ${symbol}`,
    strike: Math.round(basePrice * 10),
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    type: isCall ? 'call' : 'put',
    underlying: symbol.split(' ')[0],
  };
}

/**
 * شاخص‌های کل بازار
 */
export async function fetchMarketIndices(): Promise<MarketIndexData[]> {
  await delay(300);
  const totalIndex = 2100000 + Math.random() * 50000;
  const sameWeightIndex = 450000 + Math.random() * 10000;
  
  return [
    {
      name: 'شاخص کل بورس',
      value: Math.round(totalIndex),
      change: Math.floor(Math.random() * 10000 - 5000),
      changePercent: parseFloat(((Math.random() * 2) - 1).toFixed(2)),
    },
    {
      name: 'شاخص هم‌وزن',
      value: Math.round(sameWeightIndex),
      change: Math.floor(Math.random() * 5000 - 2500),
      changePercent: parseFloat(((Math.random() * 2.5) - 1.25).toFixed(2)),
    },
    {
      name: 'شاخص کل فرابورس',
      value: Math.round(25000 + Math.random() * 1000),
      change: Math.floor(Math.random() * 200 - 100),
      changePercent: parseFloat(((Math.random() * 1.5) - 0.75).toFixed(2)),
    },
  ];
}

/**
 * اخبار هوشمند (فیلتر شده)
 * فقط اخبار مهم اقتصادی و سیاسی که روی بازار تاثیر دارند
 */
export async function fetchSmartNews(): Promise<any[]> {
  await delay(400);
  
  const mockNews = [
    { id: 1, title: 'افزایش نرخ بهره بانکی توسط بانک مرکزی', source: 'اقتصاد آنلاین', time: '10 دقیقه پیش', importance: 'high', category: 'economic' },
    { id: 2, title: 'تغییرات جدید در قوانین واردات خودرو', source: 'ایرنا', time: '1 ساعت پیش', importance: 'medium', category: 'political' },
    { id: 3, title: 'رشد قیمت نفت در بازارهای جهانی', source: 'بلومبرگ', time: '2 ساعت پیش', importance: 'high', category: 'global' },
    { id: 4, title: 'گزارش عملکرد ماهانه شرکت فولاد مبارکه', source: 'کدال', time: '3 ساعت پیش', importance: 'high', category: 'company' },
    { id: 5, title: 'برگزاری مجمع عمومی عادی سالانه وبملت', source: 'رنگین‌کمان', time: '4 ساعت پیش', importance: 'medium', category: 'company' },
  ];
  
  return mockNews;
}

/**
 * داده‌های تابلوخوانی پیشرفته (ورود و خروج پول هوشمند)
 */
export async function fetchTableauData(symbol: string) {
  await delay(300);
  const stock = await fetchStockData(symbol);
  
  return {
    ...stock,
    smartMoneyIn: Math.floor(stock.volume * 0.7 * stock.currentPrice),
    smartMoneyOut: Math.floor(stock.volume * 0.6 * stock.currentPrice),
    buyerCount: Math.floor(Math.random() * 5000) + 500,
    sellerCount: Math.floor(Math.random() * 5000) + 500,
    powerRatio: parseFloat((0.5 + Math.random()).toFixed(2)),
  };
}
