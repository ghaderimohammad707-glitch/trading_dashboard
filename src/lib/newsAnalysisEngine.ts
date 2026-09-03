/**
 * News Analysis Engine for Iranian Stock Market
 * تحلیل اخبار و تأثیر آن بر سهام، بورس و فرابورس
 * 
 * این موتور اخبار را از منابع مختلف دریافت کرده و:
 * - طبقه‌بندی موضوعی (اقتصادی، سیاسی، بین‌المللی، صنعتی)
 * - تحلیل احساسات (مثبت/منفی/خنثی)
 * - شناسایی نمادهای مرتبط
 * - محاسبه امتیاز تأثیر بر هر نماد
 * - تولید سیگنال‌های خبری
 */

import type { Instrument } from "@/lib/clientFetch";
import type { CodalReport } from "@/lib/codalFetch";

export interface NewsItem {
  _id: string;
  title: string;
  summary?: string;
  source: string;
  url: string;
  publishedAt: number;
  category: NewsCategory;
  sentiment: SentimentResult;
  relatedSymbols: string[];
  impactScore: number; // 0-100
}

export type NewsCategory = 
  | "economic"      // اقتصادی
  | "political"     // سیاسی
  | "international" // بین‌المللی
  | "industrial"    // صنعتی
  | "market"        // بازار سرمایه
  | "company"       // شرکت‌ها
  | "commodity"     // کالا و ارز
  | "general";      // عمومی

export interface SentimentResult {
  label: "positive" | "negative" | "neutral";
  score: number; // -100 to +100
  confidence: number; // 0-1
}

export interface SymbolNewsImpact {
  symbol: string;
  instrument?: Instrument;
  newsCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  avgSentiment: number;
  maxImpact: number;
  recentNews: NewsItem[];
  signal: "buy" | "sell" | "hold";
  signalStrength: number;
}

// ═══════════════════════════════════════════════
//  Keywords for Category Classification
// ═══════════════════════════════════════════════

const ECONOMIC_KEYWORDS = [
  "تورم", "نرخ بهره", "سیاست پولی", "بانک مرکزی", "بودجه", "مالیات",
  "رشد اقتصادی", "GDP", "تولید ناخالص", "اقتصاد کلان", "نقدینگی",
  "ارز", "دلار", "یورو", "صرافی", "نرخ ارز", "بازار ارز",
  "طلا", "سکه", "فلزات گرانبها", "انس طلا",
  "نفت", "گاز", "انرژی", "نفت خام", "برنت", "اوپک", "قیمت نفت",
  "صادرات", "واردات", "تراز تجاری", "تعرفه", "محدودیت واردات",
  "تحریم", "تحریم‌ها", "محدودیت‌های بین‌المللی",
];

const POLITICAL_KEYWORDS = [
  "سیاسی", "دولت", "مجلس", "قانون", "وزیر", "رئیس جمهور",
  "انتخابات", "سیاست خارجی", "مذاکره", "برجام", "توافق",
  "تصویب", "لایحه", "مصوبه", "دستور", "اجرای", "سیاست‌گذاری",
  "رئیس", "مقام", "مسئول", "سخنگو", "بیانیه", "اعلام",
];

const INTERNATIONAL_KEYWORDS = [
  "بین‌الملل", "جهانی", "آمریکا", "اروپا", "چین", "روسیه", "آسیا",
  "خاورمیانه", "ارز جهانی", "نفت برنت", "طلای جهانی", "داوجونز",
  "S&P", "NASDAQ", "فارکس", "بازارهای جهانی", "وال استریت",
  "فدرال رزرو", "بانک مرکزی اروپا", "IMF", "World Bank",
  "جنگ تجاری", "تعرفه گمرکی", "صادرات جهانی", "قیمت‌های جهانی",
  "oil", "gold", "crude", "brent", "market", "stocks", "rally",
  "decline", "federal", "fed", "inflation", "recession", "trade war",
  "tariff", "sanction", "dollar", "euro", "yen", "reuters", "cnbc",
];

