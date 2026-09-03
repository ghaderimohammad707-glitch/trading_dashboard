import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, TrendingDown, Minus, Layers } from "lucide-react";
import { calculateMarketBreadth, analyzeSectorRotation } from "@/lib/marketBreadth";
import { getCachedInstruments } from "@/lib/clientFetch";

export function MarketBreadthTab() {
  const instruments = useMemo(() => getCachedInstruments(), []);
  const breadth = useMemo(() => calculateMarketBreadth(instruments), [instruments]);
  const sectors = useMemo(() => analyzeSectorRotation(instruments), [instruments]);

  const momentumIcon = (m: string) => {
    if (m === "strong_up") return <TrendingUp className="size-4 text-emerald-500" />;
    if (m === "up") return <TrendingUp className="size-4 text-emerald-400" />;
    if (m === "strong_down") return <TrendingDown className="size-4 text-red-500" />;
    if (m === "down") return <TrendingDown className="size-4 text-red-400" />;
    return <Minus className="size-4 text-muted-foreground" />;
  };

  const momentumLabel = (m: string) => {
    if (m === "strong_up") return "صعودی قوی";
    if (m === "up") return "صعودی";
    if (m === "strong_down") return "نزولی قوی";
    if (m === "down") return "نزولی";
    return "خنثی";
  };

  return (
    <div dir="rtl" className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="size-5 text-primary" />
        <h2 className="text-lg font-bold">ترند بازار و چرخش صنایع</h2>
      </div>

      {/* آمار کلی بازار */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border bg-emerald-500/5 p-4 text-center shadow-sm">
          <div className="text-xs text-muted-foreground">پیشرفت</div>
          <div className="text-2xl font-bold text-emerald-500">{breadth.advanceCount}</div>
        </div>
        <div className="rounded-xl border bg-red-500/5 p-4 text-center shadow-sm">
          <div className="text-xs text-muted-foreground">افت</div>
          <div className="text-2xl font-bold text-red-500">{breadth.declineCount}</div>
        </div>
        <div className="rounded-xl border bg-amber-500/5 p-4 text-center shadow-sm">
          <div className="text-xs text-muted-foreground">صف خرید</div>
          <div className="text-2xl font-bold text-amber-500">{breadth.limitUpCount}</div>
        </div>
        <div className="rounded-xl border bg-red-500/5 p-4 text-center shadow-sm">
          <div className="text-xs text-muted-foreground">صف فروش</div>
          <div className="text-2xl font-bold text-red-400">{breadth.limitDownCount}</div>
        </div>
      </div>

      {/* نوار عرض بازار */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">عرض بازار</span>
          <span className={`text-sm font-bold ${breadth.breadthPercent > 0 ? "text-emerald-500" : breadth.breadthPercent < 0 ? "text-red-500" : "text-muted-foreground"}`}>
            {breadth.breadthPercent > 0 ? "+" : ""}{breadth.breadthPercent}٪
          </span>
        </div>
        <div className="h-4 rounded-full overflow-hidden bg-red-500/20 flex">
          <div
            className="bg-emerald-500 transition-all"
            style={{ width: `${Math.max(0, breadth.breadthPercent + 50)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span> bearish</span>
          <span> bullish</span>
        </div>
      </div>

      {/* آمار تکمیلی */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm">
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="text-muted-foreground text-xs">میانگین تغییرات</div>
          <div className={`font-bold ${breadth.avgChange > 0 ? "text-emerald-500" : "text-red-500"}`}>
            {breadth.avgChange > 0 ? "+" : ""}{breadth.avgChange}٪
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-center">
          <div className="text-muted-foreground text-xs">میانگین وزنی</div>
          <div className={`font-bold ${breadth.weightedAvgChange > 0 ? "text-emerald-500" : "text-red-500"}`}>
            {breadth.weightedAvgChange > 0 ? "+" : ""}{breadth.weightedAvgChange}٪
          </div>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
          <div className="text-muted-foreground text-xs">حجم بالا + مثبت</div>
          <div className="font-bold text-emerald-500">{breadth.strongBuyCount}</div>
        </div>
        <div className="rounded-lg bg-red-500/10 p-3 text-center">
          <div className="text-muted-foreground text-xs">حجم بالا + منفی</div>
          <div className="font-bold text-red-500">{breadth.strongSellCount}</div>
        </div>
      </div>

      {/* چرخش صنایع */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">چرخش صنایع</h3>
        </div>
        <div className="space-y-2">
          {sectors.map((sector) => (
            <div key={sector.name} className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {momentumIcon(sector.momentum)}
                  <div>
                    <div className="text-sm font-semibold">{sector.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {sector.advanceCount} مثبت · {sector.declineCount} منفی
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <div className={`text-lg font-bold tabular-nums-fa ${sector.avgChange > 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {sector.avgChange > 0 ? "+" : ""}{sector.avgChange}٪
                  </div>
                  <Badge variant="outline" className="text-[10px]">{momentumLabel(sector.momentum)}</Badge>
                </div>
              </div>
              {sector.topGainers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {sector.topGainers.slice(0, 3).map((g) => (
                    <Badge key={g.symbol} variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-500">
                      {g.symbol} +{g.changePercent.toFixed(1)}٪
                    </Badge>
                  ))}
                  {sector.topLosers.slice(0, 2).map((l) => (
                    <Badge key={l.symbol} variant="secondary" className="text-[10px] bg-red-500/10 text-red-500">
                      {l.symbol} {l.changePercent.toFixed(1)}٪
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
