/**
 * فاز ۳: هوش مصنوعی و تحلیل چندلایه
 * ماژول شبیه‌سازی تحلیل سنتیمنت اخبار (News Sentiment Analysis)
 * 
 * هدف: ارزیابی تاثیر اخبار کلی بازار بر سیگنال‌ها
 */

export type SentimentScore = -100 | -75 | -50 | -25 | 0 | 25 | 50 | 75 | 100;
export type SentimentCategory = 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' | 'VERY_POSITIVE';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: Date;
  category: 'ECONOMIC' | 'POLITICAL' | 'COMPANY' | 'GLOBAL' | 'SECTOR';
  rawSentiment?: number; // -1 تا 1
}

export interface SentimentAnalysis {
  overallScore: number; // -100 تا 100
  category: SentimentCategory;
  confidence: number; // 0-100
  newsCount: number;
  breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  impactOnMarket: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  reasoning: string[];
}

export interface SentimentConfig {
  lookbackDays: number;
  minNewsCount: number;
  weights: {
    ECONOMIC: number;
    POLITICAL: number;
    COMPANY: number;
    GLOBAL: number;
    SECTOR: number;
  };
}

const DEFAULT_CONFIG: SentimentConfig = {
  lookbackDays: 7,
  minNewsCount: 3,
  weights: {
    ECONOMIC: 1.2,
    POLITICAL: 1.0,
    COMPANY: 0.8,
    GLOBAL: 0.9,
    SECTOR: 1.1
  }
};

/**
 * تبدیل نمره خام به دسته‌بندی
 */
function categorizeSentiment(score: number): SentimentCategory {
  if (score >= 75) return 'VERY_POSITIVE';
  if (score >= 25) return 'POSITIVE';
  if (score >= -25) return 'NEUTRAL';
  if (score >= -75) return 'NEGATIVE';
  return 'VERY_NEGATIVE';
}

/**
 * تبدیل نمره خام به امتیاز 0-100
 */
function scoreToConfidence(score: number): number {
  return Math.abs(score);
}

/**
 * تحلیل یک خبر تکی
 */
export function analyzeSingleNews(news: NewsItem): {
  sentiment: number;
  confidence: number;
  keywords: string[];
} {
  const titleLower = news.title.toLowerCase();
  
  // کلمات کلیدی مثبت
  const positiveKeywords = [
    'رشد', 'افزایش', 'سود', 'مثبت', 'خوب', 'بهتر', 'پیشرفت', 'موفقیت',
    'رکورد', 'جهش', 'رونق', 'فرصت', 'امیدوارکننده', 'قوی', 'برتر',
    'bullish', 'growth', 'profit', 'gain', 'success', 'positive', 'strong'
  ];
  
  // کلمات کلیدی منفی
  const negativeKeywords = [
    'کاهش', 'ضرر', 'منفی', 'بد', 'بدتر', 'شکست', 'مشکل', 'بحران',
    'ریزش', 'سقوط', 'خطر', 'هشدار', 'ضعیف', 'افت', 'زیان',
    'bearish', 'loss', 'decline', 'crisis', 'problem', 'negative', 'weak', 'fall'
  ];
  
  let positiveCount = 0;
  let negativeCount = 0;
  const foundKeywords: string[] = [];
  
  for (const keyword of positiveKeywords) {
    if (titleLower.includes(keyword)) {
      positiveCount++;
      foundKeywords.push(keyword);
    }
  }
  
  for (const keyword of negativeKeywords) {
    if (titleLower.includes(keyword)) {
      negativeCount++;
      foundKeywords.push(keyword);
    }
  }
  
  // محاسبه نمره اولیه
  const totalWords = positiveCount + negativeCount;
  let sentiment = 0;
  
  if (totalWords > 0) {
    sentiment = ((positiveCount - negativeCount) / totalWords) * 100;
  }
  
  // اعمال وزن بر اساس دسته‌بندی خبر
  const weight = DEFAULT_CONFIG.weights[news.category] || 1.0;
  sentiment *= weight;
  
  // محدود کردن به بازه -100 تا 100
  sentiment = Math.max(-100, Math.min(100, sentiment));
  
  // محاسبه اعتماد بر اساس تعداد کلمات کلیدی
  const confidence = Math.min(100, totalWords * 20);
  
  return {
    sentiment: parseFloat(sentiment.toFixed(0)),
    confidence: parseFloat(confidence.toFixed(0)),
    keywords: foundKeywords
  };
}

/**
 * تحلیل مجموعه اخبار
 */
