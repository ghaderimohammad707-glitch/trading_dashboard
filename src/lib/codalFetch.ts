/**
 * Codal.ir Data — اتصال واقعی به API کدال از طریق Vite Proxy
 * 
 * این ماژول از proxy کدال در vite.config.ts استفاده می‌کند تا مشکل CORS را حل کند
 */

import type { Instrument } from "@/lib/clientFetch";

export interface CodalReport {
  _id: string;
  symbol?: string;
  title: string;
  publishDate: number;
  reportType: string;
  url: string;
  summary?: string;
  impactScore?: number;
  source: "codal" | "generated" | "processed";
  financialData?: FinancialStatement;
}

export interface FinancialStatement {
  totalAssets?: number;
  currentAssets?: number;
  nonCurrentAssets?: number;
  totalLiabilities?: number;
  currentLiabilities?: number;
  longTermLiabilities?: number;
  shareholdersEquity?: number;
  revenue?: number;
  grossProfit?: number;
  operatingProfit?: number;
  netProfit?: number;
  eps?: number;
  operatingCashFlow?: number;
  investingCashFlow?: number;
  financingCashFlow?: number;
  freeCashFlow?: number;
  roe?: number;
  roa?: number;
  debtToEquity?: number;
  currentRatio?: number;
  grossMargin?: number;
  netMargin?: number;
  reportPeriod?: string;
  currency?: string;
  auditorOpinion?: string;
}

let _cachedCodal: CodalReport[] = [];
let _lastFetchTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function getCachedCodal(): CodalReport[] {
  return _cachedCodal;
}

/**
 * دریافت گزارش‌های کدال از طریق proxy
 */
export async function fetchCodalClient(
  instruments?: Instrument[],
): Promise<{ count: number; source: string; error?: string }> {
  // Check cache
  if (_cachedCodal.length > 0 && Date.now() - _lastFetchTime < CACHE_TTL) {
    console.log(`[codalFetch] ✅ Cache valid (${_cachedCodal.length} reports)`);
    return { count: _cachedCodal.length, source: "cache" };
  }

  try {
    console.log("[codalFetch] Fetching from Codal API via proxy...");
    
    // Use vite proxy for codal
    const response = await fetch('/codal-api/api/v2/notification/list?category=-1&page=1&size=50', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as {
      letters?: Array<{
        Id?: string;
        Title?: string;
        SentDateTime?: string;
        CompanyName?: string;
        Symbol?: string;
        InsCode?: string;
        LetterCode?: string;
      }>;
    };

    if (!data.letters || data.letters.length === 0) {
      console.log("[codalFetch] ⚠️ No reports found");
      return { count: 0, source: "codal", error: "گزارشی یافت نشد" };
    }

    const reports = data.letters.map((letter) => {
      const pubDate = letter.SentDateTime ? new Date(letter.SentDateTime) : new Date();
      
      return {
        _id: letter.Id || `codal-${Date.now()}-${Math.random()}`,
        symbol: letter.Symbol,
        title: letter.Title || 'بدون عنوان',
        publishDate: pubDate.getTime(),
        reportType: letter.LetterCode || 'general',
        url: `https://www.codal.ir/Reports/Decision.aspx?LetterId=${letter.Id}`,
        summary: `${letter.CompanyName || ''} — ${letter.Title || ''}`,
        source: 'codal' as const,
      };
    }).filter((r) => r.title !== 'بدون عنوان');

    _cachedCodal = reports.sort((a, b) => b.publishDate - a.publishDate);
    _lastFetchTime = Date.now();

    console.log(`[codalFetch] ✅ Successfully fetched ${reports.length} reports from Codal`);
    return { count: reports.length, source: "codal" };

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[codalFetch] ❌ Error fetching Codal data:', msg);
    
    _cachedCodal = [];
    _lastFetchTime = Date.now();
    
    return { 
      count: 0, 
      source: "error", 
      error: `خطا در دریافت اطلاعات کدال: ${msg}` 
    };
  }
}

export { getCachedCodal as default };
