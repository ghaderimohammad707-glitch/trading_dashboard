/**
 * RSS News Service for Iranian Financial News
 * Fetches news from multiple Persian sources using Vite proxies
 */

interface NewsItem {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
}

interface RSSFeed {
  name: string;
  proxyPath: string;
  enabled: boolean;
}

const PERSIAN_NEWS_SOURCES: RSSFeed[] = [
  {
    name: 'ایرنا',
    proxyPath: '/rss/irna',
    enabled: true,
  },
  {
    name: 'تسنیم',
    proxyPath: '/rss/tasnim',
    enabled: true,
  },
  {
    name: 'مهر',
    proxyPath: '/rss/mehr',
    enabled: true,
  },
  {
    name: 'فارس',
    proxyPath: '/rss/fars',
    enabled: true,
  },
  {
    name: 'بورس نیوز',
    proxyPath: '/rss/boursenews',
    enabled: true,
  },
  {
    name: 'دنیای اقتصاد',
    proxyPath: '/rss/donya',
    enabled: true,
  },
  {
    name: 'اقتصاد نیوز',
    proxyPath: '/rss/eghtesadnews',
    enabled: true,
  },
  {
    name: 'شهر سهام',
    proxyPath: '/rss/shahrestock',
    enabled: true,
  },
];

// Persian positive/negative words for sentiment analysis
const POSITIVE_WORDS = [
  'رشد', 'افزایش', 'سود', 'مثبت', 'خوب', 'عالی', 'قوی', 'بهبود',
  'صعود', 'رکورد', 'پیروزی', 'موفقیت', 'فرصت', 'مناسب', 'جذاب',
  'خرید', 'تقاضا', 'حمایت', 'امیدوارکننده', 'چشم‌انداز',
];

const NEGATIVE_WORDS = [
  'کاهش', 'افت', 'ضرر', 'منفی', 'بد', 'ضعیف', 'تضعیف',
  'نزول', 'شکست', 'ریسک', 'خطر', 'فروش', 'عرضه', 'نگران',
  'نامناسب', 'سقوط', 'بحران', 'مشکل', 'چالش',
];

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Retry wrapper for fetch operations with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`[RSS] Retrying ${url}, ${retries} attempts left...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (MAX_RETRIES - retries + 1)));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export class RSSNewsService {
  /**
   * Fetch news from all enabled RSS sources
   */
  async fetchAllNews(): Promise<NewsItem[]> {
    const allNews: NewsItem[] = [];

    for (const source of PERSIAN_NEWS_SOURCES) {
      if (!source.enabled) continue;

      try {
        const response = await fetchWithRetry(source.proxyPath);
        const xmlText = await response.text();
        const items = this.parseRSS(xmlText, source.name);
        allNews.push(...items);
        console.log(`[RSS] ✅ Fetched ${items.length} items from ${source.name}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[RSS] ❌ Error fetching ${source.name}:`, msg);
      }
    }

    // Sort by published date (newest first)
    return allNews.sort((a, b) => b.publishedAt - a.publishedAt);
  }

  /**
   * Parse RSS XML text into NewsItem array
   */
  private parseRSS(xmlText: string, sourceName: string): NewsItem[] {
    const items: NewsItem[] = [];
    
    if (!xmlText || xmlText.trim().length === 0) {
      console.warn(`[RSS] Empty XML from ${sourceName}`);
      return items;
    }

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.warn(`[RSS] XML parse error for ${sourceName}`);
        return items;
      }

      const entries = xmlDoc.querySelectorAll('item, entry');

      entries.forEach((entry) => {
        const titleEl = entry.querySelector('title');
        const descriptionEl = entry.querySelector('description, summary');
        const linkEl = entry.querySelector('link');
        const pubDateEl = entry.querySelector('pubDate');

        const title = titleEl?.textContent?.trim() || '';
        const description = descriptionEl?.textContent?.trim() || '';
        
        let link = linkEl?.textContent?.trim() || '';
        if (!link && linkEl?.getAttribute('href')) {
          link = linkEl.getAttribute('href') || '';
        }
        
        const pubDateStr = pubDateEl?.textContent?.trim() || '';

        // Skip items without title
        if (!title) return;

        // Clean up summary (remove HTML tags)
        const summary = description.replace(/<[^>]*>/g, '').substring(0, 200);

        items.push({
          title,
          summary,
          source: sourceName,
          url: link.startsWith('http') ? link : `https://${link}`,
          publishedAt: pubDateStr ? new Date(pubDateStr).getTime() : Date.now(),
        });
      });
    } catch (error) {
      console.error(`[RSS] Parse error for ${sourceName}:`, error);
    }

    return items;
  }

  /**
   * Analyze sentiment of a text using Persian keyword matching
   */
  analyzeSentiment(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; score: number } {
    const lowerText = text.toLowerCase();
    
    let positiveCount = 0;
    let negativeCount = 0;

    POSITIVE_WORDS.forEach(word => {
      if (lowerText.includes(word)) positiveCount++;
    });

    NEGATIVE_WORDS.forEach(word => {
      if (lowerText.includes(word)) negativeCount++;
    });

    const total = positiveCount + negativeCount;
    if (total === 0) {
      return { sentiment: 'neutral', score: 0 };
    }

    const score = ((positiveCount - negativeCount) / total) * 100;
    
    if (score > 20) {
      return { sentiment: 'positive', score: Math.round(score) };
    } else if (score < -20) {
      return { sentiment: 'negative', score: Math.round(score) };
    } else {
      return { sentiment: 'neutral', score: Math.round(score) };
    }
  }

  /**
   * Get news with sentiment analysis
   */
  async getNewsWithSentiment(limit: number = 20): Promise<NewsItem[]> {
    const news = await this.fetchAllNews();
    
    return news.slice(0, limit).map(item => ({
      ...item,
      ...this.analyzeSentiment(item.title + ' ' + item.summary),
    }));
  }

  /**
   * Search news by keyword
   */
  async searchNews(keyword: string, limit: number = 10): Promise<NewsItem[]> {
    const allNews = await this.fetchAllNews();
    
    const filtered = allNews.filter(item => 
      item.title.toLowerCase().includes(keyword.toLowerCase()) || 
      item.summary.toLowerCase().includes(keyword.toLowerCase())
    );

    return filtered.slice(0, limit).map(item => ({
      ...item,
      ...this.analyzeSentiment(item.title + ' ' + item.summary),
    }));
  }
}

export const rssNewsService = new RSSNewsService();
