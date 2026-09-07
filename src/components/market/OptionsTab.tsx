/**
 * Options Watch Tab - دیده‌بان اختیار معامله
 * نمایش زنده داده‌های اختیار معامله از TSETMC
 */

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { Instrument } from "@/lib/clientFetch";

export interface OptionInstrument extends Instrument {
  underlyingSymbol: string; // نماد پایه
  strikePrice: number; // قیمت اعمال
  expirationDate: string; // تاریخ سررسید
  optionType: "call" | "put"; // نوع اختیار
  openInterest: number; // تعداد موقعیت‌های باز
  impliedVolatility?: number; // نوسان ضمنی
}

export function OptionsTab() {
  const [options, setOptions] = useState<OptionInstrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOptionsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // دریافت داده‌های اختیار معامله از TSETMC
      const response = await fetch("https://api.tsetmc.com/Api/Instrument/GetAllOptionContracts");
      if (!response.ok) throw new Error("خطا در دریافت داده‌های اختیار معامله");
      
      const data = await response.json();
      
      // تبدیل داده‌ها به فرمت مورد نیاز
      const formattedOptions: OptionInstrument[] = data.map((item: any) => ({
        _id: item.insCode,
        symbol: item.cusSecName || item.cusIsin,
        name: item.cusTitle,
        last: item.lastPrice || 0,
        close: item.yesterdayPrice || 0,
        open: item.openPrice || 0,
        high: item.highestPrice || 0,
        low: item.lowestPrice || 0,
        change: item.priceChange || 0,
        changePercent: item.percentChange || 0,
        volume: item.volume || 0,
        value: item.value || 0,
        tradeCount: item.count || 0,
        status: "open" as const,
        underlyingSymbol: item.underlyingSymbol || "",
        strikePrice: item.strikePrice || 0,
        expirationDate: item.expirationDate || "",
        optionType: (item.optionType === "آمریکایی خرید" || item.optionType === "call") ? "call" : "put",
        openInterest: item.openInterest || 0,
        impliedVolatility: item.impliedVolatility,
        rawInsCode: item.insCode,
        segment: "tse" as const,
      }));
      
      setOptions(formattedOptions);
    } catch (e) {
      console.error("Error fetching options:", e);
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
      // استفاده از داده‌های کش در صورت خطا
      const cached = localStorage.getItem("options_data");
      if (cached) {
        try {
          setOptions(JSON.parse(cached));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOptionsData();
    // بروزرسانی خودکار هر ۳۰ ثانیه
    const interval = setInterval(fetchOptionsData, 30000);
    return () => clearInterval(interval);
  }, [fetchOptionsData]);

  // ذخیره در کش
  useEffect(() => {
    if (options.length > 0) {
      localStorage.setItem("options_data", JSON.stringify(options));
    }
  }, [options]);

  const totalCall = options.filter(o => o.optionType === "call").length;
  const totalPut = options.filter(o => o.optionType === "put").length;
  const upCount = options.filter(o => o.changePercent > 0).length;
  const downCount = options.filter(o => o.changePercent < 0).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            📊 دیده‌بان اختیار معامله
            <Badge variant="outline" className="text-xs">
              {options.length} قرارداد
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            خرید: {totalCall} | فروش: {totalPut} | مثبت: {upCount} | منفی: {downCount}
          </p>
        </div>
        <Button
          size="sm"
          onClick={fetchOptionsData}
          disabled={loading}
          className="gap-1"
          variant="outline"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          {loading ? "در حال بروزرسانی..." : "بروزرسانی"}
        </Button>
      </motion.div>

      {/* Error State */}
      {error && (
        <Card className="p-4 bg-red-500/10 border-red-500/30">
          <p className="text-sm text-red-400">⚠️ {error}</p>
          <p className="text-xs text-muted-foreground mt-1">داده‌های کش شده نمایش داده می‌شوند</p>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <div className="text-xs text-muted-foreground">اختیار خرید</div>
          <div className="text-2xl font-bold text-emerald-400">{totalCall}</div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <div className="text-xs text-muted-foreground">اختیار فروش</div>
          <div className="text-2xl font-bold text-red-400">{totalPut}</div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="text-xs text-muted-foreground">مثبت</div>
          <div className="text-2xl font-bold text-blue-400">{upCount}</div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <div className="text-xs text-muted-foreground">منفی</div>
          <div className="text-2xl font-bold text-amber-400">{downCount}</div>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-2 text-right font-semibold">نماد</th>
                <th className="p-2 text-right font-semibold">نوع</th>
                <th className="p-2 text-right font-semibold">پایه</th>
                <th className="p-2 text-right font-semibold">قیمت اعمال</th>
                <th className="p-2 text-right font-semibold">سررسید</th>
                <th className="p-2 text-right font-semibold">آخرین</th>
                <th className="p-2 text-right font-semibold">تغییر %</th>
                <th className="p-2 text-right font-semibold">حجم</th>
                <th className="p-2 text-right font-semibold">موقعیت باز</th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt, idx) => (
                <motion.tr
                  key={opt._id}
                  className="border-b hover:bg-muted/30 transition-colors"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <td className="p-2 font-medium">{opt.symbol}</td>
                  <td className="p-2">
                    <Badge 
                      variant={opt.optionType === "call" ? "default" : "secondary"}
                      className="text-[9px]"
                    >
                      {opt.optionType === "call" ? "خرید 🔼" : "فروش 🔽"}
                    </Badge>
                  </td>
                  <td className="p-2">{opt.underlyingSymbol}</td>
                  <td className="p-2 tabular-nums">{opt.strikePrice.toLocaleString("fa-IR")}</td>
                  <td className="p-2 tabular-nums">{opt.expirationDate}</td>
                  <td className="p-2 tabular-nums font-bold">{opt.last.toLocaleString("fa-IR")}</td>
                  <td className={`p-2 tabular-nums font-bold ${opt.changePercent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {opt.changePercent >= 0 ? "+" : ""}{opt.changePercent.toFixed(2)}٪
                  </td>
                  <td className="p-2 tabular-nums">{opt.volume.toLocaleString("fa-IR")}</td>
                  <td className="p-2 tabular-nums">{opt.openInterest.toLocaleString("fa-IR")}</td>
                </motion.tr>
              ))}
              {options.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    هیچ داده‌ای یافت نشد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
