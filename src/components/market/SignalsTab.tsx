"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { faNumber } from "@/lib/format";
import type { CompositeSignal } from "@/lib/analysisEngines";
import { TrendingUp, TrendingDown, Minus, Search, Filter } from "lucide-react";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useMemo, useState } from "react";

interface SignalsTabProps {
  localSignals: CompositeSignal[];
  onRefresh: () => void;
}

// Signal history stored in localStorage
const HISTORY_KEY = "nabz_signal_history";
interface SignalHistoryEntry {
  symbol: string;
  signal: string;
  strength: number;
  timestamp: number;
}
function getSignalHistory(): SignalHistoryEntry[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}
function saveSignalHistory(signals: CompositeSignal[]) {
  const history = getSignalHistory();
  const now = Date.now();
  const newEntries = signals
    .filter(s => s.signal !== "hold")
    .map(s => ({
      symbol: s.symbol,
      signal: s.signal,
      strength: s.strength,
      timestamp: now,
    }));
  // Keep last 200 entries
  const merged = [...newEntries, ...history].slice(0, 200);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(merged)); } catch {}
}

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: string }) {
  const normalized = Math.max(-100, Math.min(100, score));
  const width = Math.abs(normalized);
  const isPositive = normalized > 0;
  const isNegative = normalized < 0;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-14 text-muted-foreground shrink-0">{icon} {label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/40">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            isPositive ? "bg-gradient-to-l from-emerald-500 to-emerald-400" : isNegative ? "bg-gradient-to-r from-rose-500 to-rose-400" : "bg-muted-foreground/30"
          )}
          style={{ width: `${width / 2}%`, float: isNegative ? "right" : "left" }}
        />
      </div>
      <span dir="ltr" className={cn("text-[10px] font-semibold tabular-nums-fa w-6 text-right", isPositive ? "text-emerald-500" : isNegative ? "text-rose-500" : "text-muted-foreground")}>
        {normalized > 0 ? "+" : ""}{normalized}
      </span>
    </div>
  );
}

function SignalCard({ sig, rank }: { sig: CompositeSignal; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  const radarData = useMemo(() => [
    { name: "تکنیکال", value: Math.max(0, sig.technical.score), fullMark: 100 },
    { name: "بنیادی", value: Math.max(0, sig.fundamental.score), fullMark: 100 },
    { name: "حجمی", value: Math.max(0, sig.volume.score), fullMark: 100 },
    { name: "تابلوخوانی", value: Math.max(0, sig.tablouKhani.score), fullMark: 100 },
    { name: "احساسات", value: Math.max(0, sig.sentiment.score), fullMark: 100 },
  ], [sig]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: rank * 0.05 }}
      className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/30"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex size-7 items-center justify-center rounded-lg text-[11px] font-bold",
              sig.signal === "buy" ? "bg-emerald-500/10 text-emerald-500" : sig.signal === "sell" ? "bg-rose-500/10 text-rose-500" : "bg-muted text-muted-foreground"
            )}>
              #{rank + 1}
            </div>
            <div>
              <span className="font-bold text-sm">{sig.symbol}</span>
              <span className="mr-2 text-[10px] text-muted-foreground">{sig.name}</span>
            </div>
          </div>
          <Badge
            variant={sig.signal === "buy" ? "default" : sig.signal === "sell" ? "destructive" : "secondary"}
            className={cn(
              "text-[10px] gap-1",
              sig.signal === "buy" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
              sig.signal === "sell" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
            )}
          >
            {sig.signal === "buy" ? <TrendingUp className="size-3" /> : sig.signal === "sell" ? <TrendingDown className="size-3" /> : <Minus className="size-3" />}
            {sig.signal === "buy" ? "خرید" : sig.signal === "sell" ? "فروش" : "نگهداری"}
          </Badge>
        </div>

        {/* Strength */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">قدرت سیگنال</span>
            <span dir="ltr" className="text-xs font-bold tabular-nums-fa">{sig.strength}٪</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted/40">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${sig.strength}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                sig.signal === "buy" ? "bg-gradient-to-l from-emerald-500 to-emerald-400" : sig.signal === "sell" ? "bg-gradient-to-r from-rose-500 to-rose-400" : "bg-gradient-to-r from-muted-foreground/50 to-muted-foreground/30"
              )}
            />
          </div>
        </div>

        {/* Score bars */}
        <div className="flex flex-col gap-1.5 mb-3">
          <ScoreBar label="تکنیکال" score={sig.technical.score} icon="📊" />
          <ScoreBar label="بنیادی" score={sig.fundamental.score} icon="📋" />
          <ScoreBar label="حجمی" score={sig.volume.score} icon="📈" />
          <ScoreBar label="تابلو" score={sig.tablouKhani.score} icon="🔍" />
          <ScoreBar label="احساسات" score={sig.sentiment.score} icon="💭" />
        </div>

        {/* Reasons */}
        {sig.reasons.length > 0 && (
          <div className={cn(
            "flex flex-col gap-0.5 pt-2 border-t border-border/30 transition-all duration-300",
            !expanded && "max-h-[60px] overflow-hidden relative"
          )}>
            {sig.reasons.map((r, i) => (
              <span key={i} className="text-[10px] leading-4 text-muted-foreground">{r}</span>
            ))}
            {!expanded && sig.reasons.length > 2 && (
              <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent" />
            )}
          </div>
        )}

        {sig.reasons.length > 2 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-primary hover:text-primary/80 transition-colors mt-1 cursor-pointer"
          >
            {expanded ? "بستن" : `بیشتر (${sig.reasons.length} دلیل)`}
          </button>
        )}
      </div>
    </motion.div>
  );
}

