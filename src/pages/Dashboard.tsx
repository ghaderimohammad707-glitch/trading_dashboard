/**
 * Dashboard — نسخه بهینه‌شده برای تریدر حرفه‌ای با طراحی مدرن و خیره‌کننده
 * 8 تب اصلی + Disclaimer + Performance Bar + انیمیشن‌های پیشرفته
 */
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AppearanceSettingsPanel } from "@/components/AppearanceSettings";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkline, sparklineValues } from "@/components/market/Sparkline";
import { AnimatedCard } from "@/components/market/AnimatedCard";
import { lazy, Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { registerShortcuts } from "@/lib/keyboardShortcuts";
import { InstrumentDetail } from "@/components/market/InstrumentDetail";
import { InstrumentTable } from "@/components/market/InstrumentTable";
import { AsyncErrorBoundary } from "@/components/AsyncErrorBoundary";
import { NetworkDiagnostic } from "@/components/market/NetworkDiagnostic";
import { FontSizeControl } from "@/components/FontSizeControl";
import { RiskDisclaimer } from "@/components/RiskDisclaimer";
import { useFontSize } from "@/lib/fontSize";
import {
  fetchAllMarketDataClient, fetchCommoditiesClient, fetchCodalClient,
  getCachedInstruments, getCachedCodal, getNetworkStatus,
  type Instrument as ClientInstrument, type CodalReport,
} from "@/lib/clientFetch";
import { realTimeService } from "@/lib/realtimeDataService";
import { generateAllSignalsAsync, type CompositeSignal } from "@/lib/analysisEngines";
import { prefetchHistoricalData } from "@/lib/historicalData";
import { saveSignalToResults } from "@/components/market/SignalResultsTab";
import { getPerformanceStats } from "@/lib/performanceTracker";
import { cn } from "@/lib/utils";
import { getAll, put, remove as idbRemove, STORES } from "@/lib/idb";
import { PortfolioModal } from "@/components/market/PortfolioModal";
import { AlertModal } from "@/components/market/AlertModal";
import { MarketCards } from "@/components/market/MarketCards";
import { toast } from "sonner";
import { startAlertMonitoring, stopAlertMonitoring, isMonitoringActive } from "@/lib/alertMonitor";
import {
  Activity, Bell, Briefcase, ChevronDown, Clock, FileText, Loader2, Users,
  LogOut, Radio, RefreshCw, Search, Settings, Shield, TrendingUp,
  TrendingDown, Plus, Gem, Coins, BookOpen, Wrench, BarChart3, Zap, Target,
  Award, TrendingDown as TrendingDownIcon, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Lazy tabs — فقط 8 تب اصلی
const LazyNewsTab = lazy(() => import("@/components/market/NewsTab").then(m => ({ default: m.NewsTab })));
const LazyCodalTab = lazy(() => import("@/components/market/CodalTab").then(m => ({ default: m.CodalTab })));
const LazySignalResultsTab = lazy(() => import("@/components/market/SignalResultsTab").then(m => ({ default: m.SignalResultsTab })));
const LazyGemHunterTab = lazy(() => import("@/components/market/GemHunterTab").then(m => ({ default: m.GemHunterTab })));
const LazyCommoditiesTab = lazy(() => import("@/components/market/CommoditiesTab").then(m => ({ default: m.CommoditiesTab })));
const LazyReportsTab = lazy(() => import("@/components/market/ReportsTab").then(m => ({ default: m.ReportsTab })));
const LazyTablouKhaniTab = lazy(() => import("@/components/market/TablouKhaniTab").then(m => ({ default: m.TablouKhaniTab })));
const LazyBacktestTab = lazy(() => import("@/components/market/BacktestTab").then(m => ({ default: m.BacktestTab })));
const LazyAIAssistantTab = lazy(() => import("@/components/market/AIAssistantTab").then(m => ({ default: m.AIAssistantTab })));
const LazyCustomDashboardTab = lazy(() => import("@/components/market/CustomDashboardTab").then(m => ({ default: m.CustomDashboardTab })));
import { PortfolioTab } from "@/components/market/PortfolioTab";
import { SignalsTab } from "@/components/market/SignalsTab";
import { AlertsTab } from "@/components/market/AlertsTab";
import { RiskCalculatorTab } from "@/components/market/RiskCalculatorTab";
import { JournalTab } from "@/components/market/JournalTab";
import { PaperTradingTab } from "@/components/market/PaperTradingTab";

function TabLoader() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary" />
      <span>در حال بارگذاری...</span>
    </div>
  );
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function dirText(v: number) { return v >= 0 ? "text-emerald-500" : "text-red-500"; }

/* ─── Performance Mini Bar با طراحی مدرن ─── */
function PerformanceMiniBar() {
  const [stats, setStats] = useState(() => getPerformanceStats());
  useEffect(() => {
    const t = setInterval(() => setStats(getPerformanceStats()), 30000);
    return () => clearInterval(t);
  }, []);

  if (stats.totalSignals === 0) return null;

  return (
    <motion.div 
      className="flex items-center gap-3 text-[10px]"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="hidden lg:flex items-center gap-2 px-2 py-1 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
        <Award className="size-3 text-emerald-500" />
        <span className="text-muted-foreground">عملکرد:</span>
        <span className={cn("font-bold", stats.winRate > 50 ? "text-emerald-400" : "text-red-400")}>
          {stats.winRate}٪
        </span>
      </div>
      <div className="hidden xl:flex items-center gap-2 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
        <Target className="size-3 text-blue-500" />
        <span className="text-muted-foreground">R:R</span>
        <span className="font-bold text-blue-400">{stats.sharpeApprox}</span>
      </div>
      <div className={cn(
        "hidden xl:flex items-center gap-2 px-2 py-1 rounded-lg border",
        stats.totalPnL >= 0 
          ? "bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20" 
          : "bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/20"
      )}>
        {stats.totalPnL >= 0 ? <ArrowUpRight className="size-3 text-emerald-500" /> : <ArrowDownRight className="size-3 text-red-500" />}
        <span className={cn("font-bold", stats.totalPnL >= 0 ? "text-emerald-400" : "text-red-400")}>
          {stats.totalPnL >= 0 ? "+" : ""}{stats.totalPnL}٪
        </span>
      </div>
    </motion.div>
  );
}

/* ─── Market Status Bar با طراحی مدرن ─── */
function MarketStatusBar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const isMarketOpen = hours >= 9 && hours < 12 && (hours !== 12 || minutes < 30);
  // شنبه تا چهارشنبه
  const day = time.getDay();
  const isWeekday = day >= 0 && day <= 4;

  return (
    <motion.div 
      className="flex items-center gap-2 text-[10px]"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <div className={cn(
        "flex items-center gap-2 px-2.5 py-1 rounded-full border",
        isWeekday && isMarketOpen
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : isWeekday
            ? "bg-red-500/10 border-red-500/30 text-red-400"
            : "bg-amber-500/10 border-amber-500/30 text-amber-400"
      )}>
        <Clock className={cn("size-3", isWeekday && isMarketOpen ? "animate-pulse" : "")} />
        <span className="tabular-nums font-mono" dir="ltr">{time.toLocaleTimeString("en-US", { hour12: false })}</span>
        <Badge 
          variant="outline" 
          className={cn(
            "text-[8px] font-bold border-0",
            isWeekday && isMarketOpen
              ? "bg-emerald-500 text-white"
              : isWeekday
                ? "bg-red-500 text-white"
                : "bg-amber-500 text-white"
          )}
        >
          {isWeekday && isMarketOpen ? "باز" : isWeekday ? "بسته" : "تعطیل"}
        </Badge>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
//  Main Dashboard — 8 Tabs
// ═══════════════════════════════════════════════

export default function Dashboard() {
  const now = useClock();
  const fontSize = useFontSize();
  const [instruments, setInstruments] = useState<ClientInstrument[]>([]);
  const [localCodal, setLocalCodal] = useState<CodalReport[]>([]);
  const [localSignals, setLocalSignals] = useState<CompositeSignal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("market");
  const [selectedInstrument, setSelectedInstrument] = useState<ClientInstrument | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [showNetworkDiag, setShowNetworkDiag] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<"all" | "tse" | "ifb" | "fund">("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  
  // Portfolio & Alerts state with IndexedDB persistence
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [modalsOpen, setModalsOpen] = useState({ portfolio: false, alerts: false });

  // Load portfolio and alerts from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [portfolioData, alertsData] = await Promise.all([
          getAll<any>(STORES.PORTFOLIO),
          getAll<any>(STORES.ALERTS),
        ]);
        setPortfolio(portfolioData || []);
        setAlerts(alertsData || []);
      } catch (e) {
        console.error("Failed to load portfolio/alerts:", e);
      }
    };
    void loadData();
  }, []);

  // Register keyboard shortcuts
  useEffect(() => {
    const tabMap: Record<string, string> = {
      "market": "market", "tabloukhani": "tabloukhani", "signals": "signals", "results": "results",
      "gem": "gem", "news": "news", "portfolio": "portfolio", "backtest": "backtest",
      "alerts": "alerts", "codal": "codal", "reports": "reports",
    };
    return registerShortcuts((action: string) => {
      if (action.startsWith("tab:")) {
        const tabId = action.slice(4);
        setActiveTab(tabMap[tabId] || tabId);
      } else if (action === "refresh") {
        void handleRefresh();
      } else if (action === "search") {
        setSearchQuery("");
      }
    });
  }, []);

  // Start real-time data service on mount
  useEffect(() => {
    console.log("[Dashboard] Initializing real-time data service...");
    
    // Configure real-time service with optimal intervals
    realTimeService.configure({
      priceInterval: 3000, // 3 seconds for price updates
      marketWatchInterval: 10000, // 10 seconds for full market watch
      refreshOnVisible: true,
      maxFailures: 5,
      enableOrderBook: true,
    });

    // Subscribe to real-time updates
    const unsubscribe = realTimeService.subscribe((instruments) => {
      console.log(`[Dashboard] Real-time update: ${instruments.length} instruments`);
      setInstruments(instruments);
      // Stats will automatically recalculate via useMemo when instruments change
    });

    // Subscribe to errors
    const unsubscribeErrors = realTimeService.subscribeErrors((error) => {
      console.error("[Dashboard] Real-time error:", error);
      setFetchStatus(`❌ خطا در داده‌های لحظه‌ای: ${error.message}`);
    });

    // Start the service
    realTimeService.start();

    // Cleanup on unmount
    return () => {
      console.log("[Dashboard] Stopping real-time data service...");
      unsubscribe();
      unsubscribeErrors();
      realTimeService.stop();
      stopAlertMonitoring();
    };
  }, []);

  // Alert monitoring
  useEffect(() => {
    if (alerts.length > 0 && instruments.length > 0) {
      const handleTriggered = (trigger: any) => {
        // Update alert state in IndexedDB
        const alert = alerts.find(a => a._id === trigger.alertId);
        if (alert) {
          const updated = { ...alert, isTriggered: true, triggeredAt: Date.now(), triggerCount: (alert.triggerCount || 0) + 1 };
          void put(STORES.ALERTS, updated);
          setAlerts(prev => prev.map(a => a._id === trigger.alertId ? updated : a));
          toast.success(`⚠️ هشدار ${trigger.symbol} فعال شد!`);
        }
      };

      startAlertMonitoring(alerts, instruments, handleTriggered);
    }
    return () => {
      stopAlertMonitoring();
    };
  }, [alerts, instruments]);

  // Auto-fetch on mount (initial load)
  useEffect(() => {
    void handleRefresh();
  }, []);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    setFetchStatus("در حال دریافت داده...");
    try {
      const marketResult = await fetchAllMarketDataClient();
      const totalStocks = marketResult.tseCount + marketResult.ifbCount;
      if (totalStocks > 0) {
        setInstruments(getCachedInstruments());
        setFetchStatus(`✅ ${totalStocks} نماد دریافت شد`);
      } else {
        setFetchStatus("⚠️ داده‌ای دریافت نشد");
      }

      await Promise.allSettled([
        fetchCodalClient(getCachedInstruments()).then(() => setLocalCodal(getCachedCodal())),
        fetchCommoditiesClient(),
      ]);

      if (totalStocks > 0) {
        const topInstruments = getCachedInstruments()
          .filter(i => i.rawInsCode && (i.volume > 10000 || Math.abs(i.changePercent) > 1 || i.tradeCount > 500))
          .sort((a, b) => (b.volume * Math.abs(b.changePercent)) - (a.volume * Math.abs(a.changePercent)))
          .slice(0, 250);
        void prefetchHistoricalData(topInstruments, 10, 1);

        const allSignals = await generateAllSignalsAsync(getCachedInstruments(), getCachedCodal(), 50);
        setLocalSignals(allSignals);
        console.log(`[Dashboard] Generated ${allSignals.length} signals`);

        const actionableSignals = allSignals.filter(s => s.signal !== "hold");
        for (const sig of actionableSignals.slice(0, 20)) {
          void saveSignalToResults(sig);
        }
      }
    } catch (e) {
      setFetchStatus(`❌ خطا: ${e instanceof Error ? e.message : "ناشناخته"}`);
    } finally {
      setRefreshing(false);
      setTimeout(() => setFetchStatus(null), 8000);
    }
  }, [refreshing]);

  // Portfolio handlers
  const handleAddPortfolioItem = async (item: any) => {
    try {
      const newItem = { ...item, _id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), addedAt: Date.now() };
      await put(STORES.PORTFOLIO, newItem);
      setPortfolio(prev => [...prev, newItem]);
      setModalsOpen(prev => ({ ...prev, portfolio: false }));
    } catch (e) {
      console.error("Failed to add portfolio item:", e);
    }
  };

  const handleImportPortfolioItems = async (items: any[]) => {
    try {
      const newItems = items.map(item => ({
        ...item,
        _id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        addedAt: Date.now(),
      }));
      await Promise.all(newItems.map(item => put(STORES.PORTFOLIO, item)));
      setPortfolio(prev => [...prev, ...newItems]);
    } catch (e) {
      console.error("Failed to import portfolio items:", e);
    }
  };

  const handleRemovePortfolioItem = async (id: string) => {
    try {
      await idbRemove(STORES.PORTFOLIO, id);
      setPortfolio(prev => prev.filter(p => p._id !== id));
    } catch (e) {
      console.error("Failed to remove portfolio item:", e);
    }
  };

  // Alerts handlers
  const handleAddAlert = async (alert: any) => {
    try {
      const newAlert = { ...alert, _id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), createdAt: Date.now(), triggerCount: 0 };
      await put(STORES.ALERTS, newAlert);
      setAlerts(prev => [...prev, newAlert]);
      setModalsOpen(prev => ({ ...prev, alerts: false }));
      toast.success("هشدار با موفقیت ایجاد شد");
    } catch (e) {
      console.error("Failed to add alert:", e);
      toast.error("خطا در ایجاد هشدار");
    }
  };

  const handleRemoveAlert = async (id: string) => {
    try {
      await idbRemove(STORES.ALERTS, id);
      setAlerts(prev => prev.filter(a => a._id !== id));
    } catch (e) {
      console.error("Failed to remove alert:", e);
    }
  };

  const handleToggleAlert = async (id: string, active: boolean) => {
    try {
      const alert = alerts.find(a => a._id === id);
      if (!alert) return;
      const updated = { ...alert, isActive: active };
      await put(STORES.ALERTS, updated);
      setAlerts(prev => prev.map(a => a._id === id ? updated : a));
    } catch (e) {
      console.error("Failed to toggle alert:", e);
    }
  };

  const filteredInstruments = useMemo(() => {
    if (!searchQuery.trim()) return instruments;
    const q = searchQuery.trim().toLowerCase();
    return instruments.filter(i => i.name.includes(q) || i.symbol.includes(q));
  }, [instruments, searchQuery]);

  const activeInstruments = useMemo(() => {
    return filteredInstruments.filter(i => i.segment === "tse" || i.segment === "ifb");
  }, [filteredInstruments]);

  const stats = useMemo(() => {
    const up = instruments.filter(i => i.changePercent > 0).length;
    const down = instruments.filter(i => i.changePercent < 0).length;
    const flat = instruments.filter(i => i.changePercent === 0).length;
    return { up, down, flat, total: instruments.length };
  }, [instruments]);

  // Helper to update stats from real-time service
  const updateStatsFromRealTime = useCallback((newInstruments: ClientInstrument[]) => {
    const up = newInstruments.filter(i => i.change > 0).length;
    const down = newInstruments.filter(i => i.change < 0).length;
    // Stats are computed via useMemo, just updating instruments will trigger recalculation
  }, []);

  // 8 تب اصلی — مرتب شده بر اساس اهمیت برای تریدر
  const sidebarTabs = [
    { id: "market", label: "دیده‌بان بازار", icon: Activity, shortcut: "1" },
    { id: "tabloukhani", label: "تابلوخوانی", icon: Users, shortcut: "2" },
    { id: "signals", label: "سیگنال‌ها", icon: Radio, shortcut: "3" },
    { id: "results", label: "نتایج سیگنال", icon: FileText, shortcut: "4" },
    { id: "gem", label: "کشف گنج", icon: Gem, shortcut: "5" },
    { id: "news", label: "اخبار", icon: BookOpen, shortcut: "6" },
    { id: "portfolio", label: "پرتفوی", icon: Briefcase, shortcut: "7" },
    { id: "backtest", label: "بک‌تست", icon: BarChart3, shortcut: "8" },
  ];

  // Tab‌های پنهانی (از طریق More قابل دسترس)
  const secondaryTabs = [
    { id: "alerts", label: "هشدارها", icon: Shield },
    { id: "codal", label: "کدال", icon: FileText },
    { id: "reports", label: "گزارش‌ها", icon: BarChart3 },
    { id: "risk", label: "مدیریت ریسک", icon: TrendingDown },
    { id: "journal", label: "ژورنال", icon: BookOpen },
    { id: "paper", label: "معامله کاغذی", icon: Coins },
  ];

  const dateStr = now.toLocaleDateString("fa-IR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" dir="rtl">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <RiskDisclaimer />

      {/* ─── Header با طراحی مدرن ─── */}
      <motion.header 
        className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur-xl shadow-lg"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="relative flex items-center justify-between px-4 py-2.5">
          {/* Scan line effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none scan-line opacity-30" />
          
          <div className="flex items-center gap-3 relative z-10">
            <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }}>
              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden hover:bg-primary/10">
                <Activity className="size-4 text-primary" />
              </Button>
            </motion.div>
            <motion.h1 
              className="text-base font-bold flex items-center gap-2.5"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="relative">
                <Activity className="size-5 text-emerald-400 drop-shadow-lg" />
                <div className="absolute inset-0 bg-emerald-400/30 blur-md animate-pulse" />
              </div>
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">نبض بازار</span>
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Badge variant="outline" className="text-[10px] hidden sm:inline-flex bg-primary/10 border-primary/30 text-primary font-semibold">
                {stats.total.toLocaleString("fa-IR")} نماد
              </Badge>
            </motion.div>
            <MarketStatusBar />
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <PerformanceMiniBar />
            <motion.span 
              className="text-[10px] text-muted-foreground hidden sm:inline bg-muted/50 px-2 py-1 rounded-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {dateStr}
            </motion.span>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => void handleRefresh()} 
                disabled={refreshing} 
                className={cn(
                  "gap-1.5 text-xs transition-all",
                  refreshing ? "animate-pulse" : "",
                  "hover:bg-primary/10 hover:border-primary/50"
                )}
              >
                {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                {refreshing ? "بروزرسانی..." : "بروزرسانی"}
              </Button>
            </motion.div>
            <FontSizeControl />
            <ThemeToggle />
            <AppearanceSettingsPanel />
          </div>
        </div>

        {fetchStatus && (
          <motion.div 
            className="flex items-center gap-2 border-t bg-card/50 backdrop-blur-sm px-4 py-1.5 text-xs"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {refreshing && <Loader2 className="size-3 animate-spin text-primary" />}
            <span className={cn(refreshing ? "text-primary" : "text-emerald-400")}>{fetchStatus}</span>
          </motion.div>
        )}

        {/* Network Status — فقط در صورت مشکل */}
        {(() => {
          const net = getNetworkStatus();
          if (net.tsetmc === "ok") return null;
          const color = net.tsetmc === "down" ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400";
          const icon = net.tsetmc === "down" ? "🔴" : "🟡";
          return (
            <motion.div 
              className={`flex items-center gap-2 border-t px-4 py-1.5 text-xs ${color}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
            >
              <span>{icon}</span>
              <span>{net.tsetmc === "down" ? `شبکه قطع — کش قدیمی (${net.consecutiveFailures} بار شکست)` : "شبکه ناپایدار..."}</span>
            </motion.div>
          );
        })()}
      </motion.header>

      <div className="flex gap-4 p-4">
        {/* ─── Sidebar — 8 تب اصلی + secondary ─── */}
        <aside className={cn(
          "sticky top-20 z-30 shrink-0 rounded-2xl border border-border/40 bg-card/80 overflow-hidden transition-all duration-300",
          (sidebarOpen || sidebarHovered) ? "w-48" : "w-12",
          "hidden md:block",
        )}
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <nav className="flex flex-col gap-0.5 p-2">
            {sidebarTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all",
                    isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/50",
                  )}>
                  <Icon className="size-4 shrink-0" />
                  {(sidebarOpen || sidebarHovered) && (
                    <div className="flex items-center justify-between w-full">
                      <span className="truncate">{tab.label}</span>
                      <kbd className="text-[9px] text-muted-foreground/50 border rounded px-1">{tab.shortcut}</kbd>
                    </div>
                  )}
                </button>
              );
            })}

            {/* Separator */}
            <div className="my-1 border-t border-border/20" />

            {/* Secondary tabs */}
            {(sidebarOpen || sidebarHovered) && (
              <div className="text-[9px] text-muted-foreground/40 px-2 pt-1 pb-0.5">ابزارها</div>
            )}
            {secondaryTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all",
                    isActive ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted/50",
                  )}>
                  <Icon className="size-4 shrink-0" />
                  {(sidebarOpen || sidebarHovered) && <span className="truncate">{tab.label}</span>}
                </button>
              );
            })}

            {/* Network Diagnostic — hidden, only on click */}
            <button
              onClick={() => setShowNetworkDiag(!showNetworkDiag)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-all",
                showNetworkDiag ? "bg-amber-500/10 text-amber-500" : "text-muted-foreground/30 hover:text-muted-foreground/50",
              )}>
              <Wrench className="size-4 shrink-0" />
              {(sidebarOpen || sidebarHovered) && <span className="truncate">تشخیص شبکه</span>}
            </button>
          </nav>
        </aside>

        {/* ─── Main Content با طراحی مدرن ─── */}
        <main className="flex-1 min-w-0 relative">
          {/* Network Diagnostic — collapsed by default */}
          {showNetworkDiag && (
            <motion.div 
              className="mb-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
            >
              <NetworkDiagnostic />
            </motion.div>
          )}

          {/* Market Cards - کارت‌های نمایش زنده شاخص‌ها و قیمت‌ها */}
          {activeTab === "market" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <MarketCards />
            </motion.div>
          )}

          {/* Market Stats — با طراحی مدرن و انیمیشن */}
          <motion.div 
            className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <AnimatedCard variant="glass" className="p-4 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-emerald-500/20 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <ArrowUpRight className="size-3 text-emerald-500" />
                  <span>صعودی</span>
                </div>
                <div className="text-2xl font-bold text-emerald-400 drop-shadow-lg">{stats.up.toLocaleString("fa-IR")}</div>
                <div className="text-[10px] text-emerald-500/70 mt-1">نماد مثبت</div>
              </div>
            </AnimatedCard>
            <AnimatedCard variant="glass" className="p-4 relative overflow-hidden group hover:border-red-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-red-500/20 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <ArrowDownRight className="size-3 text-red-500" />
                  <span>نزولی</span>
                </div>
                <div className="text-2xl font-bold text-red-400 drop-shadow-lg">{stats.down.toLocaleString("fa-IR")}</div>
                <div className="text-[10px] text-red-500/70 mt-1">نماد منفی</div>
              </div>
            </AnimatedCard>
            <AnimatedCard variant="glass" className="p-4 relative overflow-hidden group hover:border-amber-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-amber-500/20 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Zap className="size-3 text-amber-500" />
                  <span>سیگنال فعال</span>
                </div>
                <div className="text-2xl font-bold text-amber-400 drop-shadow-lg">{localSignals.filter(s => s.signal !== "hold").length}</div>
                <div className="text-[10px] text-amber-500/70 mt-1">فرصت معاملاتی</div>
              </div>
            </AnimatedCard>
            <AnimatedCard variant="glass" className="p-4 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-blue-500/20 transition-colors" />
              <div className="relative">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <FileText className="size-3 text-blue-500" />
                  <span>گزارش کدال</span>
                </div>
                <div className="text-2xl font-bold text-blue-400 drop-shadow-lg">{localCodal.length}</div>
                <div className="text-[10px] text-blue-500/70 mt-1">اطلاعیه جدید</div>
              </div>
            </AnimatedCard>
          </motion.div>

          {/* Search با طراحی مدرن */}
          {activeTab === "market" && (
            <motion.div 
              className="mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="relative max-w-md group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-emerald-500/20 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <div className="relative flex items-center">
                  <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="جستجوی نماد..." 
                    className="w-full rounded-xl border bg-card/80 backdrop-blur-sm px-9 py-2.5 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all" 
                    dir="rtl" 
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab Content — 8 اصلی + 5 ثانویه */}
          <AsyncErrorBoundary tabName="Dashboard">
            {activeTab === "market" && (
              selectedInstrument ? (
                <InstrumentDetail instrument={selectedInstrument} open={true} onOpenChange={(v) => !v && setSelectedInstrument(null)} />
              ) : (
                <InstrumentTable instruments={activeInstruments} segment={"tse" as "tse"} onSelect={(inst) => setSelectedInstrument(inst as ClientInstrument)} />
              )
            )}
            {activeTab === "tabloukhani" && <Suspense fallback={<TabLoader />}><LazyTablouKhaniTab instruments={instruments} onSelect={(i) => setSelectedInstrument(i as ClientInstrument)} /></Suspense>}
            {activeTab === "signals" && <SignalsTab localSignals={localSignals} onRefresh={() => void handleRefresh()} />}
            {activeTab === "results" && <Suspense fallback={<TabLoader />}><LazySignalResultsTab /></Suspense>}
            {activeTab === "gem" && <Suspense fallback={<TabLoader />}><LazyGemHunterTab instruments={instruments} onSelect={(i) => setSelectedInstrument(i as ClientInstrument)} /></Suspense>}
            {activeTab === "news" && <Suspense fallback={<TabLoader />}><LazyNewsTab /></Suspense>}
            {activeTab === "portfolio" && <PortfolioTab portfolio={portfolio} onAdd={() => setModalsOpen(prev => ({ ...prev, portfolio: true }))} onRemove={handleRemovePortfolioItem} />}
            {activeTab === "backtest" && <Suspense fallback={<TabLoader />}><LazyBacktestTab /></Suspense>}
            {activeTab === "alerts" && <AlertsTab alerts={alerts} onAdd={() => setModalsOpen(prev => ({ ...prev, alerts: true }))} onRemove={handleRemoveAlert} onToggle={handleToggleAlert} />}
            {/* Secondary tabs */}
            {activeTab === "codal" && <Suspense fallback={<TabLoader />}><LazyCodalTab /></Suspense>}
            {activeTab === "reports" && <Suspense fallback={<TabLoader />}><LazyReportsTab /></Suspense>}
            {activeTab === "risk" && <RiskCalculatorTab />}
            {activeTab === "journal" && <JournalTab />}
            {activeTab === "paper" && <PaperTradingTab />}
          </AsyncErrorBoundary>
        </main>
      </div>

      {/* ─── Modals با انیمیشن ─── */}
      <AnimatePresence>
        {modalsOpen.portfolio && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PortfolioModal
              open={modalsOpen.portfolio}
              onOpenChange={(open) => setModalsOpen(prev => ({ ...prev, portfolio: open }))}
              onAdd={handleAddPortfolioItem}
              onImport={handleImportPortfolioItems}
            />
          </motion.div>
        )}
        {modalsOpen.alerts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AlertModal
              open={modalsOpen.alerts}
              onOpenChange={(open) => setModalsOpen(prev => ({ ...prev, alerts: open }))}
              onAdd={handleAddAlert}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Footer Disclaimer با طراحی مدرن ─── */}
      <motion.footer 
        className="border-t bg-card/30 backdrop-blur-sm px-4 py-4 text-center relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-50" />
        <p className="text-[10px] text-muted-foreground/60 leading-relaxed max-w-2xl mx-auto relative z-10">
          ⚠️ <span className="font-semibold">هشدار ریسک:</span> سیگنال‌ها و تحلیل‌های ارائه شده صرفاً جنبه کمکی دارند و هیچ تضمینی برای دقت آن‌ها وجود ندارد.
          بازار سرمایه دارای ریسک است. قبل از هر تصمیم معاملاتی، با مشاور مالی معتبر مشورت کنید.
          مسئولیت تمامی تصمیمات معاملاتی بر عهده کاربر است.
        </p>
      </motion.footer>
    </div>
  );
}
