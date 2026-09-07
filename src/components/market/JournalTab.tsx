/**
 * تب ژورنال معاملاتی — ثبت معاملات + نمودارهای تعاملی + تحلیل عملکرد
 */
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Trash2,
  RefreshCw,
  Filter,
  Search,
  Tag,
  Target,
  Clock,
  Zap,
  Activity,
  Calendar,
  Award,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAll, put, clear, STORES, bulkSave } from "@/lib/idb";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartPie,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from "recharts";

export interface JournalEntry {
  _id: string;
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  entryDate: string;
  exitDate?: string;
  notes?: string;
  tags: string[];
  pnl?: number;
  pnlPercent?: number;
  status: "open" | "closed";
  strategy?: string;
  setup?: string;
}

const JOURNAL_KEY = "trading_journal";

const STRATEGIES = [
  "اسکلپ",
  "دی‌ترید",
  "سوئینگ",
  "پوزیشن",
  "مومنتوم",
  "بریک‌اوت",
  "افزایش سرمایه",
  "سهامداری",
];

const SETUPS = [
  "حمایت",
  "مقاومت",
  "شکست خط روند",
  "گپ",
  "الگوی کندلی",
  "واگرایی",
  "حجم مشکوک",
  "صف خرید",
];

const TAGS = [
  "موفق",
  "شکست",
  "آموزشی",
  "تکرارشونده",
  "рیسک‌پذیر",
  "محافظه‌کار",
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7", "#06b6d4", "#ec4899", "#f97316"];

export function JournalTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "closed" | "win" | "loss">("all");
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [form, setForm] = useState({
    symbol: "",
    side: "buy" as "buy" | "sell",
    quantity: "",
    entryPrice: "",
    exitPrice: "",
    notes: "",
    strategy: "",
    setup: "",
    tags: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"overview" | "analytics" | "trades">("overview");

  useEffect(() => { loadEntries(); }, []);

  async function loadEntries() {
    const stored = await getAll<JournalEntry>(STORES.JOURNAL);
    // Ensure tags array and _id exist
    const entriesWithTags = (stored || []).map(e => ({
      ...e,
      _id: e._id || e.id || genId(),
      tags: e.tags || [],
    }));
    setEntries(entriesWithTags);
    setLoading(false);
  }

  async function saveEntries(newEntries: JournalEntry[]) {
    setEntries(newEntries);
    await bulkSave(STORES.JOURNAL, newEntries);
  }

  function addEntry() {
    if (!form.symbol || !form.quantity || !form.entryPrice) return;
    const qty = parseInt(form.quantity);
    const entry = parseFloat(form.entryPrice);
    const exit = form.exitPrice ? parseFloat(form.exitPrice) : undefined;
    const pnl = exit ? (form.side === "buy" ? (exit - entry) * qty : (entry - exit) * qty) : undefined;
    const pnlPct = pnl !== undefined ? ((pnl / (entry * qty)) * 100) : undefined;

    const genIdVal = genId();
    const newEntry: JournalEntry = {
      _id: genIdVal,
      id: genIdVal,
      symbol: form.symbol,
      side: form.side,
      quantity: qty,
      entryPrice: entry,
      exitPrice: exit,
      entryDate: new Date().toISOString(),
      exitDate: exit ? new Date().toISOString() : undefined,
      notes: form.notes,
      tags: form.tags,
      pnl,
      pnlPercent: pnlPct,
      status: exit ? "closed" : "open",
      strategy: form.strategy,
      setup: form.setup,
    };

    saveEntries([newEntry, ...entries]);
    setForm({ symbol: "", side: "buy", quantity: "", entryPrice: "", exitPrice: "", notes: "", strategy: "", setup: "", tags: [] });
    setShowAdd(false);
  }

  function closeEntry(id: string, exitPrice: number) {
    const updated = entries.map((e) => {
      if (e.id !== id) return e;
      const pnl = e.side === "buy" ? (exitPrice - e.entryPrice) * e.quantity : (e.entryPrice - exitPrice) * e.quantity;
      return { ...e, exitPrice, exitDate: new Date().toISOString(), pnl, pnlPercent: (pnl / (e.entryPrice * e.quantity)) * 100, status: "closed" as const };
    });
    saveEntries(updated);
  }

  function removeEntry(id: string) {
    saveEntries(entries.filter((e) => e.id !== id));
  }

  function toggleTag(tag: string) {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  // ─── Analytics ───
  const stats = useMemo(() => {
    const closed = entries.filter((e) => e.status === "closed");
    const wins = closed.filter((e) => (e.pnl || 0) > 0);
    const losses = closed.filter((e) => (e.pnl || 0) < 0);
    const totalPnl = closed.reduce((s, e) => s + (e.pnl || 0), 0);
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, e) => s + (e.pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, e) => s + Math.abs(e.pnl || 0), 0) / losses.length : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
    const avgHoldingTime = closed.length > 0
      ? closed.reduce((s, e) => {
          if (e.entryDate && e.exitDate) {
            return s + (new Date(e.exitDate).getTime() - new Date(e.entryDate).getTime());
          }
          return s;
        }, 0) / closed.length
      : 0;
    const maxWin = wins.length > 0 ? Math.max(...wins.map(e => e.pnl || 0)) : 0;
    const maxLoss = losses.length > 0 ? Math.min(...losses.map(e => e.pnl || 0)) : 0;
    
    return {
      total: entries.length,
      open: entries.filter((e) => e.status === "open").length,
      closed: closed.length,
      wins: wins.length,
      losses: losses.length,
      totalPnl,
      winRate: Math.round(winRate),
      avgWin: Math.round(avgWin),
      avgLoss: Math.round(avgLoss),
      profitFactor: profitFactor === Infinity ? "∞" : profitFactor.toFixed(2),
      avgHoldingTime: Math.round(avgHoldingTime / (1000 * 60 * 60)), // hours
      maxWin: Math.round(maxWin),
      maxLoss: Math.round(maxLoss),
    };
  }, [entries]);

  // ─── Filtered Entries ───
  const filtered = useMemo(() => {
    let result = entries;
    if (filter === "open") result = result.filter(e => e.status === "open");
    if (filter === "closed") result = result.filter(e => e.status === "closed");
    if (filter === "win") result = result.filter(e => e.pnl !== undefined && e.pnl > 0);
    if (filter === "loss") result = result.filter(e => e.pnl !== undefined && e.pnl < 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(e => e.symbol.includes(q) || e.notes?.includes(q));
    }
    if (selectedTags.length > 0) {
      result = result.filter(e => selectedTags.some(t => e.tags?.includes(t)));
    }
    return result;
  }, [entries, filter, search, selectedTags]);

  // ─── Chart Data ───
  const equityCurve = useMemo(() => {
    const closed = entries.filter((e) => e.status === "closed" && e.pnl !== undefined);
    let cumPnl = 0;
    return closed.map((e, i) => {
      cumPnl += e.pnl || 0;
      return { name: `${i + 1}`, pnl: e.pnl, cumPnl, symbol: e.symbol };
    });
  }, [entries]);

  const pnlBySymbol = useMemo(() => {
    const map: Record<string, number> = {};
    entries.filter((e) => e.pnl !== undefined).forEach((e) => { map[e.symbol] = (map[e.symbol] || 0) + (e.pnl || 0); });
    return Object.entries(map).map(([symbol, pnl]) => ({ symbol, pnl })).sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  }, [entries]);

  const pnlByStrategy = useMemo(() => {
    const map: Record<string, { pnl: number; count: number }> = {};
    entries.filter(e => e.strategy && e.pnl !== undefined).forEach(e => {
      if (!map[e.strategy!]) map[e.strategy!] = { pnl: 0, count: 0 };
      map[e.strategy!].pnl += e.pnl || 0;
      map[e.strategy!].count++;
    });
    return Object.entries(map)
      .map(([strategy, data]) => ({ strategy, ...data, avg: data.count > 0 ? data.pnl / data.count : 0 }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [entries]);

  const winLossPie = useMemo(() => [
    { name: "برنده", value: stats.wins, color: "#22c55e" },
    { name: "بازنده", value: stats.losses, color: "#ef4444" },
  ], [stats]);

  const tagStats = useMemo(() => {
    const map: Record<string, { count: number; pnl: number }> = {};
    entries.forEach(e => {
      e.tags?.forEach(tag => {
        if (!map[tag]) map[tag] = { count: 0, pnl: 0 };
        map[tag].count++;
        map[tag].pnl += e.pnl || 0;
      });
    });
    return Object.entries(map).map(([tag, data]) => ({ tag, ...data }));
  }, [entries]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent ml-2" />در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="size-5 text-blue-400" /> ژورنال معاملاتی
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} معامله ثبت‌شده · {stats.open} باز · {stats.closed} بسته
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => saveEntries([])} className="gap-1.5 text-destructive">
            <Trash2 className="size-3.5" /> پاک کردن
          </Button>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
            <Plus className="size-3.5" /> معامله جدید
          </Button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 border-b pb-2">
        {[
          { id: "overview", label: "نمای کلی", icon: <BarChart3 className="size-3.5" /> },
          { id: "analytics", label: "تحلیل عملکرد", icon: <Activity className="size-3.5" /> },
          { id: "trades", label: "لیست معاملات", icon: <BookOpen className="size-3.5" /> },
        ].map(v => (
          <Button
            key={v.id}
            variant={activeView === v.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveView(v.id as any)}
            className="gap-1.5 text-xs"
          >
            {v.icon} {v.label}
          </Button>
        ))}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-xl border bg-card p-4 shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Input placeholder="نماد" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} className="text-xs" dir="rtl" />
              <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value as "buy" | "sell" })} className="rounded-lg border bg-background px-3 py-2 text-xs">
                <option value="buy">🟢 خرید</option>
                <option value="sell">🔴 فروش</option>
              </select>
              <Input placeholder="تعداد" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="text-xs" dir="ltr" />
              <Input placeholder="قیمت ورود" type="number" value={form.entryPrice} onChange={(e) => setForm({ ...form, entryPrice: e.target.value })} className="text-xs" dir="ltr" />
              <Input placeholder="قیمت خروج (اختیاری)" type="number" value={form.exitPrice} onChange={(e) => setForm({ ...form, exitPrice: e.target.value })} className="text-xs" dir="ltr" />
              <select value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} className="rounded-lg border bg-background px-3 py-2 text-xs">
                <option value="">استراتژی...</option>
                {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={form.setup} onChange={(e) => setForm({ ...form, setup: e.target.value })} className="rounded-lg border bg-background px-3 py-2 text-xs">
                <option value="">ستاپ...</option>
                {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Button onClick={addEntry} className="w-full text-xs">ذخیره</Button>
            </div>
            <Input placeholder="یادداشت..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-xs mt-2" dir="rtl" />
            {/* Tags */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Tag className="size-3" /> برچسب‌ها:</span>
              {TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "rounded-lg px-2 py-0.5 text-[10px] transition-all cursor-pointer",
                    form.tags.includes(tag) ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground border border-transparent"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overview Tab */}
      {activeView === "overview" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              { label: "کل PnL", value: stats.totalPnl.toLocaleString("fa-IR"), color: stats.totalPnl >= 0 ? "text-emerald-400" : "text-red-400" },
              { label: "نرخ برد", value: `${stats.winRate}%`, color: stats.winRate >= 50 ? "text-emerald-400" : "text-red-400" },
              { label: "برنده", value: stats.wins, color: "text-emerald-400" },
              { label: "بازنده", value: stats.losses, color: "text-red-400" },
              { label: "میانگین برد", value: stats.avgWin.toLocaleString("fa-IR"), color: "text-emerald-400" },
              { label: "ضریب سود", value: String(stats.profitFactor), color: "text-blue-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          {equityCurve.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Equity Curve */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">📈 منحنی سرمایه</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={equityCurve}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={stats.totalPnl >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={stats.totalPnl >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="cumPnl" stroke={stats.totalPnl >= 0 ? "#22c55e" : "#ef4444"} fill="url(#equityGrad)" strokeWidth={2} name="PnL انباشته" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Win/Loss Pie */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">🎯 نسبت برنده/بازنده</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartPie>
                    <Pie data={winLossPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {winLossPie.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </RechartPie>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* Analytics Tab */}
      {activeView === "analytics" && (
        <>
          {/* Advanced Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border bg-card p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{stats.maxWin.toLocaleString("fa-IR")}</div>
              <div className="text-[10px] text-muted-foreground">بیشترین برد</div>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <div className="text-lg font-bold text-red-400">{stats.maxLoss.toLocaleString("fa-IR")}</div>
              <div className="text-[10px] text-muted-foreground">بیشترین باخت</div>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <div className="text-lg font-bold text-purple-400">{stats.avgHoldingTime}h</div>
              <div className="text-[10px] text-muted-foreground">میانگین زمان</div>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <div className="text-lg font-bold text-amber-400">{stats.open}</div>
              <div className="text-[10px] text-muted-foreground">معاملات باز</div>
            </div>
          </div>

          {/* PnL by Symbol */}
          {pnlBySymbol.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">📊 PnL بر اساس نماد</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pnlBySymbol.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="symbol" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="pnl" name="PnL">
                    {pnlBySymbol.map((entry, index) => (
                      <Cell key={index} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* PnL by Strategy */}
          {pnlByStrategy.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">🎯 PnL بر اساس استراتژی</h3>
              <div className="grid gap-2">
                {pnlByStrategy.map(s => (
                  <div key={s.strategy} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{s.strategy}</span>
                      <span className="text-[10px] text-muted-foreground">({s.count} معامله)</span>
                    </div>
                    <span className={cn("text-xs font-semibold", s.pnl >= 0 ? "text-emerald-400" : "text-red-400")} dir="ltr">
                      {s.pnl > 0 ? "+" : ""}{s.pnl.toLocaleString("fa-IR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tag Stats */}
          {tagStats.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold mb-3">🏷️ عملکرد بر اساس برچسب</h3>
              <div className="flex flex-wrap gap-2">
                {tagStats.map(t => (
                  <div key={t.tag} className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2">
                    <Tag className="size-3 text-primary" />
                    <span className="text-xs font-semibold">{t.tag}</span>
                    <span className="text-[10px] text-muted-foreground">({t.count})</span>
                    <span className={cn("text-[10px] font-semibold", t.pnl >= 0 ? "text-emerald-400" : "text-red-400")} dir="ltr">
                      {t.pnl > 0 ? "+" : ""}{t.pnl.toLocaleString("fa-IR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Trades Tab */}
      {activeView === "trades" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی نماد..."
                className="pr-9 text-xs h-8"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "open", "closed", "win", "loss"] as const).map(f => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                  className="h-7 text-xs"
                >
                  {f === "all" ? "همه" : f === "open" ? "باز" : f === "closed" ? "بسته" : f === "win" ? "برنده" : "بازنده"}
                </Button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="h-7 text-xs text-destructive">
                پاک کردن فیلترها
              </Button>
            )}
          </div>

          {/* Tag Filters */}
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                className={cn(
                  "rounded-lg px-2 py-1 text-[10px] transition-all cursor-pointer",
                  selectedTags.includes(tag) ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted/50 text-muted-foreground border border-transparent"
                )}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Entries Table */}
          {filtered.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-right">تاریخ</th>
                    <th className="px-3 py-2 text-right">نماد</th>
                    <th className="px-3 py-2 text-right">جهت</th>
                    <th className="px-3 py-2 text-right">تعداد</th>
                    <th className="px-3 py-2 text-right">ورود</th>
                    <th className="px-3 py-2 text-right">خروج</th>
                    <th className="px-3 py-2 text-right">PnL</th>
                    <th className="px-3 py-2 text-right">استراتژی</th>
                    <th className="px-3 py-2 text-right">برچسب</th>
                    <th className="px-3 py-2 text-right">وضعیت</th>
                    <th className="px-3 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(e.entryDate).toLocaleDateString("fa-IR")}</td>
                      <td className="px-3 py-2 font-semibold text-xs">{e.symbol}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-[10px] ${e.side === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                          {e.side === "buy" ? "🟢 خرید" : "🔴 فروش"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">{e.quantity.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">{e.entryPrice.toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono text-xs" dir="ltr">{e.exitPrice?.toLocaleString() || "—"}</td>
                      <td className="px-3 py-2">
                        {e.pnl !== undefined ? (
                          <span className={`text-xs font-semibold ${e.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {e.pnl > 0 ? "+" : ""}{e.pnl.toLocaleString("fa-IR")}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {e.strategy && (
                          <Badge variant="secondary" className="text-[9px]">{e.strategy}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-0.5">
                          {e.tags?.map(tag => (
                            <Badge key={tag} variant="outline" className="text-[8px]">{tag}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={e.status === "open" ? "default" : "secondary"} className="text-[10px]">
                          {e.status === "open" ? "باز" : "بسته"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="sm" className="h-6 text-destructive p-0" onClick={() => removeEntry(e.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="mx-auto mb-2 size-8 opacity-30" />
              <p className="text-sm">هنوز معامله‌ای ثبت نشده</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
