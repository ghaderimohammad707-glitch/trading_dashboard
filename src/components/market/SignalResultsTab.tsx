/**
 * تب نتایج سیگنال‌ها — ذخیره دائمی + حذف خودکار
 * Signals are stored in IndexedDB and auto-removed when:
 * - Reached target price (✅)
 * - Analysis was wrong (❌)
 * - Expired (⏰)
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Filter,
  BarChart3,
  RefreshCw,
  Target,
  AlertTriangle,
  Zap,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAll, put, clear, STORES, bulkSave } from "@/lib/idb";
import type { CompositeSignal } from "@/lib/analysisEngines";
import { getCachedInstruments } from "@/lib/clientFetch";

export interface SavedSignal extends CompositeSignal {
  _id: string;
  savedAt: number;
  status: "active" | "hit_target" | "wrong" | "expired";
  last: number;
  targetPrice?: number;
  stopLoss?: number;
  actualResult?: { pnl: number; exitPrice: number; exitDate: string };
}

/**
 * Save a new signal to Signal Results tab
 * Called when signals are generated
 */
function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Lightweight in-memory dedup cache (avoids IDB read on every save)
const _recentSignals = new Map<string, number>(); // key: symbol+signal, value: timestamp

function isDuplicate(signal: CompositeSignal): boolean {
  const key = `${signal.symbol}:${signal.signal}`;
  const lastSaved = _recentSignals.get(key);
  if (lastSaved && Date.now() - lastSaved < 60 * 60 * 1000) {
    return true; // Duplicate within 1 hour
  }
  return false;
}

export async function saveSignalToResults(signal: CompositeSignal): Promise<void> {
  try {
    const now = Date.now();
    
    // Fast dedup check using in-memory cache (no IDB read)
    if (isDuplicate(signal)) return;
    
    const savedSignal: SavedSignal = {
      ...signal,
      _id: genId(), // Required for IDB keyPath
      savedAt: now,
      status: "active",
      last: signal.entryPrice || 0,
      targetPrice: signal.targetPrice,
      stopLoss: signal.stopLoss,
    };
    
    await put(STORES.SIGNAL_HISTORY, savedSignal);
    _recentSignals.set(`${signal.symbol}:${signal.signal}`, now);
    console.log(`[SignalResults] Saved signal: ${signal.symbol} ${signal.signal}`);
  } catch (e) {
    console.error("[SignalResults] Failed to save signal:", e);
  }
}