type SegmentFilter = "all" | "tse" | "ifb" | "option" | "commodity" | "fund";

const SEGMENT_FILTERS: { id: SegmentFilter; label: string; icon: string }[] = [
  { id: "all", label: "همه", icon: "📋" },
  { id: "tse", label: "بورس", icon: "📈" },
  { id: "ifb", label: "فرابورس", icon: "📊" },
  { id: "option", label: "اختیار", icon: "🔢" },
  { id: "commodity", label: "کالا/ارز", icon: "💰" },
  { id: "fund", label: "صندوق", icon: "🏦" },
];

/** Detect segment from signal name/symbol */
function detectSegment(sig: CompositeSignal): string {
  const name = sig.name + " " + sig.symbol;
  if (name.includes("اختيار") || name.includes("اختیار")) return "option";
  if (name.includes("صندوق") || name.includes("سرمایه")) return "fund";
  if (name.includes("سکه") || name.includes("طلا") || name.includes("دلار") || name.includes("یورو") || name.includes("نقره") || name.includes("نفت") || name.includes("XAU") || name.includes("XAG")) return "commodity";
  if (sig.symbol.startsWith("ض") || sig.symbol.startsWith("ط") || sig.symbol.startsWith("م")) return "option";
  // TSE stocks usually have 4-5 character Persian symbols
  if (sig.symbol.length >= 3 && sig.symbol.length <= 8) return "tse";
  return "tse";
}