const INDUSTRIAL_KEYWORDS = [
  "صنعت", "تولید", "کارخانه", "خط تولید", "ظرفیت تولید", "تولیدی",
  "پتروشیمی", "فولاد", "سیمان", "مس", "آلومینیوم", "روی", "سرب",
  "خودرو", "خودروسازی", "قطعات خودرو", "ایران خودرو", "سایپا",
  "بانک", "بیمه", "مالی", "اعتباری", "وام", "سود سپرده",
  "بورس", "فرابورس", "شاخص کل", "هم وزن", "تالار معاملات",
  "صندوق", "ETF", "صندوق سرمایه‌گذاری", "درآمد ثابت", "طلا",
  "مسکن", "ساختمان", "عمران", "معدن", "کشاورزی", "غذایی",
  "دارو", "دارویی", "سلامت", "درمان", "تجهیزات پزشکی",
  "فناوری", "IT", "نرم‌افزار", "سخت‌افزار", "ارتباطات",
];

const MARKET_KEYWORDS = [
  "بورس", "فرابورس", "شاخص", "سهام", "معامله", "تالار", "کدال",
  "سود", "زیان", "سهامدار", "حقوقی", "حقیقی", "پرتفو", "صندوق",
  "اختیار", "قرارداد", "قیمت", "حجم", "ارزش", "صف", "عرضه", "تقاضا",
  "EPS", "P/E", "DPS", "مجمع", "تقسیم سود", "افزایش سرمایه",
  "تحلیل", "تکنیکال", "بنیادی", "سیگنال", "خرید", "فروش",
  "نوسان", "صف خرید", "صف فروش", "حجم مبنا", "بسته شدن",
];

const COMPANY_KEYWORDS = [
  "شرکت", "سهامی عام", "سهامی خاص", "مسئولیت محدود",
  "گزارش", "صورتمالی", "ترازنامه", "سود زیان", "جریان وجوه نقد",
  "افزایش سرمایه", "مجمع عمومی", "هیئت مدیره", "مدیرعامل",
  "پروژه", "طرح", "توسعه", "بهره‌برداری", "افتتاح", "کلنگ",
  "فروش", "درآمد", "ریال", "تومان", "میلیارد", "میلیون",
  "تولید", "فروش", "عملکرد", "آمار", "گزارش ماهانه", "کدال",
];

const COMMODITY_KEYWORDS = [
  "سکه", "طلا", "دلار", "یورو", "ارز", "نفت", "گاز", "مس", "روی", "آهن",
  "کالا", "کامودیتی", "بیت‌کوین", "ارز دیجیتال", "رمزارز",
  "بورس کالا", "بورس انرژی", "گواهی سپرده", "قرارداد آتی",
  "قیمت روز", "نرخ لحظه‌ای", "بازار آزاد", "متقه", "حباب",
];

// Positive and negative words for sentiment analysis
const POSITIVE_WORDS = [
  "رشد", "افزایش", "سود", "مثبت", "خوب", "عالی", "قوی", "بهبود",
  "صعود", "رکورد", "پیروزی", "موفقیت", "فرصت", "مناسب", "جذاب",
  "خرید", "تقاضا", "حمایت", "امیدوارکننده", "چشم‌انداز", "رشد",
  "جهش", "رکوردشکنی", "سبز", "مثبت", "بالا", "بیشتر", "بهتر",
  "رونق", "رونق گرفتن", "رشد اقتصادی", "سودآوری", "بازدهی",
  "ارزشمند", "زیرارزش", "فرصت سرمایه‌گذاری", "پتانسیل",
];