function getSignalAge(savedAt: number): string {
  const diff = Date.now() - savedAt;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days} روز پیش`;
}

function calculateCurrentPnl(sig: SavedSignal): { pnl: number; pnlPercent: number } | null {
  if (sig.last <= 0) return null;
  const instruments = getCachedInstruments();
  const inst = instruments.find(i => i.symbol === sig.symbol);
  if (!inst || inst.last <= 0) return null;
  
  if (sig.signal === "buy") {
    const pnl = inst.last - sig.last;
    const pnlPercent = (pnl / sig.last) * 100;
    return { pnl, pnlPercent };
  } else if (sig.signal === "sell") {
    const pnl = sig.last - inst.last;
    const pnlPercent = (pnl / sig.last) * 100;
    return { pnl, pnlPercent };
  }
  return null;
}

export function SignalResultsTab() {
  const [signals, setSignals] = useState<SavedSignal[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "hit_target" | "wrong" | "expired">("all");
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    loadSignals();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      checkSignalOutcomes();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, signals]);

  async function loadSignals() {
    setLoading(true);
    try {
      const stored = await getAll<SavedSignal>(STORES.SIGNAL_HISTORY);
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      // Auto-expire old signals
      const valid = (stored || []).filter((s) => {
        if (s.status !== "active") return true;
        return now - s.savedAt < maxAge;
      });
      // Update expired status
      const updated = valid.map((s) => {
        if (s.status === "active" && now - s.savedAt > 7 * 24 * 60 * 60 * 1000) {
          return { ...s, status: "expired" as const };
        }
        return s;
      });
      // Ensure every signal has _id for IDB
      const withIds = updated.map(s => s._id ? s : { ...s, _id: genId() });
      setSignals(withIds);
      await bulkSave(STORES.SIGNAL_HISTORY, withIds);
    } catch {
      setSignals([]);
    }
    setLoading(false);
  }

  async function checkSignalOutcomes() {
    const instruments = getCachedInstruments();
    const updated = signals.map(sig => {
      if (sig.status !== "active") return sig;
      
      const inst = instruments.find(i => i.symbol === sig.symbol);
      if (!inst || inst.last <= 0) return sig;
      
      // Auto-check if hit target
      if (sig.targetPrice && sig.signal === "buy" && inst.last >= sig.targetPrice) {
        return { ...sig, status: "hit_target" as const };
      }
      if (sig.targetPrice && sig.signal === "sell" && inst.last <= sig.targetPrice) {
        return { ...sig, status: "hit_target" as const };
      }
      
      // Auto-check if hit stop loss
      if (sig.stopLoss && sig.signal === "buy" && inst.last <= sig.stopLoss) {
        return { ...sig, status: "wrong" as const };
      }
      if (sig.stopLoss && sig.signal === "sell" && inst.last >= sig.stopLoss) {
        return { ...sig, status: "wrong" as const };
      }
      
      return sig;
    });
    
    setSignals(updated);
    await bulkSave(STORES.SIGNAL_HISTORY, updated.filter(s => s._id));
  }

  async function markSignal(idx: number, status: SavedSignal["status"], pnl?: number) {
    const updated = [...signals];
    updated[idx] = {
      ...updated[idx],
      status,
      actualResult: pnl !== undefined
        ? { pnl, exitPrice: updated[idx].last, exitDate: new Date().toISOString() }
        : updated[idx].actualResult,
    };
    setSignals(updated);
    await bulkSave(STORES.SIGNAL_HISTORY, updated.filter(s => s._id));
  }

  async function removeSignal(idx: number) {
    const updated = signals.filter((_, i) => i !== idx);
    setSignals(updated);
    await bulkSave(STORES.SIGNAL_HISTORY, updated.filter(s => s._id));
  }

  async function clearAll() {
    setSignals([]);
    await clear(STORES.SIGNAL_HISTORY);
  }

  const filtered = useMemo(() => {
    if (filter === "all") return signals;
    return signals.filter((s) => s.status === filter);
  }, [signals, filter]);

  const stats = useMemo(() => {
    const active = signals.filter((s) => s.status === "active").length;
    const hit = signals.filter((s) => s.status === "hit_target").length;
    const wrong = signals.filter((s) => s.status === "wrong").length;
    const expired = signals.filter((s) => s.status === "expired").length;
    const winRate = hit + wrong > 0 ? Math.round((hit / (hit + wrong)) * 100) : 0;
    return { active, hit, wrong, expired, winRate, total: signals.length };
  }, [signals]);

  const statusIcon = (status: SavedSignal["status"]) => {
    switch (status) {
      case "active": return <Clock className="size-4 text-blue-400" />;
      case "hit_target": return <CheckCircle className="size-4 text-emerald-400" />;
      case "wrong": return <XCircle className="size-4 text-red-400" />;
      case "expired": return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  const statusLabel = (status: SavedSignal["status"]) => {
    switch (status) {
      case "active": return "فعال";
      case "hit_target": return "رسید به هدف ✅";
      case "wrong": return "تحلیل اشتباه ❌";
      case "expired": return "منقضی‌شده ⏰";
    }
  };

  const statusColor = (status: SavedSignal["status"]) => {
    switch (status) {
      case "active": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "hit_target": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "wrong": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "expired": return "bg-muted text-muted-foreground border-border";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent ml-2" />
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">نتایج سیگنال‌ها</h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} سیگنال ذخیره‌شده · پیگیری خودکار وضعیت
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-1.5"
          >
            <Activity className={cn("size-3.5", autoRefresh && "animate-pulse")} />
            {autoRefresh ? "پایش فعال" : "پایش خودکار"}
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll} className="gap-1.5 text-destructive">
            <Trash2 className="size-3.5" /> پاک کردن همه
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: "فعال", value: stats.active, color: "text-blue-400", icon: <Clock className="size-4" /> },
          { label: "رسید به هدف", value: stats.hit, color: "text-emerald-400", icon: <Target className="size-4" /> },
          { label: "اشتباه", value: stats.wrong, color: "text-red-400", icon: <AlertTriangle className="size-4" /> },
          { label: "منقضی", value: stats.expired, color: "text-muted-foreground", icon: <Clock className="size-4" /> },
          { label: "نرخ برد", value: `${stats.winRate}%`, color: stats.winRate >= 50 ? "text-emerald-400" : "text-red-400", icon: <Zap className="size-4" /> },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
            <div className="flex justify-center mb-1 text-muted-foreground">{s.icon}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 flex-wrap">
        <Filter className="size-3.5 text-muted-foreground" />
        {(["all", "active", "hit_target", "wrong", "expired"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="h-7 text-xs"
          >
            {f === "all" ? "همه" : statusLabel(f)}
          </Button>
        ))}
      </div>

      {/* Signal Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card py-16 text-center text-sm text-muted-foreground">
          <BarChart3 className="mx-auto mb-2 size-8 opacity-30" />
          {filter === "all" ? "هنوز سیگنالی ذخیره نشده" : "سیگنالی در این دسته‌بندی نیست"}
        </div>
      ) : (
        <AnimatePresence>
          {filtered.map((sig, idx) => {
            const realIdx = signals.indexOf(sig);
            const currentPnl = calculateCurrentPnl(sig);
            
            return (
              <motion.div
                key={`${sig.symbol}-${sig.savedAt}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {statusIcon(sig.status)}
                      <span className="font-bold">{sig.symbol}</span>
                      <span className="text-xs text-muted-foreground">{sig.name}</span>
                      <Badge className={`text-[10px] border ${statusColor(sig.status)}`}>
                        {statusLabel(sig.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-mono text-xs" dir="ltr">
                        {sig.last.toLocaleString("fa-IR")}
                      </span>
                      <span className={`flex items-center gap-1 font-semibold ${sig.signal === "buy" ? "text-emerald-400" : sig.signal === "sell" ? "text-red-400" : "text-yellow-400"}`}>
                        {sig.signal === "buy" ? <TrendingUp className="size-3" /> : sig.signal === "sell" ? <TrendingDown className="size-3" /> : null}
                        {sig.signal === "buy" ? "خرید" : sig.signal === "sell" ? "فروش" : "نگهداری"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        قدرت: {sig.strength}٪ | اطمینان: {sig.compositeScore > 0 ? "+" : ""}{sig.compositeScore}
                      </span>
                    </div>

                    {sig.targetPrice && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        🎯 هدف: {sig.targetPrice.toLocaleString("fa-IR")} | 🛑 حد ضرر: {sig.stopLoss?.toLocaleString("fa-IR")}
                      </div>
                    )}

                    {/* Current PnL */}
                    {currentPnl && sig.status === "active" && (
                      <div className={cn(
                        "mt-2 p-2 rounded-lg text-xs font-semibold",
                        currentPnl.pnl >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      )}>
                        سود/زیان فعلی: {currentPnl.pnl >= 0 ? "+" : ""}{currentPnl.pnl.toFixed(0)} ({currentPnl.pnlPercent >= 0 ? "+" : ""}{currentPnl.pnlPercent.toFixed(1)}٪)
                      </div>
                    )}

                    {/* Engine Scores */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        { name: "تکنیکال", score: sig.technical.score, icon: "📊" },
                        { name: "بنیادی", score: sig.fundamental.score, icon: "📋" },
                        { name: "حجمی", score: sig.volume.score, icon: "📈" },
                        { name: "تابلو", score: sig.tablouKhani.score, icon: "🔍" },
                        { name: "احساسات", score: sig.sentiment.score, icon: "💭" },
                      ].map((engine) => (
                        <div key={engine.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>{engine.icon}</span>
                          <span>{engine.name}</span>
                          <span className={cn(
                            "font-semibold",
                            engine.score > 0 ? "text-emerald-400" : engine.score < 0 ? "text-red-400" : "text-muted-foreground"
                          )} dir="ltr">
                            {engine.score > 0 ? "+" : ""}{engine.score}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      ⏰ {getSignalAge(sig.savedAt)} | 💎 Gem: {sig.gemScore ?? "—"}
                    </div>
                  </div>

                  {/* Actions */}
                  {sig.status === "active" && (
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-emerald-400 hover:text-emerald-300"
                        onClick={() => markSignal(realIdx, "hit_target")}
                      >
                        ✅ رسید به هدف
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-red-400 hover:text-red-300"
                        onClick={() => markSignal(realIdx, "wrong")}
                      >
                        ❌ اشتباه
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] text-muted-foreground"
                        onClick={() => removeSignal(realIdx)}
                      >
                        🗑
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" ");