export function SignalsTab({ localSignals, onRefresh }: SignalsTabProps) {
  const [signalFilter, setSignalFilter] = useState<"all" | "buy" | "sell" | "hold">("all");
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");
  const [minStrength, setMinStrength] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSignals = useMemo(() => {
    return localSignals.filter((s) => {
      if (signalFilter !== "all" && s.signal !== signalFilter) return false;
      if (s.strength < minStrength) return false;
      if (segmentFilter !== "all" && detectSegment(s) !== segmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!s.symbol.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [localSignals, signalFilter, minStrength, searchQuery, segmentFilter]);

  const buyCount = localSignals.filter((s) => s.signal === "buy").length;
  const sellCount = localSignals.filter((s) => s.signal === "sell").length;
  const holdCount = localSignals.filter((s) => s.signal === "hold").length;
  const tseCount = localSignals.filter((s) => detectSegment(s) === "tse").length;
  const ifbCount = localSignals.filter((s) => detectSegment(s) === "ifb").length;
  const optionCount = localSignals.filter((s) => detectSegment(s) === "option").length;
  const commodityCount = localSignals.filter((s) => detectSegment(s) === "commodity").length;
  const fundCount = localSignals.filter((s) => detectSegment(s) === "fund").length;

  const distributionData = [
    { name: "خرید", value: buyCount, color: "#10b981" },
    { name: "فروش", value: sellCount, color: "#f43f5e" },
    { name: "نگهداری", value: holdCount, color: "#94a3b8" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">سیگنال‌های معاملاتی</h2>
          <p className="text-xs text-muted-foreground mt-0.5">موتورهای تحلیل: تکنیکال • بنیادی • حجمی • تابلوخوانی • احساسات</p>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={onRefresh}
          className="gap-1.5 rounded-xl"
        >
          <TrendingUp className="size-3.5" /> بروزرسانی
        </Button>
      </div>

      {localSignals.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card/60 py-20 text-center text-sm text-muted-foreground">
          سیگنالی تولید نشده. ابتدا داده بازار را دریافت کنید.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
              <div className="text-2xl font-bold text-emerald-500">{buyCount}</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400">سیگنال خرید</div>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
              <div className="text-2xl font-bold text-rose-500">{sellCount}</div>
              <div className="text-[10px] text-rose-600 dark:text-rose-400">سیگنال فروش</div>
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/30 p-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground">{holdCount}</div>
              <div className="text-[10px] text-muted-foreground">نگهداری</div>
            </div>
          </div>

          {/* Distribution chart */}
          <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3">توزیع سیگنال‌ها</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={distributionData} layout="vertical" margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "currentColor", className: "text-muted-foreground" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "currentColor", className: "text-muted-foreground" }} width={60} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/40 bg-card/60 p-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نماد..."
                className="w-full pr-8 pl-3 h-8 rounded-lg border bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                dir="ltr"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(["all", "buy", "sell", "hold"] as const).map((f) => (
                <Button
                  key={f}
                  variant={signalFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSignalFilter(f)}
                  className="h-7 text-[10px]"
                >
                  {f === "all" ? "همه" : f === "buy" ? `🟢 خرید (${buyCount})` : f === "sell" ? `🔴 فروش (${sellCount})` : `🟡 نگه (${holdCount})`}
                </Button>
              ))}
            </div>
            {/* Segment filters */}
            <div className="flex gap-1 flex-wrap border-r border-border/30 pr-2">
              {SEGMENT_FILTERS.map((sf) => {
                const counts: Record<string, number> = { all: localSignals.length, tse: tseCount, ifb: ifbCount, option: optionCount, commodity: commodityCount, fund: fundCount };
                return (
                  <Button
                    key={sf.id}
                    variant={segmentFilter === sf.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSegmentFilter(sf.id)}
                    className="h-7 text-[10px]"
                  >
                    {sf.icon} {sf.label} ({counts[sf.id] || 0})
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">حداقل قدرت:</span>
              <input
                type="range"
                min={0}
                max={100}
                value={minStrength}
                onChange={(e) => setMinStrength(Number(e.target.value))}
                className="w-20 h-1 accent-primary"
              />
              <span className="text-[10px] text-muted-foreground tabular-nums-fa" dir="ltr">{minStrength}%</span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              نمایش {filteredSignals.length} از {localSignals.length}
            </span>
          </div>

          {/* Signal cards — scrollable */}
          <div className="max-h-[70vh] overflow-y-auto rounded-2xl border border-border/30 bg-card/40 p-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent" style={{ scrollBehavior: 'smooth' }}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredSignals.map((sig, i) => (
                <SignalCard key={sig.symbol} sig={sig} rank={i} />
              ))}
            </div>
          </div>
          {filteredSignals.length === 0 && (
            <div className="rounded-2xl border border-border/40 bg-card/60 py-10 text-center text-sm text-muted-foreground">
              <Filter className="mx-auto mb-2 size-6 opacity-30" />
              <p>سیگنالی با فیلترهای انتخابی یافت نشد</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
