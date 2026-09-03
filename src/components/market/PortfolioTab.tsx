import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Briefcase, Loader2, Plus, Trash2, TrendingUp, TrendingDown,
  AlertTriangle, Shield, PieChart as PieIcon, Activity, BarChart3,
  RefreshCw, Zap, Target, ArrowLeftRight,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart,
  BarChart, Bar, Legend,
} from "recharts";
import { getCachedInstruments, getCachedCodal } from "@/lib/clientFetch";
import { generateAllSignals, type CompositeSignal } from "@/lib/analysisEngines";

// ─── Types ───
interface PortfolioItem {
  _id: string;
  symbol: string;
  quantity: number;
  avgBuyPrice: number;
  segment: string;
  notes?: string;
  addedAt: number;
}

interface PortfolioAnalysis {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  pnlPercent: number;
  riskLevel: "low" | "medium" | "high" | "extreme";
  diversificationScore: number;
  beta: number;
  sectorExposure: { name: string; value: number; color: string }[];
  dailyPnl: { date: string; value: number }[];
  holdings: {
    symbol: string;
    quantity: number;
    avgCost: number;
    currentPrice: number;
    value: number;
    pnl: number;
    pnlPercent: number;
    signal: "buy" | "sell" | "hold";
    signalStrength: number;
    riskScore: number;
    allocation: number;
  }[];
  riskMetrics: {
    var95: number;
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
  };
  rebalancingSuggestions: {
    symbol: string;
    action: "increase" | "decrease" | "hold";
    reason: string;
    targetAllocation: number;
  }[];
}

const COLORS = ["#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#f97316", "#14b8a6"];

function analyzePortfolio(items: PortfolioItem[]): PortfolioAnalysis {
  const instruments = getCachedInstruments();
  const signals = generateAllSignals(instruments, getCachedCodal());
  const signalMap = new Map<string, CompositeSignal>();
  for (const s of signals) signalMap.set(s.symbol, s);

  let totalValue = 0;
  let totalCost = 0;
  const sectorMap = new Map<string, number>();

  const holdings = items.map((item) => {
    const inst = instruments.find((i) => i.symbol === item.symbol);
    const currentPrice = inst?.last ?? item.avgBuyPrice;
    const value = currentPrice * item.quantity;
    const cost = item.avgBuyPrice * item.quantity;
    const pnl = value - cost;
    const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;
    totalValue += value;
    totalCost += cost;

    // Sector
    const sector = item.segment === "tse" ? "بورس" : item.segment === "ifb" ? "فرابورس" : item.segment === "fund" ? "صندوق" : item.segment === "option" ? "اختیار" : "کالا";
    sectorMap.set(sector, (sectorMap.get(sector) ?? 0) + value);

    const sig = signalMap.get(item.symbol);
    
    // Risk score based on various factors
    let riskScore = 50;
    if (inst) {
      if (Math.abs(inst.changePercent) > 5) riskScore += 15;
      if (inst.volume < 100000) riskScore += 10;
      if (item.segment === "option") riskScore += 20;
      if (inst.pe && inst.pe > 50) riskScore += 10;
    }
    riskScore = Math.min(100, Math.max(0, riskScore));
    
    return {
      symbol: item.symbol,
      quantity: item.quantity,
      avgCost: item.avgBuyPrice,
      currentPrice,
      value,
      pnl,
      pnlPercent,
      signal: (sig?.signal ?? "hold") as "buy" | "sell" | "hold",
      signalStrength: sig?.strength ?? 50,
      riskScore,
      allocation: totalValue > 0 ? (value / totalValue) * 100 : 0,
    };
  });

  // Calculate final allocations
  holdings.forEach(h => {
    h.allocation = totalValue > 0 ? (h.value / totalValue) * 100 : 0;
  });

  const totalPnl = totalValue - totalCost;
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  // Diversification (Herfindahl-like)
  const hhi = holdings.reduce((sum, h) => {
    const share = totalValue > 0 ? h.value / totalValue : 0;
    return sum + share * share;
  }, 0);
  const diversificationScore = Math.round((1 - hhi) * 100);

  // Risk level
  const avgRisk = holdings.reduce((sum, h) => sum + h.riskScore, 0) / (holdings.length || 1);
  const negativeCount = holdings.filter((h) => h.pnl < 0).length;
  const riskLevel: PortfolioAnalysis["riskLevel"] =
    avgRisk > 70 ? "extreme" :
    avgRisk > 55 ? "high" :
    avgRisk > 40 ? "medium" : "low";

  // Beta estimate
  const avgChange = holdings.reduce((sum, h) => {
    const inst = instruments.find((i) => i.symbol === h.symbol);
    return sum + (inst?.changePercent ?? 0);
  }, 0) / (holdings.length || 1);
  const beta = 0.8 + (avgChange / 10);

  // Sector exposure
  const sectorExposure = Array.from(sectorMap.entries()).map(([name, value], i) => ({
    name,
    value: Math.round((value / (totalValue || 1)) * 100),
    color: COLORS[i % COLORS.length],
  }));

  // Simulated daily PnL
  const dailyPnl = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toLocaleDateString("fa-IR", { month: "short", day: "numeric" }),
      value: totalPnl * (0.3 + (i / 30) * 0.7) + (Math.random() - 0.48) * Math.abs(totalPnl) * 0.1,
    };
  });

  // Risk metrics
  const riskMetrics = {
    var95: Math.round(totalValue * 0.03 * (1 + avgRisk / 100)), // VaR 95%
    sharpeRatio: totalCost > 0 ? (totalPnl / totalCost) / (avgRisk / 100) : 0,
    maxDrawdown: Math.round(Math.abs(totalPnl * 0.15 * (1 + avgRisk / 100))),
    volatility: Math.round(avgRisk * 0.8),
  };

  // Rebalancing suggestions
  const rebalancingSuggestions = holdings
    .filter(h => {
      if (h.allocation > 30) return true; // Over-concentrated
      if (h.allocation < 5 && holdings.length > 3) return true; // Under-represented
      if (h.signal === "sell" && h.allocation > 10) return true; // Should reduce
      return false;
    })
    .map(h => ({
      symbol: h.symbol,
      action: h.allocation > 30 ? "decrease" as const : 
              h.signal === "sell" ? "decrease" as const :
              h.allocation < 5 ? "increase" as const : "hold" as const,
      reason: h.allocation > 30 ? "تمرکز زیاد — ریسک بالا" :
              h.signal === "sell" ? "سیگنال فروش — کاهش وزن پیشنهادی" :
              "وزن کم — افزایش وزن پیشنهادی",
      targetAllocation: h.allocation > 30 ? 20 : h.allocation < 5 ? 10 : h.allocation,
    }));

  return {
    totalValue,
    totalCost,
    totalPnl,
    pnlPercent,
    riskLevel,
    diversificationScore,
    beta,
    sectorExposure,
    dailyPnl,
    holdings,
    riskMetrics,
    rebalancingSuggestions,
  };
}

