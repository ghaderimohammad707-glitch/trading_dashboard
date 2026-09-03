import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bell, Loader2, Plus, Trash2, Clock, CheckCircle2,
  AlertTriangle, Volume2, TrendingUp, TrendingDown,
  Shield, Timer, Zap, Info, RefreshCw, Activity,
  Target, AlertCircle, BellRing, Smartphone, Mail, Send,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getCachedInstruments } from "@/lib/clientFetch";

// ─── Types ───
export interface Alert {
  _id: string;
  symbol: string;
  alertType: string;
  targetValue: number;
  isActive: boolean;
  isTriggered: boolean;
  channels: string[];
  createdAt?: number;
  triggeredAt?: number;
  triggerCount: number;
}

interface AlertMonitor {
  alert: Alert;
  currentPrice: number;
  progress: number; // 0-100 how close to trigger
  timeActive: string;
  riskScore: number;
  distance: number; // price distance to target
  distancePercent: number;
}

// ─── Smart Alert Types ───
const ALERT_TYPES = [
  { type: "price_above", label: "قیمت بالای", icon: <TrendingUp className="size-3.5" />, color: "text-up" },
  { type: "price_below", label: "قیمت زیر", icon: <TrendingDown className="size-3.5" />, color: "text-down" },
  { type: "change_up", label: "افزایش بیش از", icon: <Zap className="size-3.5" />, color: "text-up" },
  { type: "change_down", label: "کاهش بیش از", icon: <AlertTriangle className="size-3.5" />, color: "text-down" },
  { type: "volume_spike", label: "افزایش حجم", icon: <Volume2 className="size-3.5" />, color: "text-purple-400" },
  { type: "signal_buy", label: "سیگنال خرید", icon: <CheckCircle2 className="size-3.5" />, color: "text-up" },
  { type: "signal_sell", label: "سیگنال فروش", icon: <AlertTriangle className="size-3.5" />, color: "text-down" },
  { type: "risk_high", label: "افزایش ریسک", icon: <Shield className="size-3.5" />, color: "text-amber-400" },
];

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  alarm: <BellRing className="size-3" />,
  email: <Mail className="size-3" />,
  telegram: <Send className="size-3" />,
  sms: <Smartphone className="size-3" />,
};

const CHANNEL_LABELS: Record<string, string> = {
  alarm: "آلارم",
  email: "ایمیل",
  telegram: "تلگرام",
  sms: "پیامک",
};

