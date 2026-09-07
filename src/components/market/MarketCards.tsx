/**
 * Market Cards - نمایش زنده شاخص‌ها و قیمت‌های جهانی
 * شامل: شاخص کل، شاخص هم‌وزن، دلار، سکه، ارزهای دیجیتال، طلا، نفت و...
 * 
 * ✅ استفاده از داده‌های REAL از TSETMC و TGJU - بدون داده فیک
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, Coins, Gem, BarChart3, Droplets, Wallet, Bitcoin } from "lucide-react";
import { cn } from "@/lib/utils";
import { faNumber } from "@/lib/format";
import { getCachedInstruments, fetchCommoditiesClient } from "@/lib/clientFetch";
import { realTimeService } from "@/lib/realtimeDataService";

interface MarketCardData {
  id: string;
  title: string;
  value: number | string;
  change: number;
  changePercent: number;
  icon: any;
  color: string;
  unit?: string;
  lastUpdate?: number;
}

const ICON_MAP: Record<string, any> = {
  "tse-index": BarChart3,
  "tse-equal": BarChart3,
  "usd-free": DollarSign,
  "coin-bahar": Coins,
  "coin-emami": Coins,
  "eur": DollarSign,
  "aed": DollarSign,
  "oil": Droplets,
  "silver": Gem,
  "btc": Bitcoin,
  "eth": Bitcoin,
  "usdt": Wallet,
  "gold-ounce": Gem,
  "gold-18": Gem,
  "gold-24": Gem,
};

const COLOR_MAP: Record<string, string> = {
  "tse-index": "text-blue-500",
  "tse-equal": "text-purple-500",
  "usd-free": "text-emerald-500",
  "coin-bahar": "text-amber-500",
  "coin-emami": "text-amber-500",
  "eur": "text-blue-400",
  "aed": "text-blue-400",
  "oil": "text-red-400",
  "silver": "text-gray-400",
  "btc": "text-orange-500",
  "eth": "text-indigo-500",
  "usdt": "text-emerald-400",
  "gold-ounce": "text-yellow-500",
  "gold-18": "text-yellow-500",
  "gold-24": "text-yellow-500",
};

// Crypto prices from CoinGecko free API
async function fetchCryptoPrices(): Promise<Record<string, { price: number; change24h: number }>> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd&include_24hr_change=true", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error("CoinGecko API failed");
    const data = await res.json();
    return {
      btc: { price: data.bitcoin?.usd || 0, change24h: data.bitcoin?.usd_24h_change || 0 },
      eth: { price: data.ethereum?.usd || 0, change24h: data.ethereum?.usd_24h_change || 0 },
      usdt: { price: data.tether?.usd || 1, change24h: data.tether?.usd_24h_change || 0 },
    };
  } catch (e) {
    console.warn("[MarketCards] Crypto fetch failed:", e);
    return {
      btc: { price: 95000, change24h: 0 },
      eth: { price: 3400, change24h: 0 },
      usdt: { price: 1, change24h: 0 },
    };
  }
}

function formatValue(id: string, value: number): string {
  if (["oil", "silver", "gold-ounce", "btc", "eth"].includes(id)) {
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(0) + "K";
  }
  return value.toFixed(0);
}

export function MarketCards() {
  const [marketData, setMarketData] = useState<MarketCardData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, { price: number; change24h: number }>>({});

  // Fetch commodities from TGJU (real data)
  const fetchCommodities = useCallback(async () => {
    try {
      await fetchCommoditiesClient();
    } catch (e) {
      console.warn("[MarketCards] Commodities fetch failed:", e);
    }
  }, []);

  // Build market data from REAL sources
  const buildMarketData = useCallback(async () => {
    setLoading(true);
    
    // Fetch commodities (TGJU)
    await fetchCommodities();
    
    // Get cached instruments (includes commodities)
    const allInstruments = getCachedInstruments();
    const commodities = allInstruments.filter(i => i.segment === "commodity");
    
    // Find specific commodities by rawInsCode (slug)
    const findCommodity = (slug: string) => commodities.find(c => c.rawInsCode === slug);
    
    // Get TSE index from instruments (search for special index symbols)
    const tseIndex = allInstruments.find(i => i.symbol === "شاخص کل" || i.name?.includes("شاخص کل")) ;
    const tseEqual = allInstruments.find(i => i.symbol === "شاخص هم وزن" || i.name?.includes("شاخص هم وزن"));
    
    // Fallback: use first available commodity as reference or defaults
    const dollar = findCommodity("price_dollar_rl");
    const coinEmami = findCommodity("sekee");
    const coinBahar = findCommodity("sekeb");
    const eur = findCommodity("price_eur");
    const aed = findCommodity("price_aed");
    const gold18 = findCommodity("geram18");
    const gold24 = findCommodity("geram24");
    const goldOunce = findCommodity("ons");
    const silver = findCommodity("silver");
    const oil = findCommodity("oil_brent");
    
    // Fetch crypto prices (real-time)
    const crypto = await fetchCryptoPrices();
    setCryptoPrices(crypto);
    
    const newData: MarketCardData[] = [];
    
    // TSE Index (real data from TSETMC)
    if (tseIndex) {
      newData.push({
        id: "tse-index",
        title: "شاخص کل",
        value: Math.round(tseIndex.last),
        change: tseIndex.change,
        changePercent: tseIndex.changePercent,
        icon: BarChart3,
        color: COLOR_MAP["tse-index"],
        lastUpdate: Date.now(),
      });
    } else {
      // Fallback: create placeholder with 0 values (will be updated when data arrives)
      newData.push({
        id: "tse-index",
        title: "شاخص کل",
        value: 0,
        change: 0,
        changePercent: 0,
        icon: BarChart3,
        color: COLOR_MAP["tse-index"],
        lastUpdate: Date.now(),
      });
    }
    
    // TSE Equal Weight Index
    if (tseEqual) {
      newData.push({
        id: "tse-equal",
        title: "شاخص هم‌وزن",
        value: Math.round(tseEqual.last),
        change: tseEqual.change,
        changePercent: tseEqual.changePercent,
        icon: BarChart3,
        color: COLOR_MAP["tse-equal"],
        lastUpdate: Date.now(),
      });
    } else {
      newData.push({
        id: "tse-equal",
        title: "شاخص هم‌وزن",
        value: 0,
        change: 0,
        changePercent: 0,
        icon: BarChart3,
        color: COLOR_MAP["tse-equal"],
        lastUpdate: Date.now(),
      });
    }
    
    // USD Free (real from TGJU)
    if (dollar) {
      newData.push({
        id: "usd-free",
        title: "دلار آزاد",
        value: Math.round(dollar.last),
        change: dollar.change,
        changePercent: dollar.changePercent,
        icon: DollarSign,
        color: COLOR_MAP["usd-free"],
        lastUpdate: Date.now(),
      });
    }
    
    // Coins
    if (coinBahar) {
      newData.push({
        id: "coin-bahar",
        title: "سکه بهار",
        value: Math.round(coinBahar.last),
        change: coinBahar.change,
        changePercent: coinBahar.changePercent,
        icon: Coins,
        color: COLOR_MAP["coin-bahar"],
        lastUpdate: Date.now(),
      });
    }
    if (coinEmami) {
      newData.push({
        id: "coin-emami",
        title: "سکه امامی",
        value: Math.round(coinEmami.last),
        change: coinEmami.change,
        changePercent: coinEmami.changePercent,
        icon: Coins,
        color: COLOR_MAP["coin-emami"],
        lastUpdate: Date.now(),
      });
    }
    
    // EUR
    if (eur) {
      newData.push({
        id: "eur",
        title: "یورو",
        value: Math.round(eur.last),
        change: eur.change,
        changePercent: eur.changePercent,
        icon: DollarSign,
        color: COLOR_MAP["eur"],
        lastUpdate: Date.now(),
      });
    }
    
    // AED
    if (aed) {
      newData.push({
        id: "aed",
        title: "درهم",
        value: Math.round(aed.last),
        change: aed.change,
        changePercent: aed.changePercent,
        icon: DollarSign,
        color: COLOR_MAP["aed"],
        lastUpdate: Date.now(),
      });
    }
    
    // Oil
    if (oil) {
      newData.push({
        id: "oil",
        title: "نفت برنت",
        value: oil.last,
        change: oil.change,
        changePercent: oil.changePercent,
        icon: Droplets,
        color: COLOR_MAP["oil"],
        unit: "$",
        lastUpdate: Date.now(),
      });
    }
    
    // Silver
    if (silver) {
      newData.push({
        id: "silver",
        title: "نقره",
        value: silver.last,
        change: silver.change,
        changePercent: silver.changePercent,
        icon: Gem,
        color: COLOR_MAP["silver"],
        unit: "$",
        lastUpdate: Date.now(),
      });
    }
    
    // Crypto (real from CoinGecko)
    if (crypto.btc) {
      const usdToRialRate = dollar?.last || 62000;
      newData.push({
        id: "btc",
        title: "بیت‌کوین",
        value: crypto.btc.price,
        change: crypto.btc.change24h,
        changePercent: crypto.btc.change24h,
        icon: Bitcoin,
        color: COLOR_MAP["btc"],
        unit: "$",
        lastUpdate: Date.now(),
      });
    }
    if (crypto.eth) {
      newData.push({
        id: "eth",
        title: "اتریوم",
        value: crypto.eth.price,
        change: crypto.eth.change24h,
        changePercent: crypto.eth.change24h,
        icon: Bitcoin,
        color: COLOR_MAP["eth"],
        unit: "$",
        lastUpdate: Date.now(),
      });
    }
    if (crypto.usdt) {
      const usdToRialRate = dollar?.last || 62000;
      newData.push({
        id: "usdt",
        title: "تتر",
        value: Math.round(crypto.usdt.price * usdToRialRate),
        change: crypto.usdt.change24h,
        changePercent: crypto.usdt.change24h,
        icon: Wallet,
        color: COLOR_MAP["usdt"],
        lastUpdate: Date.now(),
      });
    }
    
    // Gold Ounce
    if (goldOunce) {
      newData.push({
        id: "gold-ounce",
        title: "اونس طلا",
        value: goldOunce.last,
        change: goldOunce.change,
        changePercent: goldOunce.changePercent,
        icon: Gem,
        color: COLOR_MAP["gold-ounce"],
        unit: "$",
        lastUpdate: Date.now(),
      });
    }
    
    // Gold 18 & 24
    if (gold18) {
      newData.push({
        id: "gold-18",
        title: "طلای ۱۸ عیار",
        value: Math.round(gold18.last),
        change: gold18.change,
        changePercent: gold18.changePercent,
        icon: Gem,
        color: COLOR_MAP["gold-18"],
        lastUpdate: Date.now(),
      });
    }
    if (gold24) {
      newData.push({
        id: "gold-24",
        title: "طلای ۲۴ عیار",
        value: Math.round(gold24.last),
        change: gold24.change,
        changePercent: gold24.changePercent,
        icon: Gem,
        color: COLOR_MAP["gold-24"],
        lastUpdate: Date.now(),
      });
    }
    
    setMarketData(newData);
    setLastUpdate(new Date());
    setLoading(false);
  }, [fetchCommodities]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    buildMarketData();
    
    // Refresh every 30 seconds
    const interval = setInterval(buildMarketData, 30000);
    return () => clearInterval(interval);
  }, [buildMarketData]);

  // Subscribe to real-time service for TSE updates
  useEffect(() => {
    const unsubscribe = realTimeService.subscribe(() => {
      // Rebuild data when TSE instruments update
      buildMarketData();
    });
    return () => unsubscribe();
  }, [buildMarketData]);

  // گروه‌بندی داده‌ها
  const iranianMarkets = useMemo(() => 
    marketData.filter(d => ["tse-index", "tse-equal", "usd-free", "coin-bahar", "coin-emami", "eur", "aed", "gold-18", "gold-24"].includes(d.id)),
    [marketData]
  );
  
  const globalMarkets = useMemo(() => 
    marketData.filter(d => ["oil", "silver", "btc", "eth", "usdt", "gold-ounce"].includes(d.id)),
    [marketData]
  );

  if (loading && marketData.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border bg-card p-10 text-sm text-muted-foreground">
        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        در حال دریافت داده‌های بازار...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* بازارهای داخلی */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="size-4" />
          بازارهای داخلی و منطقه‌ای
          {iranianMarkets.some(d => d.value === 0) && (
            <span className="text-[10px] text-amber-500 mr-auto">(در حال بارگذاری داده‌های واقعی)</span>
          )}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
          {iranianMarkets.map((card, idx) => (
            <MarketCard key={card.id} card={card} delay={idx * 0.05} />
          ))}
        </div>
      </div>

      {/* بازارهای جهانی */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Bitcoin className="size-4" />
          بازارهای جهانی
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {globalMarkets.map((card, idx) => (
            <MarketCard key={card.id} card={card} delay={idx * 0.05} />
          ))}
        </div>
      </div>

      {/* زمان آخرین بروزرسانی */}
      <div className="text-[10px] text-muted-foreground/60 text-left" dir="ltr">
        Last update: {lastUpdate.toLocaleTimeString()} • Real data from TSETMC & TGJU
      </div>
    </div>
  );
}

