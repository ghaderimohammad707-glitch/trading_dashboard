import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Loader2, TrendingUp, TrendingDown, Minus, Building2, Globe, Landmark, Factory, ShoppingCart, Briefcase, Zap } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { classifyNewsCategory, extractRelatedSymbols, type NewsItem as AnalyzedNewsItem, type NewsCategory, type SentimentResult } from "@/lib/newsAnalysisEngine";
import { rssNewsService } from "@/lib/news/rssService";

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

interface NewsItem {
  _id: string;
  title: string;
  summary?: string;
  source: string;
  url: string;
  publishedAt: number;
  relatedSymbols?: string[];
  sentimentScore?: number;
}

type FilterType = "all" | "market" | "financial" | "company" | "political" | "international" | "industrial" | "commodity" | "positive" | "negative";

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
  { id: "all", label: "همه", icon: "📋" },
  { id: "market", label: "بازار سرمایه", icon: "📈" },
  { id: "financial", label: "اقتصادی", icon: "💰" },
  { id: "company", label: "شرکت‌ها", icon: "🏢" },
  { id: "political", label: "سیاسی", icon: "🏛️" },
  { id: "international", label: "بین‌المللی", icon: "🌍" },
  { id: "industrial", label: "صنعتی", icon: "🏭" },
  { id: "commodity", label: "کالا و ارز", icon: "🪙" },
  { id: "positive", label: "مثبت 📗", icon: "" },
  { id: "negative", label: "منفی 📕", icon: "" },
];

const MARKET_KEYWORDS = [
  "بورس", "فرابورس", "شاخص", "سهام", "معامل", "تالار", "کدال",
  "سود", "زیان", "سهامدار", "حقوقی", "حقیقی", "پرتفو", "صندوق",
  "اختیار", "قرارداد", "قیمت", "حجم", "ارزش", "صف", "عرضه", "تقاضا",
  "ETF", "آتی", "مشتقه", "تپیکا", "فولاد", "خودرو", "فملی",
];

const FINANCIAL_KEYWORDS = [
  "نرخ", "تورم", "ارز", "دلار", "سکه", "طلا", "نفت", "گاز",
  "بانک", "سیاست", "اقتصاد", "بودجه", "مالیات", "صادرات", "واردات",
  "GDP", "تولید", "صنعت", "تعرفه", "تحریم", "pta", "صادراتی",
];

const POLITICAL_KEYWORDS = [
  "سیاسی", "دولت", "مجلس", "قانون", ".DisplayMember", "وزیر",
  "رئیس", "انتخابات", "سیاست خارجی", "مذاکره", "برجام", "تسلیحات",
];

const INTERNATIONAL_KEYWORDS = [
  "بین‌الملل", "جهانی", "آمریکا", "اروپا", "چین", "آسیا",
  "ارز جهانی", "نفت برنت", "طلای جهانی", "دلار جهانی",
  // English keywords for international feeds
  "oil", "gold", "crude", "brent", "market", "stocks", "rally",
  "decline", "federal", "fed", "inflation", "recession", "trade war",
  "tariff", "sanction", "dollar", "euro", "yen", "reuters", "cnbc",
  "s&p", "nasdaq", "dow", "wall street", "treasury", "bond",
];

const INDUSTRIAL_KEYWORDS = [
  "صنعت", "تولید", "کارخانه", "صادرات", "واردات", "تعرفه", "تولیدی",
  "پتروشیمی", "فولاد", "سیمان", "مس", "آلومینیوم", "مسکن", "خودرو",
];

const COMMODITY_KEYWORDS = [
  "سکه", "طلا", "دلار", "یورو", "ارز", "نفت", "گاز", "مس", "روی", "آهن",
  "کالا", "کامودیتی", "بیت‌کوین", "ارز دیجیتال", "بانک مرکزی", "نرخ ارز",
];

/* ═══════════════════════════════════════════════════════
   Client-side news fetching (TSETMC RSS proxy)
   ═══════════════════════════════════════════════════════ */

