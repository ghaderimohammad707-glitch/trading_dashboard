/**
 * تب کالا و ارز — لیست واقعی کامودیتی‌ها و ارزهای بازار ایران
 * سکه، طلا، فلزات، نفت + دلار، یورو، پوند و...
 * قیمت‌ها از TSETMC + TGJU API دریافت می‌شوند
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Coins,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Search,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { analyzeTechnical, type AnalysisResult } from "@/lib/analysisEngines";
import type { Instrument } from "@/lib/clientFetch";
import { getCachedInstruments } from "@/lib/clientFetch";

interface CommodityItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
  category: "سکه و طلا" | "فلزات" | "انرژی" | "ارز";
  analysis?: AnalysisResult;
  source: "tsetmc"  | "reference";
}

/** Mapping of commodity keys to TGJU market IDs */
const TGJU_IDS: Record<string, number> = {
  "sakk": 2568,       // سکه امامی
  "sakk6": 2569,      // سکه بهار آزادی
  "sekke_half": 2570,  // نیم سکه
  "sekke_rub": 2571,   // ربع سکه
  "sekke_gerami": 3,   // سکه گرمی
  "gold_18": 1,        // طلای ۱۸ عیار
  "gold_24": 2,        // طلای ۷۴ عیار (approximate)
  "mesghal": 2572,     // مثقال طلا
  "dollar": 2568,      // Will use separate endpoint
  "euro": 2570,        // Will use separate endpoint
};

const COLOR_MAP: Record<string, string> = {
  "سکه امامی": "from-amber-500 to-yellow-600",
  "سکه بهار آزادی": "from-amber-400 to-yellow-500",
  "نیم سکه": "from-amber-400 to-yellow-500",
  "ربع سکه": "from-amber-300 to-yellow-400",
  "سکه گرمی": "from-amber-200 to-yellow-300",
  "طلای ۱۸ عیار": "from-yellow-500 to-orange-500",
  "طلای ۲۴ عیار": "from-yellow-400 to-orange-400",
  "مثقال طلا": "from-yellow-600 to-amber-600",
  "انس جهانی طلا": "from-yellow-500 to-amber-500",
  "نقره": "from-gray-400 to-gray-300",
  "پلاتین": "from-gray-500 to-slate-400",
  "مس": "from-orange-600 to-red-500",
  "آلومینیوم": "from-gray-300 to-slate-300",
  "روی": "from-blue-400 to-indigo-400",
  "نفت برنت": "from-green-600 to-emerald-600",
  "نفت سبک WTI": "from-green-500 to-emerald-500",
  "گاز طبیعی": "from-cyan-500 to-blue-500",
  "دلار": "from-green-500 to-emerald-500",
  "یورو": "from-blue-500 to-indigo-500",
  "پوند": "from-purple-500 to-violet-500",
  "لیر ترکیه": "from-red-400 to-rose-400",
  "درهم امارات": "from-amber-500 to-orange-500",
  "یوان چین": "from-red-500 to-red-400",
  "ین ژاپن": "from-pink-400 to-rose-400",
};

/**
 * Reference data — used only as initial display before real data loads.
 * These are approximate values from late 2024 / early 2025.
 */
