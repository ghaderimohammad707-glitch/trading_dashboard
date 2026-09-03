/**
 * Client-side data fetching from TSETMC CDN API.
 * Uses IndexedDB for high-performance storage (replaces localStorage).
 * Smart cache: instruments 30min, codal 1hr, commodities 5min.
 */

import {
  STORES,
  saveInstruments as idbSaveInstruments,
  getInstruments as idbGetInstruments,
  getAll,
  putAll,
  isCacheValid,
  setCacheTimestamp,
} from "./idb";

type SegmentType = "tse" | "ifb" | "fund" | "option" | "commodity";

export type { SegmentType };

export const SEGMENT_BY_VALUE: Record<SegmentType, { label: string; color: string }> = {
  tse: { label: "بورس", color: "bg-blue-500" },
  ifb: { label: "فرابورس", color: "bg-purple-500" },
  fund: { label: "صندوق", color: "bg-green-500" },
  option: { label: "اختیار معامله", color: "bg-orange-500" },
  commodity: { label: "کالا", color: "bg-yellow-500" },
};

export const STATUS_LABEL: Record<Instrument["status"], string> = {
  open: "مجاز",
  closed: "متوقف",
  allowed: "مجاز",
  halted: "متوقف",
};

export interface Instrument {
  _id: string;
  symbol: string;
  name: string;
  segment: SegmentType;
  category?: string;
  last: number;
  close: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  volume: number;
  value: number;
  tradeCount: number;
  status: "open" | "closed" | "allowed" | "halted";
  rawInsCode: string;
  pe?: number;
  marketCap?: number;
  eps?: number;
  optionType?: "call" | "put";
  strike?: number;
  expiry?: string;
  openInterest?: number;
  baseAsset?: string;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  nav?: number;
  bestBuy1?: number;
  bestBuyVol1?: number;
  bestSell1?: number;
  bestSellVol1?: number;
  bestBuy2?: number;
  bestBuyVol2?: number;
  bestSell2?: number;
  bestSellVol2?: number;
  bestBuy3?: number;
  bestBuyVol3?: number;
  bestSell3?: number;
  bestSellVol3?: number;
  bestBuy4?: number;
  bestBuyVol4?: number;
  bestSell4?: number;
  bestSellVol4?: number;
  bestBuy5?: number;
  bestBuyVol5?: number;
  bestSell5?: number;
  bestSellVol5?: number;
  yesterday?: number;
  realBuyVolume?: number;
  realSellVolume?: number;
  legalBuyVolume?: number;
  legalSellVolume?: number;
  realBuyCount?: number;
  realSellCount?: number;
  legalBuyCount?: number;
  legalSellCount?: number;
  buyQueueVolume?: number;
  sellQueueVolume?: number;
  buyQueueCount?: number;
  sellQueueCount?: number;
  maxPrice?: number;
  minPrice?: number;
  expectedPrice?: number;
  floatShares?: number;
  totalShares?: number;
  baseVolume?: number;
  unit?: string;
}

/* ═══════════════════════════════════════════════════════
   Smart Cache: TTL per data type
   ═══════════════════════════════════════════════════════ */
const CACHE_TTL = {
  instruments: 30 * 60 * 1000, // 30 minutes
  commodities: 5 * 60 * 1000, // 5 minutes
  codal: 60 * 60 * 1000, // 1 hour
} as const;

/* ═══════════════════════════════════════════════════════
   In-memory cache (fast path)
   ═══════════════════════════════════════════════════════ */
let _cachedInstruments: Instrument[] = [];
let _initialized = false;

/** Load from IndexedDB on first access (async, non-blocking) */
async function ensureLoaded(): Promise<void> {
  if (_initialized) return;
  try {
    const stored = await idbGetInstruments<Instrument>();
    if (stored.length > 0) {
      _cachedInstruments = stored;
      console.log(`[clientFetch] Loaded ${stored.length} instruments from IndexedDB`);
    }
  } catch {
    // Fallback: try localStorage
    try {
      const raw = localStorage.getItem("nabz_instruments");
      if (raw) {
        _cachedInstruments = JSON.parse(raw);
        console.log(`[clientFetch] Loaded ${_cachedInstruments.length} instruments from localStorage fallback`);
        // Migrate to IndexedDB
        await idbSaveInstruments(_cachedInstruments);
      }
    } catch {}
  }
  _initialized = true;
}

