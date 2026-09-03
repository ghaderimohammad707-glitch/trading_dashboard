/**
 * گاهینامه اقتصادی بازار ایران
 * تاریخ‌های مهم: مجمع، افزایش سرمایه، انتشار گزارش
 * 
 * نسخه واقعی: دریافت داده‌ها از TSETMC و Codal API
 * توجه: در صورت عدم دسترسی به APIها، پیام مناسب نمایش داده می‌شود
 */

export interface CalendarEvent {
  id: string;
  date: string;          // شمسی YYYY/MM/DD
  title: string;
  category: "meeting" | "capital_increase" | "report" | "holiday" | "ipo" | "delisting" | "split";
  symbols?: string[];
  description: string;
  importance: "high" | "medium" | "low";
  source?: "tsetmc" | "codal";
  publishDate?: number;
}

// کش محلی برای رویدادها
let _cachedEvents: CalendarEvent[] = [];
let _lastFetchTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 دقیقه

/**
 * تبدیل تاریخ میلادی به شمسی
 */
function toJalali(date: Date): string {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1;
  const gDay = date.getDate();
  
  const jalali = gregorianToJalali(gYear, gMonth, gDay);
  return `${jalali[0]}/${String(jalali[1]).padStart(2, '0')}/${String(jalali[2]).padStart(2, '0')}`;
}

function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let jm = 0;
  let jd = 0;
  for (let i = 0; i < 11; i++) {
    const v = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30][i];
    if (days < v) {
      jm = i + 1;
      jd = days + 1;
      break;
    }
    days -= v;
  }
  
  if (jm === 0) {
    jm = 12;
    jd = days + 1;
  }
  
  return [jy, jm, jd];
}

/**
 * استخراج نماد از نام شرکت در TSETMC
 */
function extractSymbolFromName(name: string): string | undefined {
  const patterns = [
    /^([آ-ی۰-۹a-zA-Z]+)\s*-\)/,
    /شرکت\s+([^\s-]+)/,
    /سهامی\s+([^\s-]+)/,
    /\(([آ-ی۰-۹a-zA-Z]+)\)/,
  ];
  
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match && match[1]) {
      const symbol = match[1].trim();
      if (symbol.length >= 3) {
        return symbol;
      }
    }
  }
  
  return undefined;
}

/**
 * تعیین اهمیت رویداد بر اساس نوع آن
 */
function determineImportance(category: CalendarEvent['category'], title: string): 'high' | 'medium' | 'low' {
  const t = title.toLowerCase();
  
  if (category === 'capital_increase') return 'high';
  if (category === 'ipo') return 'high';
  if (t.includes('مجمع عمومی سالانه')) return 'high';
  if (t.includes('افزایش سرمایه')) return 'high';
  if (t.includes('پذیرش')) return 'high';
  
  if (category === 'meeting') return 'medium';
  if (category === 'report') return 'medium';
  if (t.includes('سود') || t.includes('eps')) return 'medium';
  
  return 'low';
}

/**
 * دریافت رویدادها از API واقعی TSETMC
 */
async function fetchFromTSETMC(): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  
  try {
    const response = await fetch('https://service.tsetmc.com/tsev2/data/TseClientData.aspx?type=AllShareState', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    
    if (!response.ok) {
      console.warn('[economicCalendar] TSETMC API returned non-OK status:', response.status);
      return [];
    }
    
    const data = await response.text();
    const lines = data.split('\n');
    const now = new Date();
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      if (parts.length < 5) continue;
      
      const symbol = parts[1]?.trim();
      const name = parts[2]?.trim();
      const status = parts[3]?.trim();
      
      if (!symbol || !name) continue;
      
      if (status && status.includes('مجمع')) {
        events.push({
          id: `tse-meeting-${symbol}-${Date.now()}`,
          date: toJalali(now),
          title: `مجمع عمومی ${name}`,
          category: 'meeting',
          symbols: [symbol],
          description: `برگزاری مجمع عمومی برای ${name}`,
          importance: determineImportance('meeting', name),
          source: 'tsetmc',
          publishDate: now.getTime(),
        });
      }
      
      if (status && status.includes('بسته')) {
        events.push({
          id: `tse-closed-${symbol}-${Date.now()}`,
          date: toJalali(now),
          title: `نماد ${symbol} متوقف شد`,
          category: 'delisting',
          symbols: [symbol],
          description: `معاملات نماد ${symbol} به دلیل ${status} متوقف شده است`,
          importance: 'high',
          source: 'tsetmc',
          publishDate: now.getTime(),
        });
      }
    }
    
    console.log(`[economicCalendar] ✅ TSETMC: ${events.length} events fetched`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('[economicCalendar] TSETMC API failed:', msg);
  }
  
  return events;
}

/**
 * دریافت رویدادها از API کدال
 */