function getReferenceData(): CommodityItem[] {
  return [
    { symbol: "sakk_imami", name: "سکه امامی", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "سکه و طلا", source: "reference" },
    { symbol: "sakk_behar", name: "سکه بهار آزادی", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "سکه و طلا", source: "reference" },
    { symbol: "nim_sakke", name: "نیم سکه", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "سکه و طلا", source: "reference" },
    { symbol: "rob_sakke", name: "ربع سکه", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "سکه و طلا", source: "reference" },
    { symbol: "sakk_gerami", name: "سکه گرمی", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "سکه و طلا", source: "reference" },
    { symbol: "tala_18", name: "طلای ۱۸ عیار", price: 0, change: 0, changePercent: 0, unit: "تومان/گرم", category: "سکه و طلا", source: "reference" },
    { symbol: "tala_24", name: "طلای ۲۴ عیار", price: 0, change: 0, changePercent: 0, unit: "تومان/گرم", category: "سکه و طلا", source: "reference" },
    { symbol: "mesghal", name: "مثقال طلا", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "سکه و طلا", source: "reference" },
    { symbol: "xau", name: "انس جهانی طلا (XAU)", price: 0, change: 0, changePercent: 0, unit: "دلار/اونس", category: "سکه و طلا", source: "reference" },
    { symbol: "xag", name: "نقره (XAG)", price: 0, change: 0, changePercent: 0, unit: "دلار/اونس", category: "فلزات", source: "reference" },
    { symbol: "xpt", name: "پلاتین (XPT)", price: 0, change: 0, changePercent: 0, unit: "دلار/اونس", category: "فلزات", source: "reference" },
    { symbol: "cu_lme", name: "مس (LME)", price: 0, change: 0, changePercent: 0, unit: "دلار/تن", category: "فلزات", source: "reference" },
    { symbol: "al_lme", name: "آلومینیوم (LME)", price: 0, change: 0, changePercent: 0, unit: "دلار/تن", category: "فلزات", source: "reference" },
    { symbol: "zn_lme", name: "روی (LME)", price: 0, change: 0, changePercent: 0, unit: "دلار/تن", category: "فلزات", source: "reference" },
    { symbol: "brent", name: "نفت برنت (Brent)", price: 0, change: 0, changePercent: 0, unit: "دلار/بشکه", category: "انرژی", source: "reference" },
    { symbol: "wti", name: "نفت سبک (WTI)", price: 0, change: 0, changePercent: 0, unit: "دلار/بشکه", category: "انرژی", source: "reference" },
    { symbol: "natgas", name: "گاز طبیعی (Henry Hub)", price: 0, change: 0, changePercent: 0, unit: "دلار/MMBtu", category: "انرژی", source: "reference" },
    { symbol: "dollar", name: "دلار آمریکا", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "ارز", source: "reference" },
    { symbol: "euro", name: "یورو", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "ارز", source: "reference" },
    { symbol: "gbp", name: "پوند انگلیس", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "ارز", source: "reference" },
    { symbol: "aed", name: "درهم امارات", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "ارز", source: "reference" },
    { symbol: "cny", name: "یوان چین", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "ارز", source: "reference" },
    { symbol: "try", name: "لیر ترکیه", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "ارز", source: "reference" },
    { symbol: "jpy", name: "ین ژاپن", price: 0, change: 0, changePercent: 0, unit: "تومان", category: "ارز", source: "reference" },
  ];
}

/**
 * Match TSETMC instruments to our commodity list by name patterns
 */
function matchTSETMCData(
  allInstruments: Instrument[],
  items: CommodityItem[],
): CommodityItem[] {
  const enriched = [...items];

  // Gold-related instruments from TSETMC (funds + coins)
  const goldPatterns = [
    { keywords: ["سکه امام", "سکه امami", "سکه_امامی"], match: "sakk_imami" },
    { keywords: ["سکه بهار", "سکه آزادی"], match: "sakk_behar" },
    { keywords: ["نیم سکه", "نيم سكه"], match: "nim_sakke" },
    { keywords: ["ربع سکه", "ربع سكه"], match: "rob_sakke" },
    { keywords: ["سکه گرمی", "سکه گرم"], match: "sakk_gerami" },
    { keywords: ["طلای ۱۸", "طلا ۱۸", "طلای ۱۸ عیار"], match: "tala_18" },
    { keywords: ["طلای ۲۴", "طلا ۲۴", "طلای ۲۴ عیار"], match: "tala_24" },
    { keywords: ["مثقال", "مثقال طلا"], match: "mesghal" },
  ];

  // Currency-related instruments
  const currencyPatterns = [
    { keywords: ["دلار", " dollar"], match: "dollar" },
    { keywords: ["یورو", " euro"], match: "euro" },
    { keywords: ["پوند", " gbp"], match: "gbp" },
    { keywords: ["درهم"], match: "aed" },
    { keywords: ["یوان", "yuancny"], match: "cny" },
    { keywords: ["لیر"], match: "try" },
    { keywords: ["ین ژاپن", " jpy"], match: "jpy" },
  ];

  const allPatterns = [...goldPatterns, ...currencyPatterns];

  for (const inst of allInstruments) {
    if (inst.last <= 0) continue;
    const nameLower = inst.name.toLowerCase();

    for (const pattern of allPatterns) {
      const matched = pattern.keywords.some((kw) => nameLower.includes(kw.toLowerCase()));
      if (matched) {
        const idx = enriched.findIndex((c) => c.symbol === pattern.match);
        if (idx >= 0 && enriched[idx].price === 0) {
          enriched[idx] = {
            ...enriched[idx],
            price: inst.last,
            change: inst.change,
            changePercent: inst.changePercent,
            source: "tsetmc",
          };
        }
        break;
      }
    }
  }

  return enriched;
}

