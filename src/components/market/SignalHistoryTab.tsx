import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { History, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { getSignalHistory, checkSignalOutcomes, getSignalStats, type SignalRecord } from "@/lib/signalHistory";

export function SignalHistoryTab() {
  const [refreshKey, setRefreshKey] = useState(0);

  const history = useMemo(() => getSignalHistory(), [refreshKey]);
  const stats = useMemo(() => getSignalStats(), [refreshKey]);

  // بررسی خودکار نتایج
  useEffect(() => {
    const updated = checkSignalOutcomes();
    if (updated.length > 0) setRefreshKey((k) => k + 1);
  }, [refreshKey]);

  const sorted = [...history].reverse();
  const pending = sorted.filter((s) => !s.outcome);
  const completed = sorted.filter((s) => s.outcome);

  const resultIcon = (result?: string) => {
    if (result === "win") return <CheckCircle className="size-4 text-emerald-500" />;
    if (result === "loss") return <XCircle className="size-4 text-red-500" />;
    if (result === "breakeven") return <Clock className="size-4 text-amber-500" />;
    return <Clock className="size-4 text-muted-foreground" />;
  };

  return (
    <div dir="rtl" className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <History className="size-5 text-primary" />
        <h2 className="text-lg font-bold">تاریخچه سیگنال‌ها</h2>
      </div>

      {/* آمار کلی */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <div className="text-xs text-muted-foreground">کل سیگنال‌ها</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <div className="text-xs text-muted-foreground">بررسی‌شده</div>
          <div className="text-2xl font-bold text-blue-500">{stats.checked}</div>
        </div>
        <div className="rounded-xl border bg-emerald-500/5 p-4 shadow-sm text-center">
          <div className="text-xs text-muted-foreground">برنده</div>
          <div className="text-2xl font-bold text-emerald-500">{stats.wins}</div>
        </div>
        <div className="rounded-xl border bg-red-500/5 p-4 shadow-sm text-center">
          <div className="text-xs text-muted-foreground">بازنده</div>
          <div className="text-2xl font-bold text-red-500">{stats.losses}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <div className="text-xs text-muted-foreground">نرخ برد</div>
          <div className={`text-2xl font-bold ${stats.winRate > 50 ? "text-emerald-500" : "text-red-500"}`}>
            {stats.winRate}٪
          </div>
        </div>
      </div>

      {/* عملکرد موتورها */}
      {stats.checked > 0 && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-3">عملکرد موتورهای تحلیلی</h3>
          <div className="grid grid-cols-5 gap-2">
            {[
              { name: "تکنیکال", data: stats.byEngine.technical },
              { name: "بنیادی", data: stats.byEngine.fundamental },
              { name: "حجمی", data: stats.byEngine.volume },
              { name: "تابلوخوانی", data: stats.byEngine.tablouKhani },
              { name: "احساسات", data: stats.byEngine.sentiment },
            ].map((eng) => {
              const rate = eng.data.total > 0 ? Math.round((eng.data.correct / eng.data.total) * 100) : 0;
              return (
                <div key={eng.name} className="rounded-lg bg-muted/50 p-2 text-center">
                  <div className="text-[10px] text-muted-foreground">{eng.name}</div>
                  <div className={`text-sm font-bold ${rate > 50 ? "text-emerald-500" : rate > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {eng.data.total > 0 ? `${rate}٪` : "—"}
                  </div>
                  <div className="text-[9px] text-muted-foreground">{eng.data.correct}/{eng.data.total}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* سیگنال‌های در انتظار */}
      {pending.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b text-xs font-semibold text-muted-foreground flex items-center gap-2">
            <Clock className="size-3" /> در انتظار بررسی ({pending.length})
            <Badge variant="outline" className="text-[10px]">نتیجه بعد از ۷ روز مشخص می‌شود</Badge>
          </div>
          <div className="divide-y max-h-48 overflow-auto">
            {pending.slice(0, 10).map((sig) => (
              <div key={sig.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant={sig.signal === "buy" ? "default" : "destructive"} className="text-[10px]">
                    {sig.signal === "buy" ? "خرید" : "فروش"}
                  </Badge>
                  <span className="text-sm font-semibold">{sig.symbol}</span>
                  <span className="text-xs text-muted-foreground">{sig.name}</span>
                </div>
                <div className="text-left text-xs text-muted-foreground">
                  {new Date(sig.createdAt).toLocaleDateString("fa-IR")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* سیگنال‌های بررسی‌شده */}
      {completed.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b text-xs font-semibold text-muted-foreground">
            نتایج بررسی‌شده ({completed.length})
          </div>
          <div className="divide-y max-h-96 overflow-auto">
            {completed.map((sig) => (
              <div key={sig.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  {resultIcon(sig.outcome?.result)}
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant={sig.signal === "buy" ? "default" : "destructive"} className="text-[10px]">
                        {sig.signal === "buy" ? "خرید" : "فروش"}
                      </Badge>
                      <span className="text-sm font-semibold">{sig.symbol}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      ورود: {sig.entryPrice.toLocaleString("fa-IR")} → خروج: {sig.outcome?.exitPrice.toLocaleString("fa-IR")}
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <div className={`text-sm font-bold tabular-nums-fa ${(sig.outcome?.pnlPct || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {(sig.outcome?.pnlPct || 0) >= 0 ? "+" : ""}{sig.outcome?.pnlPct}٪
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    {sig.outcome?.hitTarget && <Badge variant="secondary" className="text-[9px] bg-emerald-500/10 text-emerald-500">🎯 هدف</Badge>}
                    {sig.outcome?.hitStopLoss && <Badge variant="secondary" className="text-[9px] bg-red-500/10 text-red-500">🛑 حد ضرر</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* بهترین و بدترین سیگنال */}
      {stats.bestSignal && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 text-emerald-500 text-sm font-semibold mb-2">
              <TrendingUp className="size-4" /> بهترین سیگنال
            </div>
            <div className="text-sm">
              <span className="font-bold">{stats.bestSignal.symbol}</span>
              <span className="text-muted-foreground mx-1">—</span>
              <span className="text-emerald-500 font-bold">+{stats.bestSignal.outcome?.pnlPct}٪</span>
            </div>
          </div>
          {stats.worstSignal && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 text-red-500 text-sm font-semibold mb-2">
                <TrendingDown className="size-4" /> بدترین سیگنال
              </div>
              <div className="text-sm">
                <span className="font-bold">{stats.worstSignal.symbol}</span>
                <span className="text-muted-foreground mx-1">—</span>
                <span className="text-red-500 font-bold">{stats.worstSignal.outcome?.pnlPct}٪</span>
              </div>
            </div>
          )}
        </div>
      )}

      {history.length === 0 && (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
          <History className="size-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">هنوز سیگنالی ثبت نشده</p>
          <p className="text-xs mt-1">سیگنال‌ها خودکار از موتورهای تحلیلی ذخیره می‌شوند</p>
        </div>
      )}
    </div>
  );
}