export function getCachedInstruments(): Instrument[] {
  return _cachedInstruments;
}

/** Check if market data cache is still valid */
export async function isMarketCacheValid(): Promise<boolean> {
  return isCacheValid("instruments", CACHE_TTL.instruments);
}

/** Check if commodities cache is still valid */
export async function isCommoditiesCacheValid(): Promise<boolean> {
  return isCacheValid("commodities", CACHE_TTL.commodities);
}

/* ═══════════════════════════════════════════════════════
   Segment Classification
   ═══════════════════════════════════════════════════════ */
function classifyInstrument(
  symbol: string,
  name: string,
  vc: number,
): SegmentType {
  if (
    symbol.startsWith("ض") ||
    symbol.startsWith("ط") ||
    symbol.startsWith("م") ||
    (vc >= 1000 && vc < 2000)
  ) {
    return "option";
  }

  if (
    name.includes("صندوق") ||
    name.includes("سرمایه‌گذاری") ||
    name.includes("ETF") ||
    name.includes("سهامی") ||
    name.includes("طلا") ||
    name.includes("درآمد ثابت")
  ) {
    return "fund";
  }

  if (vc >= 1 && vc <= 2) return "tse";
  if (vc >= 3 && vc <= 9) return "ifb";

  return "tse";
}

/* ═══════════════════════════════════════════════════════
   Parse TSETMC MarketWatch response
   ═══════════════════════════════════════════════════════ */