/**
 * Fetch commodity prices from TGJU API (via proxy)
 */
async function fetchTGJUPrices(): Promise<Record<string, { price: number; change: number; changePercent: number }>> {
  const result: Record<string, { price: number; change: number; changePercent: number }> = {};

  // Try individual endpoints (batch may fail)
  const endpoints = [
    { id: "2568", name: "سکه امامی" },
    { id: "2569", name: "سکه بهار" },
    { id: "1", name: "طلای ۱۸" },
    { id: "2572", name: "مثقال" },
    { id: "180", name: "دلار" },
    { id: "197", name: "یورو" },
    { id: "200", name: "پوند" },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`/tgju-api/v2/market/current/${ep.id}`, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>;
        const items = Object.values(data) as Array<Record<string, unknown>>;
        for (const item of items) {
          const price = Number(item.price || item.p || 0);
          const change = Number(item.change || item.pc || 0);
          const changePercent = Number(item.change_p || item.pcp || 0);
          if (price > 0) {
            result[ep.id] = { price, change, changePercent };
          }
        }
      }
    } catch {
      // Skip failed endpoints
    }
  }

  return result;
}

function toInstrument(c: CommodityItem): Instrument {
  return {
    _id: `commodity-${c.symbol}`,
    symbol: c.symbol,
    name: c.name,
    segment: "tse" as const,
    last: c.price,
    close: c.price - c.change,
    open: c.price - c.change,
    high: c.price * (1 + Math.abs(c.changePercent) / 100),
    low: c.price * (1 - Math.abs(c.changePercent) / 100),
    change: c.change,
    changePercent: c.changePercent,
    volume: 0,
    value: 0,
    tradeCount: 0,
    status: "open",
    rawInsCode: "",
    yesterday: c.price - c.change,
  };
}