async function fetchNewsClient(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  
  // Parallel fetch from multiple sources via proxy (domestic + international)
  const fetchPromises = [
    fetchTSETMCNews(),
    fetchTSETMCNewsHTML(),
    // ─── Domestic ───
    fetchRSS("/rss/irna", "ایرنا"),
    fetchRSS("/rss/tasnim", "تسنیم"),
    fetchRSS("/rss/mehr", "مهر"),
    fetchRSS("/rss/fars", "فارس"),
    fetchRSS("/rss/boursenews", "بورس‌نیوز"),
    fetchRSS("/rss/donya", "دنیای اقتصاد"),
    fetchRSS("/rss/eghtesadnews", "اقتصاد نیوز"),
    fetchRSS("/rss/shahrestock", "شهر بورس"),
    // ─── International ───
    fetchRSS("/rss/reuters", "Reuters"),
    fetchRSS("/rss/cnbc", "CNBC"),
    fetchRSS("/rss/marketwatch", "MarketWatch"),
    fetchRSS("/rss/yahoo", "Yahoo Finance"),
    fetchRSS("/rss/euronews", "Euronews"),
    fetchRSS("/rss/investing", "Investing.com"),
  ];
  
  const results = await Promise.allSettled(fetchPromises);
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      allItems.push(...result.value);
    }
  }
  
  // Deduplicate by title
  const seen = new Set<string>();
  const unique = allItems.filter(item => {
    const key = item.title.slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Sort by date (newest first)
  unique.sort((a, b) => b.publishedAt - a.publishedAt);
  
  if (unique.length > 0) return unique;
  return generateFallbackNews();
}

async function fetchRSS(proxyPath: string, sourceName: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(proxyPath, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseRSS(text, sourceName);
  } catch {
    return [];
  }
}

function parseRSS(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const titleRegex = /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i;
  const descRegex = /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i;
  const linkRegex = /<link[^>]*>([\s\S]*?)<\/link>/i;
  const pubDateRegex = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i;

  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 30) {
    const itemXml = match[1];
    const titleMatch = titleRegex.exec(itemXml);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    if (!title) continue;

    const descMatch = descRegex.exec(itemXml);
    const linkMatch = linkRegex.exec(itemXml);
    const pubMatch = pubDateRegex.exec(itemXml);

    const summary = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim().substring(0, 300) : "";
    const symbols = extractSymbols(title + " " + summary);
    const sentiment = analyzeSentiment(title + " " + summary);

    items.push({
      _id: `rss-${sourceName}-${items.length}-${Date.now()}`,
      title,
      summary: summary || undefined,
      source: sourceName,
      url: linkMatch ? linkMatch[1].trim() : "#",
      publishedAt: pubMatch ? new Date(pubMatch[1].trim()).getTime() : Date.now(),
      relatedSymbols: symbols.length > 0 ? symbols : undefined,
      sentimentScore: sentiment,
    });
  }
  return items;
}