async function fetchFromCodal(): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  
  try {
    const response = await fetch(
      'https://api.codal.ir/api/v2/notification/list?category=-1&page=1&size=30',
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    
    if (!response.ok) {
      console.warn('[economicCalendar] Codal API returned non-OK status:', response.status);
      return [];
    }
    
    const data = await response.json() as {
      letters?: Array<{
        Title?: string;
        SentDateTime?: string;
        CompanyName?: string;
        Symbol?: string;
        InsCode?: string;
      }>;
    };
    
    if (!data.letters || data.letters.length === 0) {
      return [];
    }
    
    for (const letter of data.letters) {
      const title = letter.Title || '';
      if (!title) continue;
      
      const pubDate = letter.SentDateTime ? new Date(letter.SentDateTime) : new Date();
      const symbol = letter.Symbol || extractSymbolFromName(title);
      
      let category: CalendarEvent['category'] = 'report';
      if (title.includes('مجمع')) category = 'meeting';
      else if (title.includes('افزایش سرمایه')) category = 'capital_increase';
      else if (title.includes('عرضه اولیه') || title.includes('پذیرش')) category = 'ipo';
      else if (title.includes('حذف')) category = 'delisting';
      else if (title.includes('تقسیم')) category = 'split';
      
      events.push({
        id: `codal-${letter.InsCode || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: toJalali(pubDate),
        title,
        category,
        symbols: symbol ? [symbol] : undefined,
        description: `${letter.CompanyName || ''} — ${title}`,
        importance: determineImportance(category, title),
        source: 'codal',
        publishDate: pubDate.getTime(),
      });
    }
    
    console.log(`[economicCalendar] ✅ Codal: ${events.length} events fetched`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('[economicCalendar] Codal API failed:', msg);
  }
  
  return events;
}

/**
 * تولید رویدادهای پیش‌فرض (fallback) - حذف شده
 * این تابع دیگر استفاده نمی‌شود زیرا داده‌های ساختگی مجاز نیستند
 */

/**
 * دریافت رویدادهای upcoming با اولویت:
 * 1. TSETMC API
 * 2. Codal API
 * 3. نمایش پیام خالی در صورت عدم دسترسی
 */
export async function getUpcomingEvents(forceRefresh = false): Promise<CalendarEvent[]> {
  if (!forceRefresh && _cachedEvents.length > 0 && Date.now() - _lastFetchTime < CACHE_TTL) {
    console.log(`[economicCalendar] ✅ Cache valid (${_cachedEvents.length} events)`);
    return _cachedEvents;
  }
  
  console.log('[economicCalendar] Fetching events from real APIs...');
  
  const [tsetmcEvents, codalEvents] = await Promise.all([
    fetchFromTSETMC(),
    fetchFromCodal(),
  ]);
  
  let allEvents = [...tsetmcEvents, ...codalEvents];
  
  // حذف fallback events - اگر داده‌ای نبود، آرایه خالی برگردان
  if (allEvents.length === 0) {
    console.log('[economicCalendar] ⚠️ No events available from APIs');
    _cachedEvents = [];
    _lastFetchTime = Date.now();
    return [];
  }
  
  const uniqueEvents = allEvents.filter(
    (event, index, self) => index === self.findIndex(e => e.id === event.id)
  );
  
  const sortedEvents = uniqueEvents.sort((a, b) => {
    const importanceOrder = { high: 0, medium: 1, low: 2 };
    const impDiff = importanceOrder[a.importance] - importanceOrder[b.importance];
    if (impDiff !== 0) return impDiff;
    return a.date.localeCompare(b.date);
  });
  
  _cachedEvents = sortedEvents;
  _lastFetchTime = Date.now();
  
  console.log(`[economicCalendar] ✅ Total: ${sortedEvents.length} events`);
  return sortedEvents;
}

export function getEventsByCategory(events: CalendarEvent[], category: string): CalendarEvent[] {
  if (category === 'all') return events;
  return events.filter((e) => e.category === category);
}

export function getEventsByImportance(events: CalendarEvent[], importance: string): CalendarEvent[] {
  if (importance === 'all') return events;
  return events.filter((e) => e.importance === importance);
}

export function getEventsForSymbol(events: CalendarEvent[], symbol: string): CalendarEvent[] {
  return events.filter((e) => e.symbols?.includes(symbol));
}

export const EVENT_CATEGORIES = [
  { id: 'all', label: 'همه', icon: '📅' },
  { id: 'meeting', label: 'مجمع', icon: '🏛️' },
  { id: 'capital_increase', label: 'افزایش سرمایه', icon: '📈' },
  { id: 'report', label: 'گزارش', icon: '📋' },
  { id: 'holiday', label: 'تعطیلات', icon: '🎌' },
  { id: 'ipo', label: 'عرضه اولیه', icon: '🆕' },
  { id: 'delisting', label: 'حذف نماد', icon: '❌' },
  { id: 'split', label: 'تقسیم سهام', icon: '✂️' },
] as const;

export function clearEventsCache(): void {
  _cachedEvents = [];
  _lastFetchTime = 0;
}