const NEGATIVE_WORDS = [
  "کاهش", "افت", "ضرر", "منفی", "بد", "ضعیف", "تضعیف",
  "نزول", "شکست", "ریسک", "خطر", "فروش", "عرضه", "نگران",
  "نامناسب", "سقوط", "بحران", "مشکل", "چالش", "ریزش",
  "قرمز", "پایین", "کمتر", "بدتر", "رکود", "رکود تورمی",
  "زیان", "زیان‌ده", "ورشکستگی", "اخراج", "توقف تولید",
  "تحریم", "محدودیت", "مشکل", "چالش", "نگرانی", "هشدار",
];

// ═══════════════════════════════════════════════
//  Symbol Extraction Patterns
// ═══════════════════════════════════════════════

const SYMBOL_PATTERNS = [
  // Pattern for Persian company names with stock symbol format
  /(?:نماد|سهم|شرکت)\s+([ا-ی]{3,8})/g,
  // Common stock symbols (3-6 characters)
  /\b([ا-ی]{3,6})\b/g,
  // Company names followed by common suffixes
  /([ا-ی]+(?:‌|\s)?(?:سهام|بورس|پتروشیمی|فولاد|سیمان|خودرو|بانک))\b/g,
];

// Known Iranian stock symbols for better matching
const KNOWN_SYMBOLS = new Set([
  "فولاد", "فملی", "خودرو", "خساپا", "شپنا", "شبندر", "شتران",
  "وبملت", "وتجارت", "وبصادر", "وپارس", "وغدیر", "تاپیکو",
  "پتروشیمی", "پارسان", "پترول", "زاگرس", "نوری", "جم",
  "سیمان", "سشرق", "سبهان", "سدشت", "سواهد", "سگروه",
  "دارو", "دالیا", "دارا", "دزهراوی", "دپیوند", "دعبید",
  "کگل", "کچاد", "ککاشان", "کباغ", "کسرام", "کفپوک",
  "آریا", "آلومینیوم", "ایران", "ایرانی", "ایرانیان",
]);

// ═══════════════════════════════════════════════
//  Main Analysis Functions
// ═══════════════════════════════════════════════

/**
 * Classify news category based on keywords
 */
export function classifyNewsCategory(title: string, summary: string = ""): NewsCategory {
  const text = `${title} ${summary}`.toLowerCase();
  
  const scores: Record<string, number> = {
    market: 0,
    economic: 0,
    political: 0,
    international: 0,
    industrial: 0,
    company: 0,
    commodity: 0,
  };
  
  // Count keyword matches for each category
  MARKET_KEYWORDS.forEach(kw => { if (text.includes(kw.toLowerCase())) scores.market += 2; });
  ECONOMIC_KEYWORDS.forEach(kw => { if (text.includes(kw.toLowerCase())) scores.economic += 2; });
  POLITICAL_KEYWORDS.forEach(kw => { if (text.includes(kw.toLowerCase())) scores.political += 2; });
  INTERNATIONAL_KEYWORDS.forEach(kw => { if (text.includes(kw.toLowerCase())) scores.international += 2; });
  INDUSTRIAL_KEYWORDS.forEach(kw => { if (text.includes(kw.toLowerCase())) scores.industrial += 1.5; });
  COMPANY_KEYWORDS.forEach(kw => { if (text.includes(kw.toLowerCase())) scores.company += 1.5; });
  COMMODITY_KEYWORDS.forEach(kw => { if (text.includes(kw.toLowerCase())) scores.commodity += 2; });
  
  // Find highest scoring category
  let maxScore = 0;
  let category: NewsCategory = "general";
  
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      category = cat as NewsCategory;
    }
  }
  
  // Minimum threshold for classification
  if (maxScore < 2) {
    return "general";
  }
  
  return category;
}

/**
 * Analyze sentiment of text using Persian keyword matching
 */