function timeSince(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days} روز پیش`;
}

function formatDistance(value: number): string {
  if (Math.abs(value) < 1000) return value.toFixed(0);
  if (Math.abs(value) < 1e6) return (value / 1e3).toFixed(1) + "K";
  return (value / 1e6).toFixed(1) + "M";
}

// ─── Component ───
interface AlertsTabProps {
  alerts: Alert[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
}

export function AlertsTab({ alerts, onAdd, onRemove, onToggle }: AlertsTabProps) {
  const [filter, setFilter] = useState<"all" | "active" | "triggered" | "inactive">("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const instruments = getCachedInstruments();

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      // Force re-render to update monitors
      setFilter(f => f);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const monitors = useMemo(() => {
    return alerts.map((alert) => {
      const inst = instruments.find((i) => i.symbol === alert.symbol);
      const currentPrice = inst?.last ?? 0;
      let progress = 0;
      let riskScore = 50;
      let distance = 0;
      let distancePercent = 0;

      if (alert.alertType === "price_above" && currentPrice > 0) {
        distance = alert.targetValue - currentPrice;
        distancePercent = (currentPrice / alert.targetValue) * 100;
        progress = Math.min(100, distancePercent);
        riskScore = currentPrice > alert.targetValue ? 90 : Math.round(progress);
      } else if (alert.alertType === "price_below" && currentPrice > 0) {
        distance = currentPrice - alert.targetValue;
        distancePercent = (alert.targetValue / currentPrice) * 100;
        progress = Math.min(100, distancePercent);
        riskScore = currentPrice < alert.targetValue ? 90 : Math.round(progress);
      } else if (alert.alertType === "change_up" || alert.alertType === "change_down") {
        progress = Math.min(100, Math.abs(inst?.changePercent ?? 0) / alert.targetValue * 100);
        riskScore = Math.round(progress);
      } else {
        progress = alert.isTriggered ? 100 : alert.isActive ? 30 : 10;
        riskScore = alert.isTriggered ? 100 : 40;
      }

      return {
        alert,
        currentPrice,
        progress: Math.round(Math.min(100, progress)),
        timeActive: timeSince(alert.createdAt ?? Date.now()),
        riskScore,
        distance,
        distancePercent,
      };
    });
  }, [alerts, instruments]);

  const filtered = useMemo(() => {
    return monitors.filter((m) => {
      if (filter === "active") return m.alert.isActive && !m.alert.isTriggered;
      if (filter === "triggered") return m.alert.isTriggered;
      if (filter === "inactive") return !m.alert.isActive;
      return true;
    });
  }, [monitors, filter]);

  const stats = useMemo(() => ({
    total: alerts.length,
    active: alerts.filter((a) => a.isActive && !a.isTriggered).length,
    triggered: alerts.filter((a) => a.isTriggered).length,
    inactive: alerts.filter((a) => !a.isActive).length,
    totalTriggers: alerts.reduce((sum, a) => sum + (a.triggerCount || 0), 0),
  }), [alerts]);

  // Alert type distribution for chart
  const typeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of alerts) {
      const type = ALERT_TYPES.find((t) => t.type === a.alertType);
      const label = type?.label ?? a.alertType;
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [alerts]);

  // Channel distribution
  const channelStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of alerts) {
      for (const ch of a.channels) {
        map.set(ch, (map.get(ch) ?? 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [alerts]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Bell className="size-5" /> هشدارهای هوشمند
        </h2>
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
          <Button size="sm" onClick={onAdd} className="gap-1.5">
            <Plus className="size-3.5" /> ایجاد هشدار
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        هشدارهای قیمت، حجم، سیگنال و ریسک با پایش مداوم و اطلاع‌رسانی فوری
      </p>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "کل", count: stats.total, icon: "🔔", color: "" },
          { label: "فعال", count: stats.active, icon: "🟢", color: "text-up" },
          { label: "فعال‌شده", count: stats.triggered, icon: "🔴", color: "text-down" },
          { label: "غیرفعال", count: stats.inactive, icon: "⏸️", color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 rounded-lg border bg-card/50 p-2.5">
            <span className="text-sm">{s.icon}</span>
            <span className={cn("text-lg font-bold tabular-nums-fa", s.color)} dir="ltr">{s.count}</span>
            <span className="text-[10px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Channel Stats */}
      {channelStats.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {channelStats.map(ch => (
            <div key={ch.name} className="flex items-center gap-1.5 rounded-lg border bg-card/50 px-3 py-1.5 text-xs">
              {CHANNEL_ICONS[ch.name]}
              <span className="text-muted-foreground">{CHANNEL_LABELS[ch.name] || ch.name}</span>
              <span className="font-semibold">{ch.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Type Distribution Chart */}
      {typeDistribution.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-2">توزیع هشدارها</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={typeDistribution} layout="vertical" margin={{ left: 60 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {typeDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1.5">
        {(["all", "active", "triggered", "inactive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
              filter === f ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {f === "all" ? "همه" : f === "active" ? "فعال" : f === "triggered" ? "فعال‌شده" : "غیرفعال"}
          </button>
        ))}
      </div>

      {alerts.length === 0 ? (
        <div className="rounded-xl border bg-card py-20 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto mb-2 size-8 opacity-30" />
          هنوز هشداری تنظیم نشده.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(({ alert, currentPrice, progress, timeActive, riskScore, distance, distancePercent }) => {
            const typeInfo = ALERT_TYPES.find((t) => t.type === alert.alertType);
            return (
              <div key={alert._id} className={cn(
                "flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm transition-all",
                alert.isTriggered && "border-down/50 bg-down/5",
              )}>
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{alert.symbol}</span>
                    <Badge variant={alert.isTriggered ? "destructive" : alert.isActive ? "default" : "secondary"} className="text-[10px]">
                      {alert.isTriggered ? "🔴 فعال‌شده" : alert.isActive ? "🟢 فعال" : "⏸️ غیرفعال"}
                    </Badge>
                    {typeInfo && (
                      <Badge variant="outline" className={cn("text-[10px]", typeInfo.color)}>
                        {typeInfo.icon} {typeInfo.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> {timeActive}
                  </div>
                </div>

                {/* Target & Progress */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>هدف: {alert.targetValue.toLocaleString("fa-IR")}</span>
                      <span>فعلی: {currentPrice.toLocaleString("fa-IR")}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          progress > 80 ? "bg-down" : progress > 50 ? "bg-amber-500" : "bg-up",
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {distance !== 0 && (
                      <div className="mt-1 text-[10px] text-muted-foreground" dir="ltr">
                        فاصله تا هدف: {formatDistance(distance)} ({distancePercent.toFixed(1)}٪)
                      </div>
                    )}
                  </div>
                  <span className={cn("text-xs font-bold tabular-nums-fa w-10 text-center", riskScore > 80 ? "text-down" : riskScore > 50 ? "text-amber-400" : "text-up")} dir="ltr">
                    {progress}٪
                  </span>
                </div>

                {/* Channels & Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {alert.channels.map((ch) => (
                      <Badge key={ch} variant="outline" className="text-[9px] gap-1">
                        {CHANNEL_ICONS[ch]} {CHANNEL_LABELS[ch] || ch}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onToggle(alert._id, !alert.isActive)} className="h-7 text-xs">
                      {alert.isActive ? "غیرفعال" : "فعال"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onRemove(alert._id)} className="h-7 w-7 p-0 text-destructive">
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const COLORS = ["#8b5cf6", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#f97316", "#14b8a6"];