function parseMarketWatch(data: Record<string, unknown>[]): Instrument[] {
  const instruments: Instrument[] = [];
  const vcCounts: Record<number, number> = {};

  for (const item of data) {
    const symbol = String(item.lva ?? "");
    const name = String(item.lvc ?? symbol);
    if (!symbol) continue;

    const last = Number(item.pcl ?? item.pDrCotVal ?? 0);
    const py = Number(item.py ?? 0);
    const high = Number(item.pmx ?? 0);
    const low = Number(item.pmn ?? 0);
    const open = Number(item.pmo ?? 0);
    const volume = Number(item.qtc ?? 0);
    const trades = Number(item.ztt ?? 0);
    const change = Number(item.pc ?? 0);
    const changePct = Number(item.pcpc ?? 0);
    const vc = Number(item.vc ?? 1);
    const value = Number(item.qTotCap ?? 0);
    const pe = Number(item.pe ?? 0);
    const eps = Number(item.eps ?? 0);
    const insCode = String(item.insCode ?? "");

    vcCounts[vc] = (vcCounts[vc] || 0) + 1;

    if (last <= 0 && volume <= 0 && py <= 0) continue;

    const segment = classifyInstrument(symbol, name, vc);

    let optionType: "call" | "put" | undefined;
    let baseAsset: string | undefined;
    let strike: number | undefined;
    let expiry: string | undefined;

    if (segment === "option") {
      if (name.includes("اختيارخ") || symbol.includes("ض")) {
        optionType = "call";
      } else if (name.includes("اختيارف") || symbol.includes("ط")) {
        optionType = "put";
      } else {
        optionType = "call";
      }

      const strikeMatch = name.match(/(\d[\d,]*)/);
      if (strikeMatch) {
        strike = Number(strikeMatch[1].replace(/,/g, ""));
      }
      const dateMatch = name.match(/(\d{4}\/\d{2}\/\d{2})/);
      if (dateMatch) {
        expiry = dateMatch[1];
      }
      const baseMatch = name.match(/^(.+?)[\-\s]/);
      if (baseMatch) {
        baseAsset = baseMatch[1];
      }
    }

    let status: Instrument["status"] = "open";
    if (last <= 0) status = "closed";

    const blDs = item.blDs as Record<string, unknown>[] | undefined;
    let bestBuy1: number | undefined;
    let bestBuyVol1: number | undefined;
    let bestSell1: number | undefined;
    let bestSellVol1: number | undefined;
    let bestBuy2: number | undefined;
    let bestBuyVol2: number | undefined;
    let bestSell2: number | undefined;
    let bestSellVol2: number | undefined;
    let bestBuy3: number | undefined;
    let bestBuyVol3: number | undefined;
    let bestSell3: number | undefined;
    let bestSellVol3: number | undefined;
    let bestBuy4: number | undefined;
    let bestBuyVol4: number | undefined;
    let bestSell4: number | undefined;
    let bestSellVol4: number | undefined;
    let bestBuy5: number | undefined;
    let bestBuyVol5: number | undefined;
    let bestSell5: number | undefined;
    let bestSellVol5: number | undefined;

    if (blDs && blDs.length > 0) {
      for (let lvl = 0; lvl < Math.min(blDs.length, 5); lvl++) {
        const bd = blDs[lvl];
        const bidP = Number(bd?.pmd ?? 0);
        const bidV = Number(bd?.qmd ?? 0);
        const askP = Number(bd?.pmo ?? 0);
        const askV = Number(bd?.qmo ?? 0);
        if (lvl === 0) { bestBuy1 = bidP || undefined; bestBuyVol1 = bidV || undefined; bestSell1 = askP || undefined; bestSellVol1 = askV || undefined; }
        else if (lvl === 1) { bestBuy2 = bidP || undefined; bestBuyVol2 = bidV || undefined; bestSell2 = askP || undefined; bestSellVol2 = askV || undefined; }
        else if (lvl === 2) { bestBuy3 = bidP || undefined; bestBuyVol3 = bidV || undefined; bestSell3 = askP || undefined; bestSellVol3 = askV || undefined; }
        else if (lvl === 3) { bestBuy4 = bidP || undefined; bestBuyVol4 = bidV || undefined; bestSell4 = askP || undefined; bestSellVol4 = askV || undefined; }
        else if (lvl === 4) { bestBuy5 = bidP || undefined; bestBuyVol5 = bidV || undefined; bestSell5 = askP || undefined; bestSellVol5 = askV || undefined; }
      }
    }
    if (!bestBuy1) {
      const topBid = Number(item.pmd ?? 0);
      const topAsk = Number(item.pmo ?? 0);
      if (topBid > 0) bestBuy1 = topBid;
      if (topAsk > 0) bestSell1 = topAsk;
      const topBidVol = Number(item.qtj ?? 0);
      if (topBidVol > 0) bestBuyVol1 = topBidVol;
      const topAskVol = Number(item.pf ?? 0);
      if (topAskVol > 0) bestSellVol1 = topAskVol;
    }

    // Real/Legal volume data (حقیقی/حقوقی)
    const realBuyVol = Number(item.qdtyJ ?? item.real_Buy_Volume ?? 0);
    const realSellVol = Number(item.qotJ ?? item.real_Sell_Volume ?? 0);
    const legalBuyVol = Number(item.qdtyH ?? item.legal_Buy_Volume ?? 0);
    const legalSellVol = Number(item.qotH ?? item.legal_Sell_Volume ?? 0);
    const realBuyCnt = Number(item.zdtyJ ?? 0);
    const realSellCnt = Number(item.ztj ?? 0);
    const legalBuyCnt = Number(item.zdtyH ?? 0);
    const legalSellCnt = Number(item.zth ?? 0);

    // Queue volumes (حجم صف)
    const buyQueueVol = Number(item.qTooVal ?? 0);
    const sellQueueVol = Number(item.qToaVal ?? 0);
    const buyQueueCnt = Number(item.zTooVal ?? 0);
    const sellQueueCnt = Number(item.zToaVal ?? 0);

    // Price limits
    const maxP = Number(item.pmax ?? 0);
    const minP = Number(item.pmin ?? 0);
    const expectedP = Number(item.pClosing ?? 0);
    const floatSh = Number(item.flo ?? 0);
    const totalSh = Number(item.cs ?? 0);
    const baseVol = Number(item.BaseVol ?? 0);

    instruments.push({
      _id: insCode || symbol,
      symbol,
      name,
      segment,
      last,
      close: last || py,
      open: open || 0,
      high: high || last || py,
      low: low || last || py,
      change,
      changePercent: changePct,
      volume,
      value,
      tradeCount: trades,
      status,
      rawInsCode: insCode,
      pe: pe || undefined,
      eps: eps || undefined,
      optionType,
      strike,
      expiry,
      baseAsset,
      yesterday: py || undefined,
      bestBuy1, bestBuyVol1, bestSell1, bestSellVol1,
      bestBuy2, bestBuyVol2, bestSell2, bestSellVol2,
      bestBuy3, bestBuyVol3, bestSell3, bestSellVol3,
      bestBuy4, bestBuyVol4, bestSell4, bestSellVol4,
      bestBuy5, bestBuyVol5, bestSell5, bestSellVol5,
      realBuyVolume: realBuyVol || undefined,
      realSellVolume: realSellVol || undefined,
      legalBuyVolume: legalBuyVol || undefined,
      legalSellVolume: legalSellVol || undefined,
      realBuyCount: realBuyCnt || undefined,
      realSellCount: realSellCnt || undefined,
      legalBuyCount: legalBuyCnt || undefined,
      legalSellCount: legalSellCnt || undefined,
      buyQueueVolume: buyQueueVol || undefined,
      sellQueueVolume: sellQueueVol || undefined,
      buyQueueCount: buyQueueCnt || undefined,
      sellQueueCount: sellQueueCnt || undefined,
      maxPrice: maxP || undefined,
      minPrice: minP || undefined,
      expectedPrice: expectedP || undefined,
      floatShares: floatSh || undefined,
      totalShares: totalSh || undefined,
      baseVolume: baseVol || undefined,
    });
  }

  console.log("[clientFetch] VC distribution:", vcCounts);
  return instruments;
}

