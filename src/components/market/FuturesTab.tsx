/**
 * Futures Watch Tab - دیده‌بان آتی
 * نمایش زنده داده‌های قراردادهای آتی از TSETMC
 */

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { Instrument } from "@/lib/clientFetch";

export interface FuturesInstrument extends Instrument {
  underlyingSymbol: string; // نماد پایه
  deliveryDate: string; // تاریخ تحویل
  contractSize: number; // اندازه قرارداد
  tickValue: number; // ارزش هر نوسان
  openInterest: number; // موقعیت‌های باز
  settlementPrice?: number; // قیمت تسویه
}

export function FuturesTab() {
  const [futures, setFutures] = useState<FuturesInstrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFuturesData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // دریافت داده‌های قراردادهای آتی از TSETMC
      const response = await fetch("https://api.tsetmc.com/Api/Instrument/GetAllFuturesContracts");
      if (!response.ok) throw new Error("خطا در دریافت داده‌های آتی");
      
      const data = await response.json();
      
      const formattedFutures: FuturesInstrument[] = data.map((item: any) => ({
        _id: item.insCode,
        symbol: item.cusSecName || item.cusIsin,
        name: item.cusTitle,
        last: item.lastPrice || 0,
        change: item.priceChange || 0,
        changePercent: item.percentChange || 0,
        volume: item.volume || 0,
        value: item.value || 0,
        tradeCount: item.count || 0,
        high: item.highestPrice || 0,
        low: item.lowestPrice || 0,
        open: item.openPrice || 0,
        close: item.yesterdayPrice || 0,
        underlyingSymbol: item.underlyingSymbol || "",
        deliveryDate: item.deliveryDate || "",
        contractSize: item.contractSize || 0,
        tickValue: item.tickValue || 0,
        openInterest: item.openInterest || 0,
        settlementPrice: item.settlementPrice,
        rawInsCode: item.insCode,
        market: "futures",
      }));
      
      setFutures(formattedFutures);
    } catch (e) {
      console.error("Error fetching futures:", e);
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
      const cached = localStorage.getItem("futures_data");
      if (cached) {
        try {
          setFutures(JSON.parse(cached));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFuturesData();
    const interval = setInterval(fetchFuturesData, 30000);
    return () => clearInterval(interval);
  }, [fetchFuturesData]);

  useEffect(() => {
    if (futures.length > 0) {
      localStorage.setItem("futures_data", JSON.stringify(futures));
    }
  }, [futures]);

  const totalContracts = futures.length;
  const upCount = futures.filter(f => f.changePercent > 0).length;
  const downCount = futures.filter(f => f.changePercent < 0).length;
  const totalVolume = futures.reduce((sum, f) => sum + f.volume, 0);
  const totalOpenInterest = futures.reduce((sum, f) => sum + f.openInterest, 0);

  return (
    <div className="space-y-4">
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            📈 دیده‌بان آتی
            <Badge variant="outline" className="text-xs">
              {totalContracts} قرارداد
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            مثبت: {upCount} | منفی: {downCount} | حجم کل: {(totalVolume / 1000).toFixed(0)}K
          </p>
        </div>
        <Button
          size="sm"
          onClick={fetchFuturesData}
          disabled={loading}
          className="gap-1"
          variant="outline"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          {loading ? "در حال بروزرسانی..." : "بروزرسانی"}
        </Button>
      </motion.div>

      {error && (
        <Card className="p-4 bg-red-500/10 border-red-500/30">
          <p className="text-sm text-red-400">⚠️ {error}</p>
          <p className="text-xs text-muted-foreground mt-1">داده‌های کش شده نمایش داده می‌شوند</p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <div className="text-xs text-muted-foreground">مثبت</div>
          <div className="text-2xl font-bold text-emerald-400">{upCount}</div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <div className="text-xs text-muted-foreground">منفی</div>
          <div className="text-2xl font-bold text-red-400">{downCount}</div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="text-xs text-muted-foreground">موقعیت باز</div>
          <div className="text-2xl font-bold text-blue-400">{(totalOpenInterest / 1000).toFixed(1)}K</div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <div className="text-xs text-muted-foreground">ارزش معاملات</div>
          <div className="text-2xl font-bold text-purple-400">{(totalVolume / 1000000).toFixed(2)}M</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-2 text-right font-semibold">نماد</th>
                <th className="p-2 text-right font-semibold">پایه</th>
                <th className="p-2 text-right font-semibold">تحویل</th>
                <th className="p-2 text-right font-semibold">اندازه قرارداد</th>
                <th className="p-2 text-right font-semibold">آخرین</th>
                <th className="p-2 text-right font-semibold">تغییر %</th>
                <th className="p-2 text-right font-semibold">حجم</th>
                <th className="p-2 text-right font-semibold">موقعیت باز</th>
                <th className="p-2 text-right font-semibold">تسویه</th>
              </tr>
            </thead>
            <tbody>
              {futures.map((fut, idx) => (
                <motion.tr
                  key={fut._id}
                  className="border-b hover:bg-muted/30 transition-colors"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <td className="p-2 font-medium">{fut.symbol}</td>
                  <td className="p-2">{fut.underlyingSymbol}</td>
                  <td className="p-2 tabular-nums">{fut.deliveryDate}</td>
                  <td className="p-2 tabular-nums">{fut.contractSize.toLocaleString("fa-IR")}</td>
                  <td className="p-2 tabular-nums font-bold">{fut.last.toLocaleString("fa-IR")}</td>
                  <td className={`p-2 tabular-nums font-bold ${fut.changePercent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {fut.changePercent >= 0 ? "+" : ""}{fut.changePercent.toFixed(2)}٪
                  </td>
                  <td className="p-2 tabular-nums">{fut.volume.toLocaleString("fa-IR")}</td>
                  <td className="p-2 tabular-nums">{fut.openInterest.toLocaleString("fa-IR")}</td>
                  <td className="p-2 tabular-nums">{fut.settlementPrice?.toLocaleString("fa-IR") || "-"}</td>
                </motion.tr>
              ))}
              {futures.length === 0 && !loading && (
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