export function analyzeSentiment(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  
  let positiveCount = 0;
  let negativeCount = 0;
  let totalWords = 0;
  
  POSITIVE_WORDS.forEach(word => {
    if (lowerText.includes(word.toLowerCase())) {
      positiveCount++;
      totalWords++;
    }
  });
  
  NEGATIVE_WORDS.forEach(word => {
    if (lowerText.includes(word.toLowerCase())) {
      negativeCount++;
      totalWords++;
    }
  });
  
  if (totalWords === 0) {
    return { label: "neutral", score: 0, confidence: 0.3 };
  }
  
  const rawScore = ((positiveCount - negativeCount) / totalWords) * 100;
  const normalizedScore = Math.max(-100, Math.min(100, rawScore));
  
  let label: "positive" | "negative" | "neutral" = "neutral";
  if (normalizedScore > 15) label = "positive";
  else if (normalizedScore < -15) label = "negative";
  
  const confidence = Math.min(1, totalWords / 10); // More matches = higher confidence
  
  return {
    label,
    score: Math.round(normalizedScore),
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Extract related stock symbols from news text
 */
export function extractRelatedSymbols(title: string, summary: string = ""): string[] {
  const text = `${title} ${summary}`;
  const found = new Set<string>();
  
  // Check for known symbols directly in text
  KNOWN_SYMBOLS.forEach(symbol => {
    if (text.includes(symbol)) {
      found.add(symbol);
    }
  });
  
  // Use regex patterns to find potential symbols
  for (const pattern of SYMBOL_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const word = match[1];
      if (word && word.length >= 3 && word.length <= 6) {
        // Filter out common words
        if (!isCommonWord(word)) {
          found.add(word);
        }
      }
    }
  }
  
  return Array.from(found).slice(0, 10);
}

function isCommonWord(word: string): boolean {
  const commonWords = new Set([
    "و", "در", "با", "از", "به", "برای", "این", "آن", "که", "ها",
    "یک", "تا", "روی", "بین", "بعد", "قبل", "همه", "بیشتر", "کمتر",
    "است", "بود", "شد", "کرد", "گفت", "داد", "گرفت", "آمد", "رفت",
    "دارد", "باشد", "نیست", "هست", "می", "را", "هم", "نه", "بله",
  ]);
  return commonWords.has(word);
}

/**
 * Calculate impact score of news on a specific symbol
 */
export function calculateNewsImpact(
  news: NewsItem,
  symbol: string,
  instruments?: Instrument[]
): number {
  let impact = 0;
  
  // Base impact from sentiment
  impact += Math.abs(news.sentiment.score) * 0.3;
  
  // Boost if symbol is directly mentioned
  if (news.relatedSymbols.includes(symbol)) {
    impact += 20;
  }
  
  // Category-based impact
  const categoryBoosts: Record<NewsCategory, number> = {
    market: 15,
    company: 20,
    economic: 10,
    industrial: 12,
    commodity: 8,
    political: 5,
    international: 5,
    general: 2,
  };
  impact += categoryBoosts[news.category] || 0;
  
  // Recency boost (news within 24 hours)
  const hoursSincePublished = (Date.now() - news.publishedAt) / (1000 * 60 * 60);
  if (hoursSincePublished < 24) {
    impact += 10 * (1 - hoursSincePublished / 24);
  }
  
  // Source credibility
  const credibleSources = ["TSETMC", "کدال", "بورس نیوز", "دنیای اقتصاد"];
  if (credibleSources.some(s => news.source.includes(s))) {
    impact += 10;
  }
  
  return Math.min(100, Math.round(impact));
}

/**
 * Generate trading signal from news sentiment and impact
 */
export function generateNewsSignal(
  sentiment: SentimentResult,
  impactScore: number
): { signal: "buy" | "sell" | "hold"; strength: number } {
  const combinedScore = sentiment.score * (impactScore / 100);
  
  if (combinedScore > 30) {
    return { signal: "buy", strength: Math.min(100, combinedScore) };
  } else if (combinedScore < -30) {
    return { signal: "sell", strength: Math.min(100, Math.abs(combinedScore)) };
  } else {
    return { signal: "hold", strength: Math.abs(combinedScore) };
  }
}

/**
 * Analyze news for all instruments and generate impact report
 */
export function analyzeNewsForMarket(
  newsItems: NewsItem[],
  instruments: Instrument[],
  codalReports?: CodalReport[]
): SymbolNewsImpact[] {
  const impacts: Map<string, SymbolNewsImpact> = new Map();
  
  // Initialize map for all instruments
  instruments.forEach(inst => {
    impacts.set(inst.symbol, {
      symbol: inst.symbol,
      instrument: inst,
      newsCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      avgSentiment: 0,
      maxImpact: 0,
      recentNews: [],
      signal: "hold",
      signalStrength: 0,
    });
  });
  
  // Process each news item
  newsItems.forEach(news => {
    news.relatedSymbols.forEach(symbol => {
      const impact = impacts.get(symbol);
      if (!impact) return;
      
      impact.newsCount++;
      impact.recentNews.push(news);
      
      const newsImpact = calculateNewsImpact(news, symbol, instruments);
      if (newsImpact > impact.maxImpact) {
        impact.maxImpact = newsImpact;
      }
      
      // Update sentiment counts
      if (news.sentiment.label === "positive") {
        impact.positiveCount++;
      } else if (news.sentiment.label === "negative") {
        impact.negativeCount++;
      } else {
        impact.neutralCount++;
      }
      
      // Recalculate average sentiment
      const total = impact.positiveCount + impact.negativeCount + impact.neutralCount;
      impact.avgSentiment = ((impact.positiveCount - impact.negativeCount) / total) * 100;
      
      // Generate signal
      const signalResult = generateNewsSignal(
        { label: impact.avgSentiment > 0 ? "positive" : impact.avgSentiment < 0 ? "negative" : "neutral", 
          score: impact.avgSentiment, 
          confidence: 0.7 },
        impact.maxImpact
      );
      impact.signal = signalResult.signal;
      impact.signalStrength = signalResult.strength;
    });
  });
  
  // Filter to only symbols with news
  return Array.from(impacts.values())
    .filter(impact => impact.newsCount > 0)
    .sort((a, b) => b.maxImpact - a.maxImpact);
}

/**
 * Create a NewsItem from raw data
 */
export function createNewsItem(
  title: string,
  summary: string,
  source: string,
  url: string,
  publishedAt: number = Date.now()
): NewsItem {
  const category = classifyNewsCategory(title, summary);
  const sentiment = analyzeSentiment(`${title} ${summary}`);
  const relatedSymbols = extractRelatedSymbols(title, summary);
  
  // Calculate overall impact score
  let impactScore = 50; // Base score
  impactScore += Math.abs(sentiment.score) * 0.3;
  if (relatedSymbols.length > 0) impactScore += 20;
  if (category === "market" || category === "company") impactScore += 15;
  
  return {
    _id: `news-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title,
    summary,
    source,
    url,
    publishedAt,
    category,
    sentiment,
    relatedSymbols,
    impactScore: Math.min(100, Math.round(impactScore)),
  };
}

/**
 * Merge news with Codal reports for comprehensive analysis
 */
export function mergeNewsWithCodal(
  newsItems: NewsItem[],
  codalReports: CodalReport[]
): (NewsItem | CodalReport)[] {
  const allItems: Array<NewsItem | CodalReport> = [...newsItems];
  
  // Convert Codal reports to news-like format if needed
  codalReports.forEach(report => {
    // Only add if not already in news
    const exists = newsItems.some(n => n.url === report.url);
    if (!exists) {
      allItems.push(report);
    }
  });
  
  // Sort by publication date
  return allItems.sort((a, b) => {
    const timeA = 'publishedAt' in a ? a.publishedAt : a.publishDate;
    const timeB = 'publishedAt' in b ? b.publishedAt : b.publishDate;
    return timeB - timeA;
  });
}

export default {
  classifyNewsCategory,
  analyzeSentiment,
  extractRelatedSymbols,
  calculateNewsImpact,
  generateNewsSignal,
  analyzeNewsForMarket,
  createNewsItem,
  mergeNewsWithCodal,
};