export function analyzeNewsSentiment(
  newsItems: NewsItem[],
  config: SentimentConfig = DEFAULT_CONFIG
): SentimentAnalysis {
  const reasoning: string[] = [];
  
  if (newsItems.length === 0) {
    return {
      overallScore: 0,
      category: 'NEUTRAL',
      confidence: 0,
      newsCount: 0,
      breakdown: { positive: 0, neutral: 0, negative: 0 },
      trend: 'STABLE',
      impactOnMarket: 'NEUTRAL',
      reasoning: ['هیچ خبری برای تحلیل وجود ندارد']
    };
  }
  
  // فیلتر اخبار بر اساس بازه زمانی
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - config.lookbackDays * 24 * 60 * 60 * 1000);
  const filteredNews = newsItems.filter(n => n.publishedAt >= cutoffDate);
  
  if (filteredNews.length < config.minNewsCount) {
    reasoning.push(`تعداد اخبار (${filteredNews.length}) کمتر از حداقل (${config.minNewsCount}) است`);
  }
  
  // تحلیل تک‌تک اخبار
  let totalSentiment = 0;
  let totalWeight = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;
  
  const sentiments: { score: number; weight: number; date: Date }[] = [];
  
  for (const news of filteredNews) {
    const analysis = analyzeSingleNews(news);
    const weight = config.weights[news.category] || 1.0;
    
    totalSentiment += analysis.sentiment * weight;
    totalWeight += weight;
    
    if (analysis.sentiment > 10) positiveCount++;
    else if (analysis.sentiment < -10) negativeCount++;
    else neutralCount++;
    
    sentiments.push({
      score: analysis.sentiment,
      weight,
      date: news.publishedAt
    });
  }
  
  // محاسبه میانگین وزنی
  const overallScore = totalWeight > 0 ? totalSentiment / totalWeight : 0;
  const normalizedScore = Math.max(-100, Math.min(100, overallScore));
  
  // محاسبه اعتماد بر اساس تنوع و تعداد اخبار
  const diversityFactor = Math.min(1, filteredNews.length / 10);
  const categoryCount = new Set(filteredNews.map(n => n.category)).size;
  const categoryFactor = Math.min(1, categoryCount / 3);
  
  const baseConfidence = scoreToConfidence(normalizedScore);
  const confidence = baseConfidence * diversityFactor * categoryFactor;
  
  // تعیین روند
  let trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING' = 'STABLE';
  if (sentiments.length >= 3) {
    const recentAvg = sentiments.slice(0, Math.floor(sentiments.length / 2))
      .reduce((sum, s) => sum + s.score, 0) / Math.floor(sentiments.length / 2);
    const olderAvg = sentiments.slice(Math.floor(sentiments.length / 2))
      .reduce((sum, s) => sum + s.score, 0) / (sentiments.length - Math.floor(sentiments.length / 2));
    
    if (recentAvg > olderAvg + 10) trend = 'IMPROVING';
    else if (recentAvg < olderAvg - 10) trend = 'DETERIORATING';
  }
  
  // تعیین تاثیر بر بازار
  let impactOnMarket: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (normalizedScore > 25) impactOnMarket = 'BULLISH';
  else if (normalizedScore < -25) impactOnMarket = 'BEARISH';
  
  // تولید دلایل
  reasoning.push(`تحلیل ${filteredNews.length} خبر در ${config.lookbackDays} روز گذشته`);
  reasoning.push(`امتیاز کلی: ${normalizedScore.toFixed(0)} از 100`);
  reasoning.push(`اخبار مثبت: ${positiveCount}، خنثی: ${neutralCount}، منفی: ${negativeCount}`);
  
  if (trend === 'IMPROVING') {
    reasoning.push('روند سنتیمنت در حال بهبود است');
  } else if (trend === 'DETERIORATING') {
    reasoning.push('روند سنتیمنت در حال بدتر شدن است');
  }
  
  if (impactOnMarket === 'BULLISH') {
    reasoning.push('تاثیر کلی اخبار بر بازار: صعودی');
  } else if (impactOnMarket === 'BEARISH') {
    reasoning.push('تاثیر کلی اخبار بر بازار: نزولی');
  } else {
    reasoning.push('تاثیر کلی اخبار بر بازار: خنثی');
  }
  
  return {
    overallScore: parseFloat(normalizedScore.toFixed(0)),
    category: categorizeSentiment(normalizedScore),
    confidence: parseFloat(confidence.toFixed(0)),
    newsCount: filteredNews.length,
    breakdown: {
      positive: positiveCount,
      neutral: neutralCount,
      negative: negativeCount
    },
    trend,
    impactOnMarket,
    reasoning
  };
}

/**
 * تعدیل سیگنال بر اساس سنتیمنت اخبار
 */