async function fetchTSETMCNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch("/tsetmc-api/Loader.aspx?Partree=15131M&Id=0", {
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();

    if (!text.includes("<") || text.includes("<!doctype")) {
      throw new Error("Not XML/HTML news data");
    }

    const items: NewsItem[] = [];
    const titleRegex = /<title[^>]*>([^<]+)<\/title>/gi;
    const linkRegex = /<link[^>]*>([^<]+)<\/link>/gi;
    const descRegex = /<description[^>]*>([^<]+)<\/description>/gi;
    const pubDateRegex = /<pubDate[^>]*>([^<]+)<\/pubDate>/gi;

    const titles: string[] = [];
    const links: string[] = [];
    const descs: string[] = [];
    const dates: string[] = [];

    let match;
    while ((match = titleRegex.exec(text)) !== null) titles.push(match[1]);
    while ((match = linkRegex.exec(text)) !== null) links.push(match[1]);
    while ((match = descRegex.exec(text)) !== null) descs.push(match[1]);
    while ((match = pubDateRegex.exec(text)) !== null) dates.push(match[1]);

    for (let i = 0; i < Math.min(titles.length, 50); i++) {
      const title = titles[i] ?? "";
      if (!title || title.includes(" RSS") || title.includes("Channel")) continue;

      const desc = descs[i] ?? "";
      const symbols = extractSymbols(title + " " + desc);
      const sentiment = analyzeSentiment(title + " " + desc);

      items.push({
        _id: `news-${i}-${Date.now()}`,
        title,
        summary: desc || undefined,
        source: "TSETMC",
        url: links[i] ?? "#",
        publishedAt: dates[i] ? new Date(dates[i]).getTime() : Date.now(),
        relatedSymbols: symbols.length > 0 ? symbols : undefined,
        sentimentScore: sentiment,
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchTSETMCNewsHTML(): Promise<NewsItem[]> {
  try {
    const res = await fetch("/tsetmc-api/site/NewsSection.aspx?h=0&r=0", {
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    return parseHTMLNews(html);
  } catch {
    return [];
  }
}

function parseHTMLNews(html: string): NewsItem[] {
  const items: NewsItem[] = [];
  // Simple pattern extraction from TSETMC news HTML
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let idx = 0;

  while ((rowMatch = rowRegex.exec(html)) !== null && idx < 30) {
    const row = rowMatch[1];
    const titleMatch = row.match(/<td[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
    const linkMatch = row.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
    const dateMatch = row.match(/<td[^>]*>(\d{4}\/\d{2}\/\d{2})<\/td>/i);

    if (titleMatch) {
      const title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
      if (!title) continue;

      const symbols = extractSymbols(title);
      const sentiment = analyzeSentiment(title);

      items.push({
        _id: `html-news-${idx}`,
        title,
        source: "TSETMC",
        url: linkMatch ? `https://tsetmc.com${linkMatch[1]}` : "#",
        publishedAt: dateMatch ? new Date(dateMatch[1]).getTime() : Date.now(),
        relatedSymbols: symbols.length > 0 ? symbols : undefined,
        sentimentScore: sentiment,
      });
      idx++;
    }
  }
  return items;
}

function extractSymbols(text: string): string[] {
  const symbolPatterns = [
    /(?:نماد|سهم)\s+([\u0600-\u06FF]{2,8})/g,
    /\b([\u0600-\u06FF]{2,6})\b/g,
  ];
  const found = new Set<string>();
  const commonWords = new Set([
    "و", "در", "با", "از", "به", "برای", "این", "آن", "که", "ها",
    "یک", "تا", "روی", "بین", "بعد", "قبل", "همه", "بیشتر", "کمتر",
  ]);

  for (const pattern of symbolPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const word = match[1];
      if (word && !commonWords.has(word) && word.length >= 2) {
        found.add(word);
      }
    }
  }
  return Array.from(found).slice(0, 5);
}

function analyzeSentiment(text: string): number {
  const positive = ["رشد", "افزایش", "سود", "مثبت", "صعود", "جهش", "بهبود", "рекорд", "بالا"];
  const negative = ["کاهش", "افت", "زیان", "منفی", "سقوط", "ریزش", "بحران", "پایین", "نگران"];

  let score = 0;
  for (const w of positive) if (text.includes(w)) score += 0.2;
  for (const w of negative) if (text.includes(w)) score -= 0.2;
  return Math.max(-1, Math.min(1, score));
}

function generateFallbackNews(): NewsItem[] {
  const now = Date.now();
  return [
    { _id: "fallback-1", title: "بازار سهام ایران منتظر تصمیمات جدید سیاستگذار", summary: "شاخص کل بورس در معاملات امروز با نوسانات اندکی همراه بود.", source: "نبض بازار", url: "#", publishedAt: now - 3600000 },
    { _id: "fallback-2", title: "افزایش نرخ ارز در بازار آزاد", summary: "دلار آمریکا در معاملات امروز با افزایش قیمت همراه بود.", source: "نبض بازار", url: "#", publishedAt: now - 7200000 },
    { _id: "fallback-3", title: "قیمت طلا و سکه در بازار امروز", summary: "طلا و سکه با نوسان قیمتی در بازار معامله شدند.", source: "نبض بازار", url: "#", publishedAt: now - 10800000 },
    { _id: "fallback-4", title: "گزارش عملکرد شرکت‌های بورسی در فصل پاییز", summary: "شرکت‌های بزرگ عملکرد متفاوتی را در فصل پاییز ثبت کردند.", source: "نبض بازار", url: "#", publishedAt: now - 14400000 },
    { _id: "fallback-5", title: "سیاست‌های پولی بانک مرکزی و تأثیر بر بازار سرمایه", summary: "تصمیمات بانک مرکزی تأثیر مستقیمی بر بازار سرمایه داشته است.", source: "نبض بازار", url: "#", publishedAt: now - 18000000 },
    { _id: "fallback-6", title: "_ppdex: نوسانات بازار ارز و تأثیر آن بر صنایع صادراتی", summary: "تغییرات نرخ ارز تأثیر قابل توجهی بر صنایع صادراتی داشته است.", source: "نبض بازار", url: "#", publishedAt: now - 21600000 },
  ];
}

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */

export function NewsTab() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [fetched, setFetched] = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(300); // 5 min in seconds

  const loadNews = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const items = await fetchNewsClient();
      setNews(items);
      setFetched(true);
      console.log(`[NewsTab] Loaded ${items.length} news items`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    if (!fetched) {
      void loadNews();
    }
  }, []);

  // Auto-refresh timer: refresh every 5 minutes silently
  useEffect(() => {
    if (!autoRefresh || !fetched) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 300;
        return prev - 1;
      });
    }, 1000);

    const refreshInterval = setInterval(() => {
      console.log("[NewsTab] Auto-refreshing news...");
      void loadNews(true);
      setCountdown(300);
    }, 300000); // 5 minutes

    return () => {
      clearInterval(countdownInterval);
      clearInterval(refreshInterval);
    };
  }, [autoRefresh, fetched]);

  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      if (filter === "all") return true;
      const text = `${item.title} ${item.summary ?? ""} ${item.source}`;

      if (filter === "market") {
        return (
          MARKET_KEYWORDS.some((k) => text.includes(k)) ||
          (item.relatedSymbols && item.relatedSymbols.length > 0)
        );
      }
      if (filter === "financial") {
        return FINANCIAL_KEYWORDS.some((k) => text.includes(k));
      }
      if (filter === "company") {
        return item.relatedSymbols && item.relatedSymbols.length > 0;
      }
      if (filter === "political") {
        return POLITICAL_KEYWORDS.some((k) => text.includes(k));
      }
      if (filter === "international") {
        return INTERNATIONAL_KEYWORDS.some((k) => text.includes(k));
      }
      if (filter === "industrial") {
        return INDUSTRIAL_KEYWORDS.some((k) => text.includes(k));
      }
      if (filter === "commodity") {
        return COMMODITY_KEYWORDS.some((k) => text.includes(k));
      }
      if (filter === "positive") {
        return (item.sentimentScore ?? 0) > 0.1;
      }
      if (filter === "negative") {
        return (item.sentimentScore ?? 0) < -0.1;
      }
      return true;
    });
  }, [news, filter]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">اخبار بازار</h2>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-muted/50 text-muted-foreground border border-border/30",
            )}
          >
            <span className={cn("size-1.5 rounded-full", autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30")} />
            {autoRefresh ? `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, "0")}` : "خودکار خاموش"}
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void loadNews(); setCountdown(300); }}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileText className="size-3.5" />
            )}
            بروزرسانی
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        فیلتر اخبار مرتبط با بازار سرمایه، اقتصاد، سیاست و بین‌الملل
      </p>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
              filter === f.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      <span className="text-xs text-muted-foreground">
        {filteredNews.length} خبر {filter !== "all" ? "فیلتر شده" : ""}
      </span>

      {/* News list */}
      {loading && news.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border bg-card py-20 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> در حال بارگذاری اخبار...
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="rounded-xl border bg-card py-20 text-center text-sm text-muted-foreground">
          خبری مطابق فیلتر یافت نشد.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredNews.map((item) => (
            <a
              key={item._id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {item.source}
                </span>
                <div className="flex items-center gap-2">
                  {item.relatedSymbols &&
                    item.relatedSymbols.length > 0 && (
                      <div className="flex gap-1">
                        {item.relatedSymbols.slice(0, 3).map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="px-1.5 text-[10px]"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  {item.sentimentScore !== undefined &&
                    item.sentimentScore !== 0 && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          item.sentimentScore > 0
                            ? "text-up border-up/30"
                            : "text-down border-down/30",
                        )}
                      >
                        {item.sentimentScore > 0 ? "+" : ""}
                        {item.sentimentScore.toFixed(2)}
                      </Badge>
                    )}
                </div>
              </div>
              <span className="text-sm font-medium leading-6">
                {item.title}
              </span>
              {item.summary && (
                <span className="text-xs leading-5 text-muted-foreground line-clamp-2">
                  {item.summary}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