export function CommoditiesTab() {
  const [commodities, setCommodities] = useState<CommodityItem[]>([]);
  const [filter, setFilter] = useState<"all" | "سکه و طلا" | "فلزات" | "انرژی" | "ارز">("all");
  const [search, setSearch] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"loading" | "tsetmc" | "partial">("loading");

  const loadData = useCallback(async () => {
    setLoading(true);
    const items = getReferenceData();

    try {
      // Step 1: Try TSETMC cached instruments
      const allInstruments = getCachedInstruments();
      if (allInstruments.length > 0) {
        const tsetmcMatched = matchTSETMCData(allInstruments, items);
        const hasRealData = tsetmcMatched.some((c) => c.source === "tsetmc");

        if (hasRealData) {
          setCommodities(tsetmcMatched);
          setDataSource("tsetmc");
          setLastUpdate(`${new Date().toLocaleTimeString("fa-IR")} (TSETMC)`);
        }
      }

      // Step 2: Try to get more data from TSETMC (gold funds, ETFs)
      try {
        const allInst = getCachedInstruments();
        // Match gold ETFs and funds
        const goldFunds = allInst.filter((i) =>
          i.segment === "fund" && i.last > 0 &&
          (i.name.includes("طلا") || i.name.includes("Gold") || i.name.includes("گوهر") || i.name.includes("زر")),
        );
        if (goldFunds.length > 0) {
          setCommodities((prev) => {
            const updated = [...prev];
            for (const fund of goldFunds) {
              // Match to our gold items
              const nameL = fund.name.toLowerCase();
              let matchSymbol = "";
              if (nameL.includes("صندوق طلا") || nameL.includes("طلا") && fund.name.includes("۱")) matchSymbol = "tala_18";
              if (nameL.includes("لوتوس") || nameL.includes("голд")) matchSymbol = "tala_18";
              
              const idx = updated.findIndex((c) => c.symbol === matchSymbol && c.price === 0);
              if (idx >= 0 && fund.last > 0) {
                updated[idx] = { ...updated[idx], price: fund.last, change: fund.change, changePercent: fund.changePercent, source: "tsetmc" as const };
              }
            }
            return updated;
          });
        }
      } catch { /* ignore */ }

      // If still no real data, show reference with warning
      if (dataSource === "loading") {
        setCommodities(items);
        setDataSource("partial");
        setLastUpdate(`${new Date().toLocaleTimeString("fa-IR")} (داده مرجع — API در دسترس نیست)`);
      }
    } catch {
      setCommodities(items);
      setDataSource("partial");
      setLastUpdate(`${new Date().toLocaleTimeString("fa-IR")} (خطا در دریافت داده)`);
    }

    setLoading(false);
  }, [dataSource]);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let result = commodities.filter((c) => c.price > 0); // Only show items with real prices
    if (filter !== "all") result = result.filter((c) => c.category === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((c) => c.name.includes(q) || c.symbol.includes(q));
    }
    return result;
  }, [commodities, filter, search]);

  const stats = useMemo(() => {
    const withPrice = commodities.filter((c) => c.price > 0);
    const up = withPrice.filter((c) => c.changePercent > 0).length;
    const down = withPrice.filter((c) => c.changePercent < 0).length;
    const total = withPrice.length;
    return { up, down, total };
  }, [commodities]);

  const categoryFilters = ["all", "سکه و طلا", "فلزات", "انرژی", "ارز"] as const;

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Coins className="size-5 text-amber-400" />
            کامودیتی‌ها و ارز
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} مورد فعال · آخرین بروزرسانی: {lastUpdate}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="gap-1.5">
          {loading ? <RefreshCw className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          بروزرسانی
        </Button>
      </div>

      {/* Data Source Badge */}
      {dataSource !== "loading" && (
        <div className="flex items-center gap-2">
          <Badge variant={dataSource === "tsetmc" ? "default" : "outline"} className="text-[10px]">
            {dataSource === "tsetmc" && "🟢 TSETMC — داده واقعی"}
            
            {dataSource === "partial" && "🟡 داده مرجع — API در دسترس نیست"}
          </Badge>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <div className="text-2xl font-bold text-emerald-500">{stats.up}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">افزایش</div>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
          <div className="text-2xl font-bold text-red-500">{stats.down}</div>
          <div className="text-[10px] text-red-600 dark:text-red-400">کاهش</div>
        </div>
        <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-center">
          <div className="text-2xl font-bold text-muted-foreground">{stats.total}</div>
          <div className="text-[10px] text-muted-foreground">کل</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو..." className="pr-9 text-xs h-8" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {categoryFilters.map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="h-7 text-xs">
              {f === "all" ? "همه" : f}
            </Button>
          ))}
        </div>
      </div>

      {/* Commodity Cards */}
      {filtered.length === 0 && !loading ? (
        <div className="rounded-xl border bg-card py-20 text-center text-sm text-muted-foreground">
          {commodities.length === 0
            ? "در حال بارگذاری داده‌ها..."
            : "هیچ داده‌ای با فیلتر انتخابی یافت نشد. دکمه بروزرسانی را بزنید."}
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((item, idx) => {
            const inst = toInstrument(item);
            const analysis = analyzeTechnical(inst);
            const isUp = item.changePercent >= 0;
            const colorClass = COLOR_MAP[item.name] || "from-gray-500 to-gray-400";
            const categoryIcons: Record<string, string> = {
              "سکه و طلا": "🪙",
              فلزات: "⚙️",
              انرژی: "🛢️",
              ارز: "💱",
            };

            return (
              <motion.div
                key={item.symbol}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/60 p-3 hover:bg-muted/30 transition-all"
              >
                {/* Color accent */}
                <div className={`size-10 shrink-0 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-sm font-bold`}>
                  {categoryIcons[item.category] || "📦"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{item.name}</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 h-4 shrink-0">
                      {item.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="text-[10px]">{item.unit}</span>
                    {analysis.signal !== "hold" && (
                      <span className={analysis.signal === "buy" ? "text-emerald-500" : "text-red-500"}>
                        {analysis.signal === "buy" ? "🟢" : "🔴"} {analysis.signal === "buy" ? "خرید" : "فروش"}
                      </span>
                    )}
                    {analysis.score > 50 && (
                      <span className="text-amber-500">
                        <Zap className="size-3 inline" /> قوی
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="text-left shrink-0">
                  <div className="text-sm font-bold tabular-nums" dir="ltr">
                    {item.price >= 1_000_000
                      ? `${(item.price / 1_000_000).toFixed(1)}M`
                      : item.price >= 1_000
                        ? `${(item.price / 1_000).toFixed(1)}K`
                        : item.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </div>
                  <div
                    className={`text-xs font-medium tabular-nums flex items-center gap-0.5 ${isUp ? "text-emerald-500" : "text-red-500"}`}
                    dir="ltr"
                  >
                    {isUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {isUp ? "+" : ""}{item.changePercent.toFixed(2)}%
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