export function adjustSignalBySentiment(
  signalType: 'BUY' | 'SELL' | 'HOLD',
  signalConfidence: number,
  sentimentAnalysis: SentimentAnalysis
): {
  adjustedConfidence: number;
  passed: boolean;
  reason: string;
  newSignalType?: 'BUY' | 'SELL' | 'HOLD';
} {
  // اگر سیگنال HOLD باشد، تغییر نمی‌کند
  if (signalType === 'HOLD') {
    return {
      adjustedConfidence: 100,
      passed: true,
      reason: 'سیگنال HOLD تحت تاثیر سنتیمنت قرار نمی‌گیرد'
    };
  }
  
  const sentimentImpact = sentimentAnalysis.overallScore / 100;
  let adjustedConfidence = signalConfidence;
  
  // اگر سیگنال خرید باشد و اخبار منفی باشد
  if (signalType === 'BUY') {
    if (sentimentAnalysis.impactOnMarket === 'BEARISH') {
      adjustedConfidence *= (1 - Math.abs(sentimentImpact) * 0.5);
      return {
        adjustedConfidence: parseFloat(adjustedConfidence.toFixed(0)),
        passed: adjustedConfidence >= 50,
        reason: `اخبار منفی (امتیاز: ${sentimentAnalysis.overallScore}) اعتماد به سیگنال خرید را کاهش داد`,
        newSignalType: adjustedConfidence < 30 ? 'HOLD' : 'BUY'
      };
    } else if (sentimentAnalysis.impactOnMarket === 'BULLISH') {
      adjustedConfidence = Math.min(100, adjustedConfidence * (1 + sentimentImpact * 0.3));
      return {
        adjustedConfidence: parseFloat(adjustedConfidence.toFixed(0)),
        passed: true,
        reason: `اخبار مثبت (امتیاز: ${sentimentAnalysis.overallScore}) اعتماد به سیگنال خرید را افزایش داد`,
        newSignalType: 'BUY'
      };
    }
  }
  
  // اگر سیگنال فروش باشد و اخبار مثبت باشد
  if (signalType === 'SELL') {
    if (sentimentAnalysis.impactOnMarket === 'BULLISH') {
      adjustedConfidence *= (1 - Math.abs(sentimentImpact) * 0.5);
      return {
        adjustedConfidence: parseFloat(adjustedConfidence.toFixed(0)),
        passed: adjustedConfidence >= 50,
        reason: `اخبار مثبت (امتیاز: ${sentimentAnalysis.overallScore}) اعتماد به سیگنال فروش را کاهش داد`,
        newSignalType: adjustedConfidence < 30 ? 'HOLD' : 'SELL'
      };
    } else if (sentimentAnalysis.impactOnMarket === 'BEARISH') {
      adjustedConfidence = Math.min(100, adjustedConfidence * (1 + Math.abs(sentimentImpact) * 0.3));
      return {
        adjustedConfidence: parseFloat(adjustedConfidence.toFixed(0)),
        passed: true,
        reason: `اخبار منفی (امتیاز: ${sentimentAnalysis.overallScore}) اعتماد به سیگنال فروش را افزایش داد`,
        newSignalType: 'SELL'
      };
    }
  }
  
  return {
    adjustedConfidence: parseFloat(adjustedConfidence.toFixed(0)),
    passed: true,
    reason: 'سنتیمنت اخبار خنثی است - تغییری اعمال نشد',
    newSignalType: signalType
  };
}

/**
 * تولید داده‌های اخبار تستی
 */
export function generateMockNews(days: number = 7): NewsItem[] {
  const news: NewsItem[] = [];
  const categories: Array<NewsItem['category']> = ['ECONOMIC', 'POLITICAL', 'COMPANY', 'GLOBAL', 'SECTOR'];
  
  const positiveTitles = [
    'رشد اقتصادی کشور ادامه دارد',
    'سود شرکت‌های بورسی افزایش یافت',
    'بازار سرمایه روند مثبت گرفت',
    'رکورد جدید در شاخص کل بورس',
    'چشم‌انداز مثبت اقتصاد ایران'
  ];
  
  const negativeTitles = [
    'کاهش شاخص کل بورس تهران',
    'هشدار کارشناسان درباره ریسک‌های بازار',
    'زیان دهی برخی صنایع بزرگ',
    'بحران جهانی بر بازار اثر گذاشت',
    'افت قیمت دلار نیما'
  ];
  
  const neutralTitles = [
    'برگزاری مجمع عمومی شرکت‌ها',
    'گزارش ماهانه شرکت‌ها منتشر شد',
    'تغییرات جزئی در شاخص کل',
    'انتظارات بازار برای هفته آینده',
    'بررسی وضعیت صنایع مختلف'
  ];
  
  const now = new Date();
  
  for (let i = 0; i < days * 3; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const rand = Math.random();
    let title: string;
    let rawSentiment: number;
    
    if (rand < 0.33) {
      title = positiveTitles[Math.floor(Math.random() * positiveTitles.length)];
      rawSentiment = 0.3 + Math.random() * 0.7;
    } else if (rand < 0.66) {
      title = negativeTitles[Math.floor(Math.random() * negativeTitles.length)];
      rawSentiment = -0.3 - Math.random() * 0.7;
    } else {
      title = neutralTitles[Math.floor(Math.random() * neutralTitles.length)];
      rawSentiment = -0.1 + Math.random() * 0.2;
    }
    
    const publishedAt = new Date(now.getTime() - i * 8 * 60 * 60 * 1000);
    
    news.push({
      id: `news-${i}`,
      title,
      source: 'خبرگزاری بورس',
      publishedAt,
      category,
      rawSentiment
    });
  }
  
  return news;
}

export default {
  analyzeSingleNews,
  analyzeNewsSentiment,
  adjustSignalBySentiment,
  generateMockNews
};
