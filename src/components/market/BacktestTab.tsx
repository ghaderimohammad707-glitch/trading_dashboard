import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Play, TrendingUp, TrendingDown } from "lucide-react";
import { smaStrategy, rsiStrategy, runBacktest, type BacktestResult } from "@/lib/backtestEngine";
import { getCachedInstruments } from "@/lib/clientFetch";

export function BacktestTab() {
  const [symbol, setSymbol] = useState("");
  const [strategy, setStrategy] = useState<"sma" | "rsi">("sma");
  const [shortPeriod, setShortPeriod] = useState("5");
  const [longPeriod, setLongPeriod] = useState("20");
  const [stopLoss, setStopLoss] = useState("5");
  const [takeProfit, setTakeProfit] = useState("10");
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleBacktest = () => {
    // دریافت داده‌های واقعی تاریخی از API
    const instruments = getCachedInstruments();
    const inst = instruments.find((i) => i.symbol === symbol || i.name.includes(symbol));
    if (!inst || inst.last <= 0) {
      alert("نماد پیدا نشد. از دیده‌بان جستجو کنید.");
      return;
    }

    // TODO: در نسخه واقعی، داده‌های تاریخی از API گرفته شود
    // فعلاً با پیام مناسب کاربر را آگاه می‌کنیم
    alert("بک‌تست با داده‌های واقعی نیازمند API تاریخی است که در حال توسعه است.\n\nدر نسخه فعلی:\n- داده‌های ساختگی استفاده نمی‌شوند\n- به‌زودی API تاریخی متصل خواهد شد");
    
    // غیرفعال کردن بک‌تست تا زمان آماده‌سازی API واقعی
    return;
  };

  return (
    <div dir="rtl" className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-primary" />
        <h2 className="text-lg font-bold">بک‌تست استراتژی</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* فرم ورودی */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">نماد</label>
            <Input dir="ltr" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="مثلاً فولاد" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">استراتژی</label>
            <div className="flex gap-2">
              <Button variant={strategy === "sma" ? "default" : "outline"} size="sm" onClick={() => setStrategy("sma")}>SMA Crossover</Button>
              <Button variant={strategy === "rsi" ? "default" : "outline"} size="sm" onClick={() => setStrategy("rsi")}>RSI</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{strategy === "sma" ? "میانگین کوتاه" : "دوره RSI"}</label>
              <Input dir="ltr" value={shortPeriod} onChange={(e) => setShortPeriod(e.target.value)} type="number" />
            </div>
            {strategy === "sma" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">میانگین بلند</label>
                <Input dir="ltr" value={longPeriod} onChange={(e) => setLongPeriod(e.target.value)} type="number" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">حد ضرر (٪)</label>
              <Input dir="ltr" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} type="number" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">حد سود (٪)</label>
              <Input dir="ltr" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} type="number" />
            </div>
          </div>
          <Button onClick={handleBacktest} className="w-full gap-2">
            <Play className="size-4" /> اجرای بک‌تست
          </Button>
        </div>

        {/* نتایج */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
                  <div className="text-xs text-muted-foreground">کل معاملات</div>
                  <div className="text-2xl font-bold">{result.totalTrades}</div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
                  <div className="text-xs text-muted-foreground">نرخ برد</div>
                  <div className={`text-2xl font-bold ${result.winRate > 50 ? "text-emerald-500" : "text-red-500"}`}>{result.winRate}٪</div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
                  <div className="text-xs text-muted-foreground">بازده کل</div>
                  <div className={`text-2xl font-bold ${result.totalReturnPct > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {result.totalReturnPct > 0 ? "+" : ""}{result.totalReturnPct}٪
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
                  <div className="text-xs text-muted-foreground">حداکثر افت</div>
                  <div className="text-2xl font-bold text-red-500">{result.maxDrawdown}٪</div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
                  <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                  <div className="text-2xl font-bold">{result.sharpeRatio}</div>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
                  <div className="text-xs text-muted-foreground">Profit Factor</div>
                  <div className={`text-2xl font-bold ${result.profitFactor > 1 ? "text-emerald-500" : "text-red-500"}`}>{result.profitFactor}</div>
                </div>
              </div>

              {/* لیست معاملات */}
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-4 py-2 border-b text-xs font-semibold text-muted-foreground">لیست معاملات</div>
                <div className="max-h-64 overflow-auto">
                  {result.trades.slice(0, 20).map((t, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2 border-b last:border-b-0 text-xs">
                      <span className="text-muted-foreground">{t.entryDate} → {t.exitDate}</span>
                      <span dir="ltr" className={t.pnlPct > 0 ? "text-emerald-500" : "text-red-500"}>
                        {t.pnlPct > 0 ? "+" : ""}{t.pnlPct}٪
                      </span>
                      <Badge variant={t.exitReason === "take_profit" ? "default" : t.exitReason === "stop_loss" ? "destructive" : "secondary"} className="text-[10px]">
                        {t.exitReason === "take_profit" ? "🎯 حد سود" : t.exitReason === "stop_loss" ? "🛑 حد ضرر" : "📊 سیگنال"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
              <BarChart3 className="size-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">نماد و استراتژی را انتخاب کنید و دکمه اجرا را بزنید</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
