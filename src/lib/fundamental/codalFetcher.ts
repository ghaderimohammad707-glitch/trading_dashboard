/**
 * ماژول دریافت داده‌های بنیادی از کدال و TSETMC
 * بدون هیچ داده‌ی هاردکد یا موکی - فقط اتصال به APIهای واقعی
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { FinancialStatement, QuarterlyData, AnnualData, CompanyProfile, CodalRawData } from './types.js';

const CODAL_BASE_URL = 'https://codal.ir';
const TSETMC_BASE_URL = 'http://api.tsetmc.com';

/**
 * دریافت صورت‌های مالی از کدال
 * توجه: این تابع نیاز به هندل کردن محدودیت‌های CORS و احراز هویت دارد
 * در محیط تولید باید از سرور واسط استفاده شود
 */
export async function fetchFinancialStatements(symbol: string): Promise<{
  quarterly: QuarterlyData[];
  annual: AnnualData[];
}> {
  try {
    // تلاش برای دریافت از API رسمی کدال
    // نکته: API کدال نیاز به ثبت نام و کلید API دارد
    const codalUrl = `${CODAL_BASE_URL}/Search.aspx?Symbol=${symbol}`;
    
    // در محیط واقعی، اینجا باید به API کدال متصل شویم
    // فعلاً ساختار درخواست را آماده می‌کنیم
    console.log(`دریافت صورت‌های مالی برای ${symbol} از کدال...`);
    
    // Placeholder برای پیاده‌سازی واقعی
    // کاربر باید API Key کدال خود را اضافه کند
    throw new Error('اتصال به کدال نیازمند API Key معتبر است. لطفاً از https://codal.ir/api اقدام کنید.');
  } catch (error) {
    console.error(`خطا در دریافت داده از کدال برای ${symbol}:`, error);
    throw error;
  }
}

/**
 * دریافت اطلاعات شرکت از TSETMC
 */
export async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile> {
  try {
    const url = `${TSETMC_BASE_URL}/tse/data/MarketDataInit.aspx`;
    
    // دریافت لیست نمادها
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
      timeout: 10000,
    });
    
    // پردازش پاسخ و استخراج اطلاعات نماد مورد نظر
    // این بخش نیاز به پیاده‌سازی دقیق بر اساس ساختار API TSETMC دارد
    console.log(`دریافت پروفایل شرکت برای ${symbol} از TSETMC...`);
    
    // Placeholder - در محیط واقعی باید داده‌ها را از پاسخ استخراج کنیم
    throw new Error('استخراج اطلاعات از TSETMC نیازمند پیاده‌سازی دقیق Parser است.');
  } catch (error) {
    console.error(`خطا در دریافت پروفایل از TSETMC برای ${symbol}:`, error);
    throw error;
  }
}

/**
 * دریافت قیمت لحظه‌ای از TSETMC
 */
export async function fetchCurrentPrice(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  value: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}> {
  try {
    const url = `${TSETMC_BASE_URL}/tse/data/MarketWatchInit.aspx`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
      },
      timeout: 10000,
    });
    
    console.log(`دریافت قیمت لحظه‌ای برای ${symbol}...`);
    
    // Placeholder برای پیاده‌سازی واقعی
    throw new Error('دریافت قیمت لحظه‌ای نیازمند Parser اختصاصی TSETMC است.');
  } catch (error) {
    console.error(`خطا در دریافت قیمت برای ${symbol}:`, error);
    throw error;
  }
}

/**
 * دریافت داده‌های خام از کدال برای گزارش‌های خاص
 */