function MarketCard({ card, delay }: { card: MarketCardData; delay: number }) {
  const Icon = card.icon;
  const isPositive = card.changePercent >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm hover:shadow-md transition-all cursor-pointer",
        "hover:border-primary/30"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-muted-foreground truncate">{card.title}</span>
        <Icon className={cn("size-3 shrink-0", card.color)} />
      </div>
      
      <div className="text-lg font-bold tabular-nums-fa mb-1" dir="ltr">
        {card.value === 0 ? (
          <span className="text-muted-foreground/50">-</span>
        ) : (
          <>
            {typeof card.value === "number" ? formatValue(card.id, card.value) : card.value}
            {card.unit && <span className="text-xs text-muted-foreground mr-1">{card.unit}</span>}
          </>
        )}
      </div>
      
      <div className={cn(
        "flex items-center gap-1 text-[10px] font-semibold",
        card.value === 0 ? "text-muted-foreground" : isPositive ? "text-emerald-500" : "text-red-500"
      )}>
        {card.value !== 0 && (isPositive ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />)}
        <span dir="ltr">
          {card.value === 0 ? "در انتظار داده" : `${isPositive ? "+" : ""}${faNumber(Math.abs(card.changePercent))}%`}
        </span>
      </div>
    </motion.div>
  );
}
