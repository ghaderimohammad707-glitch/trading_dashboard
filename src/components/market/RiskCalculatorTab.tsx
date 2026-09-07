import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, AlertTriangle, TrendingUp, Shield } from "lucide-react";
import { calculatePositionSize, calculateMaxDrawdown } from "@/lib/riskCalculator";

export function RiskCalculatorTab() {
  const [balance, setBalance] = useState("100000000");
  const [risk, setRisk] = useState("2");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [winRate, setWinRate] = useState("55");
  const [avgWin, setAvgWin] = useState("3");
  const [avgLoss, setAvgLoss] = useState("2");

  const result =
    entry && sl
      ? calculatePositionSize({
          accountBalance: Number(balance) || 100000000,
          riskPerTrade: Number(risk) || 2,
          entryPrice: Number(entry),
          stopLoss: Number(sl),
          takeProfit: tp ? Number(tp) : undefined,
          winRate: Number(winRate) || undefined,
          avgWin: Number(avgWin) || undefined,
          avgLoss: Number(avgLoss) || undefined,
        })
      : null;

  const drawdown =
    balance
      ? calculateMaxDrawdown(Number(balance) || 100000000, Number(risk) || 2, 3)
      : null;

  return (
    <div dir="rtl" className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Calculator className="size-5 text-primary" />
        <h2 className="text-lg font-bold">محاسبه‌گر حجم معامله</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* فرم ورودی */}
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground">اطلاعات حساب و معامله</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">موجودی حساب (ریال)</label>
            <Input dir="ltr" value={balance} onChange={(e) => setBalance(e.target.value)} type="number" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ریسک هر معامله (٪)</label>
            <Input dir="ltr" value={risk} onChange={(e) => setRisk(e.target.value)} type="number" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">قیمت ورود</label>
              <Input dir="ltr" value={entry} onChange={(e) => setEntry(e.target.value)} type="number" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">حد ضرر</label>
              <Input dir="ltr" value={sl} onChange={(e) => setSl(e.target.value)} type="number" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">حد سود (اختیاری)</label>
            <Input dir="ltr" value={tp} onChange={(e) => setTp(e.target.value)} type="number" />
          </div>

          <h3 className="text-sm font-semibold text-muted-foreground pt-2 border-t">اطلاعات استراتژی (برای Kelly)</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">نرخ برد (٪)</label>
              <Input dir="ltr" value={winRate} onChange={(e) => setWinRate(e.target.value)} type="number" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">میانگین سود (٪)</label>
              <Input dir="ltr" value={avgWin} onChange={(e) => setAvgWin(e.target.value)} type="number" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">میانگین ضرر (٪)</label>
              <Input dir="ltr" value={avgLoss} onChange={(e) => setAvgLoss(e.target.value)} type="number" />
            </div>
          </div>
        </div>

        {/* نتیجه */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* حجم پیشنهادی */}
              <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="size-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold">حجم پیشنهادی</h3>
                </div>
                <div className="text-3xl font-bold text-emerald-500 tabular-nums-fa" dir="ltr">
                  {result.positionSize.toLocaleString("fa-IR")}
                  <span className="text-sm font-normal text-muted-foreground mr-2">سهم</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  ارزش پوزیشن: {result.positionValue.toLocaleString("fa-IR")} ریال
                </div>
              </div>

              {/* جزئیات ریسک */}
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">جزئیات ریسک</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-muted-foreground text-xs">مبلغ ریسک</div>
                    <div className="font-bold tabular-nums-fa">{result.riskAmount.toLocaleString("fa-IR")} ریال</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-muted-foreground text-xs">فاصله حد ضرر</div>
                    <div className="font-bold tabular-nums-fa">{result.stopDistancePct}٪</div>
                  </div>
                  {result.riskRewardRatio !== undefined && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-muted-foreground text-xs">R/R Ratio</div>
                      <div className="font-bold tabular-nums-fa">{result.riskRewardRatio}:۱</div>
                    </div>
                  )}
                  {result.potentialProfit !== undefined && (
                    <div className="rounded-lg bg-emerald-500/10 p-3">
                      <div className="text-muted-foreground text-xs">سود احتمالی</div>
                      <div className="font-bold text-emerald-500 tabular-nums-fa">{result.potentialProfit.toLocaleString("fa-IR")} ریال</div>
                    </div>
                  )}
                  <div className="rounded-lg bg-red-500/10 p-3">
                    <div className="text-muted-foreground text-xs">ضرر احتمالی</div>
                    <div className="font-bold text-red-500 tabular-nums-fa">{result.potentialLoss.toLocaleString("fa-IR")} ریال</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-muted-foreground text-xs">درصد حساب</div>
                    <div className="font-bold tabular-nums-fa">{result.maxPositionPercent}٪</div>
                  </div>
                </div>
              </div>

              {/* Kelly Criterion */}
              {result.kellyFraction !== undefined && (
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                  <h3 className="text-sm font-semibold mb-2">Kelly Criterion</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-muted-foreground text-xs">کسری کلی</div>
                      <div className="font-bold tabular-nums-fa">{result.kellyFraction}٪</div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-muted-foreground text-xs">حجم پیشنهادی کلی</div>
                      <div className="font-bold tabular-nums-fa">{(result.kellyPositionSize || 0).toLocaleString("fa-IR")} سهم</div>
                    </div>
                  </div>
                </div>
              )}

              {/* هشدارها */}
              {result.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold">
                    <AlertTriangle className="size-4" /> هشدارها
                  </div>
                  {result.warnings.map((w, i) => (
                    <div key={i} className="text-xs text-amber-600">{w}</div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">
              <Calculator className="size-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">قیمت ورود و حد ضرر را وارد کنید</p>
            </div>
          )}

          {/* حداکثر ضرر */}
          {drawdown && (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-2">حداکثر ضرر مجاز</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <div className="text-muted-foreground">روزانه</div>
                  <div className="font-bold tabular-nums-fa">{drawdown.maxDailyLoss.toLocaleString("fa-IR")}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <div className="text-muted-foreground">هفتگی</div>
                  <div className="font-bold tabular-nums-fa">{drawdown.maxWeeklyLoss.toLocaleString("fa-IR")}</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-2 text-center">
                  <div className="text-muted-foreground">ماهانه</div>
                  <div className="font-bold tabular-nums-fa">{drawdown.maxMonthlyLoss.toLocaleString("fa-IR")}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
