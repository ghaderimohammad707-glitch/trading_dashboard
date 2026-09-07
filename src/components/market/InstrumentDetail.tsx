import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  compactNumber,
  compactToman,
  faNumber,
  faPercent,
  faPrice,
  faSigned,
} from "@/lib/format";
import {
  SEGMENT_BY_VALUE,
  STATUS_LABEL,
  type Instrument as ClientInstrument,
} from "@/lib/clientFetch";
import { cn } from "@/lib/utils";
import { analyzeTechnical, analyzeTablouKhani, analyzeVolume } from "@/lib/analysisEngines";
import { ArrowDown, ArrowUp, Minus, Brain, TrendingUp, TrendingDown, MinusCircle } from "lucide-react";
import { Sparkline, sparklineValues } from "./Sparkline";
import { TradingChart } from "./TradingChart";
import { TradingViewWidget } from "./TradingViewWidget";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

function direction(value: number) {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

function DirectionIcon({ value }: { value: number }) {
  const dir = direction(value);
  if (dir === "up") return <ArrowUp className="size-3.5" />;
  if (dir === "down") return <ArrowDown className="size-3.5" />;
  return <Minus className="size-3.5" />;
}

function dirText(value: number) {
  return direction(value) === "up"
    ? "text-up"
    : direction(value) === "down"
      ? "text-down"
      : "text-muted-foreground";
}

function Stat({
  label,
  value,
  mono = true,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted/50 px-3 py-2.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span
        dir={mono ? "ltr" : undefined}
        className={cn(
          "text-sm font-semibold tabular-nums-fa",
          className,
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ChartSection({ instrument }: { instrument: ClientInstrument }) {
  const [chartType, setChartType] = useState<"local" | "tv">("local");
  return (
    <div>
      <Tabs value={chartType} onValueChange={(v) => setChartType(v as "local" | "tv")}>
        <TabsList className="h-7 mb-3">
          <TabsTrigger value="local" className="text-[10px] px-3 h-6">📊 نمودار محلی</TabsTrigger>
          <TabsTrigger value="tv" className="text-[10px] px-3 h-6">📈 TradingView</TabsTrigger>
        </TabsList>
      </Tabs>
      {chartType === "local" ? (
        <TradingChart
          key={instrument.symbol}
          symbol={instrument.symbol}
          name={instrument.name}
          lastPrice={instrument.last}
          changePercent={instrument.changePercent}
          open={instrument.open}
          high={instrument.high}
          low={instrument.low}
          close={instrument.close}
          volume={instrument.volume}
        />
      ) : (
        <TradingViewWidget key={instrument.symbol} symbol={instrument.symbol} name={instrument.name} className="h-[450px]" />
      )}
    </div>
  );
}

export function InstrumentDetail({
  instrument,
  open,
  onOpenChange,
}: {
  instrument: ClientInstrument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dir = instrument ? direction(instrument.changePercent) : "flat";
  const meta = instrument ? SEGMENT_BY_VALUE[instrument.segment as keyof typeof SEGMENT_BY_VALUE] : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {instrument && meta ? (
          <>
            <SheetHeader className="border-b px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-xl">{instrument.symbol}</SheetTitle>
                    <Badge variant="secondary" className="font-normal">
                      {meta.label}
                    </Badge>
                  </div>
                  <SheetDescription>{instrument.name}</SheetDescription>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 font-normal",
                    instrument.status === "halted" && "text-destructive",
                  )}
                >
                  {STATUS_LABEL[instrument.status as keyof typeof STATUS_LABEL]}
                </Badge>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-baseline gap-2">
                  <span dir="ltr" className="text-3xl font-bold tracking-tight tabular-nums-fa">
                    {faNumber(instrument.last)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {instrument.unit ?? "ریال"}
                  </span>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold tabular-nums-fa",
                    dir === "up" && "bg-up/10 text-up",
                    dir === "down" && "bg-down/10 text-down",
                    dir === "flat" && "bg-muted text-muted-foreground",
                  )}
                >
                  <DirectionIcon value={instrument.changePercent} />
                  <span dir="ltr">
                    {instrument.changePercent > 0 ? "+" : ""}
                    {faPercent(instrument.changePercent)}
                  </span>
                </div>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-5 py-5">
              <ChartSection instrument={instrument} />

              <div className="grid grid-cols-3 gap-2">
                <Stat label="بازگشایی" value={faNumber(instrument.open)} />
                <Stat label="کمترین" value={faNumber(instrument.low)} className="text-down" />
                <Stat label="بیشترین" value={faNumber(instrument.high)} className="text-up" />
                <Stat label="قیمت پایانی" value={faNumber(instrument.close)} />
                <Stat label="حجم" value={compactNumber(instrument.volume)} />
                <Stat label="ارزش معاملات (تومان)" value={compactToman(instrument.value)} />
                <Stat label="تعداد معاملات" value={faNumber(instrument.tradeCount)} />
                <Stat label="تغییر" value={faSigned(instrument.change)} className={dirText(instrument.changePercent)} />
                {instrument.pe !== undefined && instrument.pe > 0 && (
                  <Stat label="P/E" value={faNumber(instrument.pe, 1)} />
                )}
              </div>

              {instrument.segment === "option" && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">مشخصات اختیار معامله</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Stat label="دارایی پایه" value={instrument.baseAsset ?? "—"} mono={false} />
                      <Stat
                        label="نوع"
                        value={instrument.optionType === "call" ? "اختیار خرید" : "اختیار فروش"}
                        mono={false}
                      />
                      <Stat label="قیمت اعمال" value={faNumber(instrument.strike ?? 0)} />
                      <Stat label="سررسید" value={instrument.expiry ?? "—"} mono={false} />
                      <Stat label="موقعیت باز" value={faNumber(instrument.openInterest ?? 0)} />
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold">یونانی‌ها (Greeks)</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Stat label="دلتا Δ" value={faSigned(instrument.delta ?? 0)} />
                      <Stat label="گاما Γ" value={faSigned(instrument.gamma ?? 0, 4)} />
                      <Stat label="تتا Θ" value={faSigned(instrument.theta ?? 0)} />
                      <Stat label="وگا ν" value={faSigned(instrument.vega ?? 0)} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      دلتا حساسیت قیمت به دارایی پایه، گاما نرخ تغییر دلتا، تتا افت زمانی و وگا
                      حساسیت به نوسان ضمنی را نشان می‌دهد.
                    </p>
                  </div>
                </>
              )}

              {instrument.segment === "commodity" && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">جزئیات قیمت</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Stat label="بازگشایی" value={faPrice(instrument.open, instrument.unit)} />
                      <Stat label="کمترین" value={faPrice(instrument.low, instrument.unit)} className="text-down" />
                      <Stat label="بیشترین" value={faPrice(instrument.high, instrument.unit)} className="text-up" />
                      <Stat label="قیمت پایانی" value={faPrice(instrument.close, instrument.unit)} />
                    </div>
                  </div>
                </>
              )}

              {/* ─── Quick Signal from Analysis Engines ─── */}
              {instrument.last > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-3 text-sm font-semibold flex items-center gap-1.5"><Brain className="size-4" /> تحلیل سریع</h3>
                    {(() => {
                      const instAny = instrument as any;
                      const tech = analyzeTechnical(instAny);
                      const tablou = analyzeTablouKhani(instAny);
                      const vol = analyzeVolume(instAny);
                      const engines = [
                        { name: "تکنیکال", result: tech, icon: "📊" },
                        { name: "تابلوخوانی", result: tablou, icon: "🔍" },
                        { name: "حجمی", result: vol, icon: "📈" },
                      ];
                      return (
                        <div className="flex flex-col gap-2">
                          {engines.map((eng) => (
                            <div key={eng.name} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                              <span className="text-xs">{eng.icon}</span>
                              <span className="text-xs text-muted-foreground w-16">{eng.name}</span>
                              <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted/40">
                                <div className={cn("h-full rounded-full", eng.result.score > 0 ? "bg-up" : eng.result.score < 0 ? "bg-down" : "bg-muted-foreground/30")} style={{ width: `${Math.min(100, Math.abs(eng.result.score))}%` }} />
                              </div>
                              <Badge variant={eng.result.signal === "buy" ? "default" : eng.result.signal === "sell" ? "destructive" : "secondary"} className="text-[9px] px-1.5">
                                {eng.result.signal === "buy" ? "خرید" : eng.result.signal === "sell" ? "فروش" : "نگهداری"}
                              </Badge>
                            </div>
                          ))}
                          {/* Top reasons */}
                          <div className="mt-1">
                            {engines.flatMap(e => e.result.reasons).slice(0, 3).map((r, i) => (
                              <span key={i} className="block text-[10px] leading-4 text-muted-foreground">• {r}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* ─── Bid/Ask Depth ─── */}
              {(instrument as any).bestBuy1 > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">عمق بازار</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Stat label="بهترین خرید (Bid)" value={faNumber((instrument as any).bestBuy1)} className="text-up" />
                      <Stat label="بهترین فروش (Ask)" value={faNumber((instrument as any).bestSell1 ?? 0)} className="text-down" />
                      <Stat label="حجم خرید" value={compactNumber((instrument as any).bestBuyVol1 ?? 0)} className="text-up" />
                      <Stat label="حجم فروش" value={compactNumber((instrument as any).bestSellVol1 ?? 0)} className="text-down" />
                    </div>
                    {(instrument as any).bestBuy1 && (instrument as any).bestSell1 > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span className="text-up">خریداران</span>
                          <span className="text-down">فروشندگان</span>
                        </div>
                        <div className="h-2 flex rounded-full overflow-hidden bg-down/20">
                          <div className="bg-up rounded-l-full" style={{ width: `${Math.min(100, (((instrument as any).bestBuyVol1 ?? 0) / (((instrument as any).bestBuyVol1 ?? 0) + ((instrument as any).bestSellVol1 ?? 1))) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {(instrument.marketCap !== undefined || instrument.eps !== undefined) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">تحلیل بنیادی</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {instrument.eps !== undefined && (
                        <Stat label="EPS" value={faNumber(instrument.eps)} />
                      )}
                      {instrument.marketCap !== undefined && (
                        <Stat label="ارزش بازار (تومان)" value={compactToman(instrument.marketCap)} />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>


          </>
        ) : (
          <SheetHeader>
            <SheetTitle>انتخاب نماد</SheetTitle>
            <SheetDescription>هیچ نمادی انتخاب نشده است.</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}
