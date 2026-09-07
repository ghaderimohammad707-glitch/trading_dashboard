import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Play, Square, RotateCcw, BarChart3 } from "lucide-react";
import {
  getPaperPortfolio,
  openPaperTrade,
  closePaperTrade,
  calculatePaperPerformance,
  checkPaperTradeExits,
  resetPaperPortfolio,
} from "@/lib/paperTrading";
import { getCachedInstruments } from "@/lib/clientFetch";

export function PaperTradingTab() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const portfolio = useMemo(() => getPaperPortfolio(), [refreshKey]);
  const performance = useMemo(() => calculatePaperPerformance(), [refreshKey]);

  // بررسی خودکار حد ضرر/سود
  useEffect(() => {
    const closed = checkPaperTradeExits();
    if (closed.length > 0) setRefreshKey((k) => k + 1);
  }, [refreshKey]);

  const handleOpenTrade = () => {
    if (!symbol || !quantity) return;
    const trade = openPaperTrade(symbol, side, Number(quantity), {
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
    });
    if (trade) {
      setRefreshKey((k) => k + 1);
      setSymbol("");
      setQuantity("");
      setStopLoss("");
      setTakeProfit("");
    }
  };

  const handleCloseTrade = (tradeId: string) => {
    closePaperTrade(tradeId);
    setRefreshKey((k) => k + 1);
  };

  const handleReset = () => {
    if (confirm("آیا مطمئنید؟ تمام معاملات مجازی حذف می‌شوند.")) {
      resetPaperPortfolio();
      setRefreshKey((k) => k + 1);
    }
  };

  const openTrades = portfolio.trades.filter((t) => t.status === "open");
  const closedTrades = portfolio.trades.filter((t) => t.status !== "open").reverse();

  return (
    <div dir="rtl" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" />
          <h2 className="text-lg font-bold">معاملات مجازی (Paper Trading)</h2>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-1 text-destructive">
          <RotateCcw className="size-3.5" /> ریست
        </Button>
      </div>

      {/* آمار عملکرد */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <div className="text-xs text-muted-foreground">موجودی فعلی</div>
          <div className="text-lg font-bold tabular-nums-fa">{performance.currentEquity.toLocaleString("fa-IR")}</div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <div className="text-xs text-muted-foreground">سود/زیان کل</div>
          <div className={`text-lg font-bold ${performance.totalPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {performance.totalPnl >= 0 ? "+" : ""}{performance.totalPnlPct}٪
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <div className="text-xs text-muted-foreground">نرخ برد</div>
          <div className={`text-lg font-bold ${performance.winRate > 50 ? "text-emerald-500" : "text-red-500"}`}>
            {performance.winRate.toFixed(1)}٪
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm text-center">
          <div className="text-xs text-muted-foreground">معاملات باز</div>
          <div className="text-lg font-bold">{performance.openTrades}</div>
        </div>
      </div>

      {/* فرم باز کردن معامله */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">باز کردن معامله جدید</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">نماد</label>
            <Input dir="ltr" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="مثلاً فولاد" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">جهت</label>
            <div className="flex gap-2">
              <Button variant={side === "buy" ? "default" : "outline"} size="sm" onClick={() => setSide("buy")} className="flex-1">
                <TrendingUp className="size-3.5" /> خرید
              </Button>
              <Button variant={side === "sell" ? "default" : "outline"} size="sm" onClick={() => setSide("sell")} className="flex-1">
                <TrendingDown className="size-3.5" /> فروش
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">تعداد</label>
            <Input dir="ltr" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="تعداد سهم" />
          </div>
          <div className="flex items-end">
            <Button onClick={handleOpenTrade} className="w-full gap-2">
              <Play className="size-4" /> ثبت معامله
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">حد ضرر (اختیاری)</label>
            <Input dir="ltr" type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="قیمت حد ضرر" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">حد سود (اختیاری)</label>
            <Input dir="ltr" type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="قیمت حد سود" />
          </div>
        </div>
      </div>

      {/* معاملات باز */}
      {openTrades.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b text-xs font-semibold text-muted-foreground flex items-center justify-between">
            <span>معاملات باز ({openTrades.length})</span>
            <Badge variant="outline" className="text-[10px]">خودکار بسته می‌شوند</Badge>
          </div>
          <div className="divide-y">
            {openTrades.map((trade) => {
              const inst = getCachedInstruments().find((i: { symbol: string }) => i.symbol === trade.symbol);
              const currentPrice = inst?.last || trade.entryPrice;
              const unrealizedPnl = trade.side === "buy"
                ? (currentPrice - trade.entryPrice) * trade.quantity
                : (trade.entryPrice - currentPrice) * trade.quantity;
              const unrealizedPnlPct = trade.side === "buy"
                ? ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100
                : ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;

              return (
                <div key={trade.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant={trade.side === "buy" ? "default" : "destructive"} className="text-xs">
                      {trade.side === "buy" ? "خرید" : "فروش"}
                    </Badge>
                    <div>
                      <div className="text-sm font-semibold">{trade.symbol}</div>
                      <div className="text-xs text-muted-foreground">
                        {trade.quantity} سهم @ {trade.entryPrice.toLocaleString("fa-IR")}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-bold tabular-nums-fa ${unrealizedPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {unrealizedPnl >= 0 ? "+" : ""}{unrealizedPnl.toLocaleString("fa-IR")} ریال
                    </div>
                    <div className={`text-xs ${unrealizedPnlPct >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {unrealizedPnlPct >= 0 ? "+" : ""}{unrealizedPnlPct.toFixed(2)}٪
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleCloseTrade(trade.id)} className="gap-1">
                    <Square className="size-3" /> بستن
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* تاریخچه معاملات بسته‌شده */}
      {closedTrades.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-2 border-b text-xs font-semibold text-muted-foreground">
            تاریخچه معاملات ({closedTrades.length})
          </div>
          <div className="max-h-64 overflow-auto divide-y">
            {closedTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between px-4 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge variant={trade.side === "buy" ? "default" : "destructive"} className="text-[10px]">
                    {trade.side === "buy" ? "خرید" : "فروش"}
                  </Badge>
                  <span className="font-semibold">{trade.symbol}</span>
                  <span className="text-muted-foreground">{trade.quantity} سهم</span>
                </div>
                <div className="text-left">
                  <span className={`font-bold tabular-nums-fa ${(trade.pnl || 0) >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {(trade.pnl || 0) >= 0 ? "+" : ""}{trade.pnlPct?.toFixed(2)}٪
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* نمای آمار تکمیلی */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="text-muted-foreground text-xs">میانگین سود</div>
          <div className="font-bold text-emerald-500">+{performance.avgWin}٪</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="text-muted-foreground text-xs">میانگین ضرر</div>
          <div className="font-bold text-red-500">-{performance.avgLoss}٪</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="text-muted-foreground text-xs">Profit Factor</div>
          <div className={`font-bold ${performance.profitFactor > 1 ? "text-emerald-500" : "text-red-500"}`}>
            {performance.profitFactor}
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="text-muted-foreground text-xs">حداکثر افت</div>
          <div className="font-bold text-red-500">{performance.maxDrawdown}٪</div>
        </div>
      </div>
    </div>
  );
}