/* ═══════════════════════════════════════════════════════
   Fetch Market Data
   ═══════════════════════════════════════════════════════ */
/**
 * TSETMC API endpoints — try multiple in order.
 * Some ISPs block certain CDN IPs; rotating helps.
 */
const TSETMC_ENDPOINTS = [
  { proxy: "/tsetmc-api", label: "CDN" },
  { proxy: "/tsetmc-api-v2", label: "Mirror" },
] as const;

/**
 * Network health state — persisted across fetches
 */
let _networkStatus: {
  tsetmc: "ok" | "degraded" | "down";
  lastCheck: number;
  lastSuccess: number;
  consecutiveFailures: number;
} = {
  tsetmc: "ok",
  lastCheck: 0,
  lastSuccess: 0,
  consecutiveFailures: 0,
};

export function getNetworkStatus() {
  return { ..._networkStatus };
}

/**
 * Try fetching from multiple TSETMC endpoints.
 * Returns the first successful response or throws the last error.
 */
async function fetchWithFallback(path: string, timeoutMs = 30000): Promise<string> {
  let lastError: Error | null = null;

  for (const ep of TSETMC_ENDPOINTS) {
    try {
      const url = `${ep.proxy}${path}`;
      console.log(`[clientFetch] Trying ${ep.label}: ${url}`);
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      const text = await res.text();

      if (text.startsWith("{") || text.startsWith("[")) {
        console.log(`[clientFetch] ✅ ${ep.label} succeeded: ${text.length} bytes`);
        _networkStatus.tsetmc = "ok";
        _networkStatus.lastSuccess = Date.now();
        _networkStatus.consecutiveFailures = 0;
        return text;
      }

      throw new Error(`${ep.label}: Not JSON`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[clientFetch] ⚠️ ${TSETMC_ENDPOINTS[TSETMC_ENDPOINTS.indexOf(ep)].label} failed:`, lastError.message);
    }
  }

  _networkStatus.consecutiveFailures++;
  if (_networkStatus.consecutiveFailures >= 3) {
    _networkStatus.tsetmc = "down";
  } else {
    _networkStatus.tsetmc = "degraded";
  }
  _networkStatus.lastCheck = Date.now();

  throw lastError || new Error("All TSETMC endpoints failed");
}

export async function fetchAllMarketDataClient(): Promise<{
  tseCount: number;
  ifbCount: number;
  fundCount: number;
  indexCount: number;
  optionCount: number;
  error?: string;
}> {
  await ensureLoaded();

  // Check smart cache first (use even stale cache if network is down)
  const cacheValid = await isMarketCacheValid();
  if (cacheValid && _cachedInstruments.length > 0) {
    console.log(`[clientFetch] ✅ Market cache valid (${_cachedInstruments.length} instruments)`);
    const tseCount = _cachedInstruments.filter((i) => i.segment === "tse").length;
    const ifbCount = _cachedInstruments.filter((i) => i.segment === "ifb").length;
    const fundCount = _cachedInstruments.filter((i) => i.segment === "fund").length;
    const optionCount = _cachedInstruments.filter((i) => i.segment === "option").length;
    return { tseCount, ifbCount, fundCount, indexCount: 0, optionCount };
  }

  // If cache is stale but we have data AND network is down, use stale cache
  if (_cachedInstruments.length > 0 && _networkStatus.tsetmc === "down") {
    console.log(`[clientFetch] ⚠️ Network down — using stale cache (${_cachedInstruments.length} instruments)`);
    const tseCount = _cachedInstruments.filter((i) => i.segment === "tse").length;
    const ifbCount = _cachedInstruments.filter((i) => i.segment === "ifb").length;
    const fundCount = _cachedInstruments.filter((i) => i.segment === "fund").length;
    const optionCount = _cachedInstruments.filter((i) => i.segment === "option").length;
    return { tseCount, ifbCount, fundCount, indexCount: 0, optionCount };
  }

  console.log("[clientFetch] ===== Starting TSETMC fetch =====");

  try {
    const path =
      "/api/ClosingPrice/GetMarketWatch?market=0" +
      "&paperTypes[0]=1&paperTypes[1]=2&paperTypes[2]=3&paperTypes[3]=4" +
      "&paperTypes[4]=5&paperTypes[5]=6&paperTypes[6]=7&paperTypes[7]=8" +
      "&withBestLimits=false&hEven=0&RefID=0";

    const text = await fetchWithFallback(path, 30000);
    if (!text.startsWith("{") && !text.startsWith("[")) {
      throw new Error("Not JSON - got HTML instead");
    }

    const json = JSON.parse(text);
    let data: Record<string, unknown>[] = [];
    const keys = Object.keys(json);
    if (keys.length === 1 && Array.isArray(json[keys[0]])) {
      data = json[keys[0]];
    } else if (Array.isArray(json)) {
      data = json;
    }

    if (data.length === 0) throw new Error("No data in response");

    console.log(`[clientFetch] Raw items: ${data.length}`);
    if (data[0]) {
      console.log(`[clientFetch] First item vc=${data[0].vc}, symbol=${data[0].lva}, name=${data[0].lvc}`);
    }

    const instruments = parseMarketWatch(data);
    console.log(`[clientFetch] ✅ Parsed ${instruments.length} instruments`);

    // Save to IndexedDB (async, non-blocking)
    _cachedInstruments = instruments;
    idbSaveInstruments(instruments).catch(() => {
      // Fallback to localStorage
      try { localStorage.setItem("nabz_instruments", JSON.stringify(instruments)); } catch {}
    });

    // All data stored locally — no Convex sync needed

    const tseCount = instruments.filter((i) => i.segment === "tse").length;
    const ifbCount = instruments.filter((i) => i.segment === "ifb").length;
    const fundCount = instruments.filter((i) => i.segment === "fund").length;
    const optionCount = instruments.filter((i) => i.segment === "option").length;

    return { tseCount, ifbCount, fundCount, indexCount: 0, optionCount };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[clientFetch] ❌ FAILED:", error);
    return {
      tseCount: 0,
      ifbCount: 0,
      fundCount: 0,
      indexCount: 0,
      optionCount: 0,
      error,
    };
  }
}

/* ═══════════════════════════════════════════════════════
   Fetch Commodities (TGJU)
   ═══════════════════════════════════════════════════════ */
export async function fetchCommoditiesClient(): Promise<{ count: number; error?: string }> {
  await ensureLoaded();
  console.log("[clientFetch] ===== Starting commodities fetch (scrape TGJU website) =====");

  try {
    // TGJU API requires auth — scrape the website directly
    const res = await fetch("https://www.tgju.org/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();

    // Map: nameslug → display name + unit
    const slugMap: Record<string, { name: string; unit: string }> = {
      "sekee": { name: "سکه امامی", unit: "ریال" },
      "sekeb": { name: "سکه بهار آزادی", unit: "ریال" },
      "nim": { name: "نیم سکه", unit: "ریال" },
      "rob": { name: "ربع سکه", unit: "ریال" },
      "geram18": { name: "طلای ۱۸ عیار", unit: "ریال" },
      "geram24": { name: "طلای ۲۴ عیار", unit: "ریال" },
      "mesghal": { name: "مثقال طلا", unit: "ریال" },
      "ons": { name: "انس جهانی طلا", unit: "دلار" },
      "silver": { name: "نقره", unit: "دلار" },
      "platinum": { name: "پلاتین", unit: "دلار" },
      "palladium": { name: "پالادیوم", unit: "دلار" },
      "oil_brent": { name: "نفت برنت", unit: "دلار" },
      "price_dollar_rl": { name: "دلار آمریکا", unit: "ریال" },
      "price_eur": { name: "یورو", unit: "ریال" },
      "price_gbp": { name: "پوند انگلیس", unit: "ریال" },
      "price_aed": { name: "درهم امارات", unit: "ریال" },
      "price_cny": { name: "یوان چین", unit: "ریال" },
      "price_jpy": { name: "ین ژاپن", unit: "ریال" },
    };

    // Extract price from each <tr> with data-market-nameslug + data-price
    const commodities: Instrument[] = [];
    const trRegex = /<tr[^>]*data-market-nameslug="([^"]*)"[^>]*>/g;
    let trMatch;
    while ((trMatch = trRegex.exec(html)) !== null) {
      const slug = trMatch[1];
      if (!slugMap[slug] || commodities.some((c) => c.rawInsCode === slug)) continue;
      // Find data-price within the next 2000 chars of this tr
      const afterTr = html.substring(trMatch.index, trMatch.index + 2000);
      const priceMatch = afterTr.match(/data-price="([^"]+)"/);
      if (!priceMatch) continue;
      const priceStr = priceMatch[1].replace(/,/g, "");
      const price = Number(priceStr);
      if (price <= 0) continue;
      const meta = slugMap[slug];
      commodities.push({
        _id: `commodity-${slug}`,
        symbol: meta.name,
        name: meta.name,
        segment: "commodity",
        last: price,
        close: price,
        open: 0,
        high: price,
        low: price,
        change: 0,
        changePercent: 0,
        volume: 0,
        value: 0,
        tradeCount: 0,
        status: "open",
        rawInsCode: slug,
      });
    }
    if (commodities.length > 0) {
      // Remove old commodities and add new ones
      _cachedInstruments = [
        ..._cachedInstruments.filter((i) => i.segment !== "commodity"),
        ...commodities,
      ];
      // Save commodities to IndexedDB
      const commodityStore = _cachedInstruments.filter((i) => i.segment === "commodity");
      putAll(STORES.INSTRUMENTS, commodityStore).catch(() => {});
      await setCacheTimestamp("commodities", CACHE_TTL.commodities);
      console.log(`[clientFetch] ✅ Commodities: ${commodities.length}`);
    }
    return { count: commodities.length };
  } catch (e) {
    return { count: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export { fetchCodalClient, getCachedCodal } from "./codalFetch";
export type { CodalReport } from "./codalFetch";