export async function fetchCodalReport(
  symbol: string, 
  reportType: string
): Promise<CodalRawData> {
  try {
    const searchUrl = `${CODAL_BASE_URL}/Search.aspx?Symbol=${symbol}&ReportType=${reportType}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    });
    
    const $ = cheerio.load(response.data);
    
    // استخراج لینک گزارش‌ها
    const reports: Array<{ title: string; url: string; date: string }> = [];
    $('table#gridTable tr').each((i, el) => {
      const title = $(el).find('td:nth-child(2)').text().trim();
      const url = $(el).find('a').attr('href');
      const date = $(el).find('td:nth-child(5)').text().trim();
      
      if (url && title.includes(reportType)) {
        reports.push({ title, url: `${CODAL_BASE_URL}${url}`, date });
      }
    });
    
    if (reports.length === 0) {
      throw new Error(`هیچ گزارشی از نوع ${reportType} برای ${symbol} یافت نشد.`);
    }
    
    // دریافت اولین گزارش
    const latestReport = reports[0];
    const reportData = await fetchReportDetail(latestReport.url);
    
    return {
      symbol,
      reportType,
      filingDate: latestReport.date,
      periodEndDate: '', // باید از داخل گزارش استخراج شود
      rawData: reportData,
      sourceUrl: latestReport.url,
    };
  } catch (error) {
    console.error(`خطا در دریافت گزارش کدال برای ${symbol}:`, error);
    throw error;
  }
}

/**
 * دریافت جزئیات یک گزارش کدال
 */
async function fetchReportDetail(url: string): Promise<Record<string, any>> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    });
    
    const $ = cheerio.load(response.data);
    const data: Record<string, any> = {};
    
    // استخراج جداول صورت‌های مالی
    $('table').each((i, table) => {
      const tableName = $(table).prev('h3').text().trim() || `جدول ${i + 1}`;
      const rows: string[][] = [];
      
      $(table).find('tr').each((j, tr) => {
        const row: string[] = [];
        $(tr).find('td, th').each((k, td) => {
          row.push($(td).text().trim());
        });
        if (row.length > 0) rows.push(row);
      });
      
      data[tableName] = rows;
    });
    
    return data;
  } catch (error) {
    console.error(`خطا در دریافت جزئیات گزارش از ${url}:`, error);
    throw error;
  }
}

/**
 * دریافت نرخ ارز و طلا از TGJU
 */
export async function fetchTGJUPrices(): Promise<{
  usdFree: number;
  usdBank: number;
  eur: number;
  aed: number;
  usdt: number;
  btc: number;
  eth: number;
  gold18: number;
  gold24: number;
  silver: number;
  coinEmami: number;
  coinBahar: number;
  oil: number;
  copper: number;
}> {
  try {
    const url = 'https://www.tgju.org/';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    });
    
    const $ = cheerio.load(response.data);
    
    // استخراج قیمت‌ها از صفحه TGJU
    // سلکتورهای دقیق باید بر اساس ساختار فعلی سایت تنظیم شوند
    const getPrice = (selector: string): number => {
      const text = $(selector).text().replace(/,/g, '').trim();
      return parseFloat(text) || 0;
    };
    
    return {
      usdFree: getPrice('.price-usd-free') || 0,
      usdBank: getPrice('.price-usd-bank') || 0,
      eur: getPrice('.price-eur') || 0,
      aed: getPrice('.price-aed') || 0,
      usdt: getPrice('.price-usdt') || 0,
      btc: getPrice('.price-btc') || 0,
      eth: getPrice('.price-eth') || 0,
      gold18: getPrice('.price-gold-18') || 0,
      gold24: getPrice('.price-gold-24') || 0,
      silver: getPrice('.price-silver') || 0,
      coinEmami: getPrice('.price-coin-emami') || 0,
      coinBahar: getPrice('.price-coin-bahar') || 0,
      oil: getPrice('.price-oil') || 0,
      copper: getPrice('.price-copper') || 0,
    };
  } catch (error) {
    console.error('خطا در دریافت قیمت‌ها از TGJU:', error);
    throw error;
  }
}

/**
 * دریافت داده‌های صندوق‌های بورسی از فیپیران
 */
export async function fetchFundData(fundSymbol: string): Promise<{
  nav: number;
  navDate: string;
  totalAssets: number;
  units: number;
  premium: number;
  portfolio: Array<{ symbol: string; weight: number }>;
}> {
  try {
    const url = `https://fipiran.com/fund/${fundSymbol}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    });
    
    const $ = cheerio.load(response.data);
    
    // استخراج اطلاعات صندوق
    console.log(`دریافت داده‌های صندوق ${fundSymbol} از فیپیران...`);
    
    throw new Error('پیاده‌سازی کامل Parser فیپیران نیازمند بررسی ساختار فعلی سایت است.');
  } catch (error) {
    console.error(`خطا در دریافت داده‌های صندوق ${fundSymbol}:`, error);
    throw error;
  }
}

/**
 * دریافت داده‌های بازار آتی و اختیار معامله
 */
export async function fetchDerivativesData(symbol: string): Promise<{
  underlyingAsset: string;
  strikePrice: number;
  expirationDate: string;
  lastPrice: number;
  change: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  greeks?: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}> {
  try {
    const url = `${TSETMC_BASE_URL}/tse/data/DerivativesMarket.aspx?Symbol=${symbol}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });
    
    console.log(`دریافت داده‌های مشتقه برای ${symbol}...`);
    
    throw new Error('پیاده‌سازی کامل بازار مشتقه نیازمند دسترسی به API اختصاصی است.');
  } catch (error) {
    console.error(`خطا در دریافت داده‌های مشتقه برای ${symbol}:`, error);
    throw error;
  }
}