// ─── Component ───
interface PortfolioTabProps {
  portfolio: PortfolioItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export function PortfolioTab({ portfolio, onAdd, onRemove }: PortfolioTabProps) {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [activeView, setActiveView] = useState<"overview" | "risk" | "rebalance">("overview");

  useEffect(() => {
    if (portfolio.length > 0) {
      setLoading(true);
      const timer = setTimeout(() => {
        setAnalysis(analyzePortfolio(portfolio));
        setLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setAnalysis(null);
      setLoading(false);
    }
  }, [portfolio]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Briefcase className="size-5" /> پرتفوی من
        </h2>
        <Button size="sm" onClick={onAdd} className="gap-1.5">
          <Plus className="size-3.5" /> افزودن دارایی
        </Button>
      </div>

      {portfolio.length === 0 ? (
        <div className="rounded-xl border bg-card py-20 text-center text-sm text-muted-foreground">
          <Briefcase className="mx-auto mb-2 size-8 opacity-30" />
          هنوز دارایی‌ای اضافه نشده.
        </div>
      ) : loading || !analysis ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border bg-card py-20 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> در حال تحلیل پرتفوی...
        </div>
      ) : (
        <>
          {/* View Tabs */}
          <div className="flex gap-1 border-b pb-2">
            {[
              { id: "overview", label: "نمای کلی", icon: <PieIcon className="size-3.5" /> },
              { id: "risk", label: "تحلیل ریسک", icon: <Shield className="size-3.5" /> },
              { id: "rebalance", label: "بازچینی", icon: <ArrowLeftRight className="size-3.5" /> },
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

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="ارزش کل" value={`${(analysis.totalValue / 1e6).toFixed(1)}M ریال`} icon={<Briefcase className="size-4" />} />
            <SummaryCard
              label="سود/زیان"
              value={`${analysis.totalPnl > 0 ? "+" : ""}${(analysis.totalPnl / 1e6).toFixed(1)}M`}
              subValue={`${analysis.pnlPercent > 0 ? "+" : ""}${analysis.pnlPercent.toFixed(1)}٪`}
              icon={analysis.totalPnl >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              color={analysis.totalPnl >= 0 ? "text-up" : "text-down"}
            />
            <SummaryCard label="ریسک" value={analysis.riskLevel === "low" ? "کم" : analysis.riskLevel === "medium" ? "متوسط" : analysis.riskLevel === "high" ? "زیاد" : "بحرانی"}
              icon={<Shield className="size-4" />}
              color={analysis.riskLevel === "low" ? "text-up" : analysis.riskLevel === "medium" ? "text-amber-400" : "text-down"} />
            <SummaryCard label="تنوع" value={`${analysis.diversificationScore}٪`} icon={<PieIcon className="size-4" />} color={analysis.diversificationScore > 60 ? "text-up" : "text-amber-400"} />
          </div>

          {/* Overview Tab */}
          {activeView === "overview" && (
            <>
              {/* Charts Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Equity Curve */}
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Activity className="size-4" /> منحنی سرمایه</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={analysis.dailyPnl}>
                      <defs>
                        <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={analysis.totalPnl >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={analysis.totalPnl >= 0 ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,85,99,0.15)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="rgba(156,163,175,0.5)" />
                      <YAxis tick={{ fontSize: 10 }} stroke="rgba(156,163,175,0.5)" />
                      <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                      <Area type="monotone" dataKey="value" stroke={analysis.totalPnl >= 0 ? "#22c55e" : "#ef4444"} fill="url(#pnlGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Sector Pie */}
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><PieIcon className="size-4" /> ترکیب پرتفوی</h3>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={180}>
                      <PieChart>
                        <Pie data={analysis.sectorExposure} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                          {analysis.sectorExposure.map((entry, i) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5">
                      {analysis.sectorExposure.map((s) => (
                        <div key={s.name} className="flex items-center gap-2 text-xs">
                          <span className="size-2 rounded-full" style={{ background: s.color }} />
                          <span className="text-muted-foreground">{s.name}</span>
                          <span className="font-medium" dir="ltr">{s.value}٪</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Risk Tab */}
          {activeView === "risk" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Risk Metrics */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Shield className="size-4" /> شاخص‌های ریسک</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold tabular-nums-fa" dir="ltr">{analysis.riskMetrics.var95.toLocaleString()}</div>
                    <p className="text-[10px] text-muted-forest">VaR 95٪ (ریال)</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold tabular-nums-fa" dir="ltr">{analysis.riskMetrics.sharpeRatio.toFixed(2)}</div>
                    <p className="text-[10px] text-muted-forest">نسبت شارپ</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold tabular-nums-fa text-red-400" dir="ltr">{analysis.riskMetrics.maxDrawdown.toLocaleString()}</div>
                    <p className="text-[10px] text-muted-forest">حداکثر افت (ریال)</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold tabular-nums-fa text-amber-400" dir="ltr">{analysis.riskMetrics.volatility}٪</div>
                    <p className="text-[10px] text-muted-forest">نوسان پذیری</p>
                  </div>
                </div>
              </div>

              {/* Risk per Holding */}
              <div className="rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><AlertTriangle className="size-4" /> ریسک هر دارایی</h3>
                <div className="flex flex-col gap-2">
                  {analysis.holdings
                    .sort((a, b) => b.riskScore - a.riskScore)
                    .map(h => (
                      <div key={h.symbol} className="flex items-center gap-2">
                        <span className="text-xs font-semibold w-16 truncate">{h.symbol}</span>
                        <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted/40">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              h.riskScore > 70 ? "bg-red-500" : h.riskScore > 50 ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${h.riskScore}%` }}
                          />
                        </div>
                        <span className={cn(
                          "text-[10px] font-semibold w-8 text-right",
                          h.riskScore > 70 ? "text-red-400" : h.riskScore > 50 ? "text-amber-400" : "text-emerald-400"
                        )} dir="ltr">{h.riskScore}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Portfolio Risk Summary */}
              <div className="md:col-span-2 rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Activity className="size-4" /> خلاصه ریسک</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <span className="text-2xl font-bold tabular-nums-fa" dir="ltr">{analysis.beta.toFixed(2)}</span>
                    <p className="text-[10px] text-muted-foreground mt-1">بتای پرتفوی</p>
                  </div>
                  <div className="text-center">
                    <span className={cn("text-2xl font-bold", analysis.diversificationScore > 60 ? "text-up" : "text-amber-400")} dir="ltr">{analysis.diversificationScore}٪</span>
                    <p className="text-[10px] text-muted-foreground mt-1">امتیاز تنوع</p>
                  </div>
                  <div className="text-center">
                    <span className={cn("text-2xl font-bold", analysis.riskLevel === "low" ? "text-up" : analysis.riskLevel === "medium" ? "text-amber-400" : "text-down")}>{analysis.riskLevel === "low" ? "🟢" : analysis.riskLevel === "medium" ? "🟡" : "🔴"}</span>
                    <p className="text-[10px] text-muted-foreground mt-1">سطح ریسک</p>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-blue-400">{analysis.holdings.length}</span>
                    <p className="text-[10px] text-muted-foreground mt-1">تعداد دارایی</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rebalance Tab */}
          {activeView === "rebalance" && (
            <div className="flex flex-col gap-4">
              {analysis.rebalancingSuggestions.length === 0 ? (
                <div className="rounded-xl border bg-card py-10 text-center text-sm text-muted-foreground">
                  <Target className="mx-auto mb-2 size-8 opacity-30" />
                  پرتفوی شما در وضعیت متعادلی قرار دارد
                </div>
              ) : (
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <ArrowLeftRight className="size-4" /> پیشنهادات بازچینی
                    </h3>
                  </div>
                  {analysis.rebalancingSuggestions.map(s => (
                    <div key={s.symbol} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{s.symbol}</span>
                        <Badge variant={s.action === "increase" ? "default" : s.action === "decrease" ? "destructive" : "secondary"} className="text-[10px]">
                          {s.action === "increase" ? "افزایش" : s.action === "decrease" ? "کاهش" : "نگهداری"}
                        </Badge>
                      </div>
                      <div className="text-left text-xs text-muted-foreground">
                        <div>{s.reason}</div>
                        <div className="mt-0.5" dir="ltr">هدف: {s.targetAllocation.toFixed(1)}٪</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Holdings Table */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-muted/20">
              <h3 className="text-sm font-semibold">دارایی‌های پرتفوی</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-right">نماد</th>
                    <th className="px-4 py-2 text-right">تعداد</th>
                    <th className="px-4 py-2 text-right">میانگین</th>
                    <th className="px-4 py-2 text-right">قیمت فعلی</th>
                    <th className="px-4 py-2 text-right">ارزش</th>
                    <th className="px-4 py-2 text-right">وزن</th>
                    <th className="px-4 py-2 text-right">سود/زیان</th>
                    <th className="px-4 py-2 text-right">سیگنال</th>
                    <th className="px-4 py-2 text-right">ریسک</th>
                    <th className="px-4 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.holdings
                    .sort((a, b) => b.value - a.value)
                    .map((h) => (
                    <tr key={h.symbol} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-semibold">{h.symbol}</td>
                      <td className="px-4 py-2.5 tabular-nums-fa text-xs" dir="ltr">{h.quantity.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-2.5 tabular-nums-fa text-xs" dir="ltr">{h.avgCost.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-2.5 tabular-nums-fa text-xs" dir="ltr">{h.currentPrice.toLocaleString("fa-IR")}</td>
                      <td className="px-4 py-2.5 tabular-nums-fa text-xs" dir="ltr">{(h.value / 1e6).toFixed(1)}M</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-muted/40">
                            <div className="h-full rounded-full bg-primary/60" style={{ width: `${Math.min(100, h.allocation)}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums-fa" dir="ltr">{h.allocation.toFixed(0)}٪</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("tabular-nums-fa text-xs font-medium", h.pnl >= 0 ? "text-up" : "text-down")} dir="ltr">
                          {h.pnl >= 0 ? "+" : ""}{(h.pnl / 1e6).toFixed(1)}M ({h.pnlPercent.toFixed(1)}٪)
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={h.signal === "buy" ? "default" : h.signal === "sell" ? "destructive" : "secondary"} className="text-[9px]">
                          {h.signal === "buy" ? "خرید" : h.signal === "sell" ? "فروش" : "نگهداری"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn(
                          "text-[10px] font-semibold",
                          h.riskScore > 70 ? "text-red-400" : h.riskScore > 50 ? "text-amber-400" : "text-emerald-400"
                        )} dir="ltr">{h.riskScore}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Button variant="ghost" size="sm" onClick={() => onRemove(h.symbol as any)} className="h-7 w-7 p-0 text-destructive">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, subValue, icon, color }: {
  label: string; value: string; subValue?: string; icon: React.ReactNode; color?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs">{label}</span></div>
      <span className={cn("text-lg font-bold tabular-nums-fa", color)} dir="ltr">{value}</span>
      {subValue && <span className={cn("text-xs", color)} dir="ltr">{subValue}</span>}
    </div>
  );
}
