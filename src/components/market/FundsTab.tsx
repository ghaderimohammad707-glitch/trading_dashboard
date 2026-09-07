/**
 * Funds Watch Tab - دیده‌بان صندوق‌های بورسی (ETF)
 * نمایش زنده داده‌های صندوق‌های سرمایه‌گذاری
 */

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { Instrument } from "@/lib/clientFetch";

export interface FundInstrument extends Instrument {
  fundType: string; // نوع صندوق (سهامی، درآمد ثابت، طلا، مختلط)
  nav: number; // ارزش خالص دارایی
  navChange?: number; // تغییر NAV
  premium?: number; // درصد صرف/کسر
  aum?: number; // حجم دارایی تحت مدیریت
}

export function FundsTab() {
  const [funds, setFunds] = useState<FundInstrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const fetchFundsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // دریافت لیست صندوق‌ها از TSETMC
      const response = await fetch("https://api.tsetmc.com/Api/Instrument/GetAllFundInstruments");
      if (!response.ok) throw new Error("خطا در دریافت داده‌های صندوق‌ها");
      
      const data = await response.json();
      
      const formattedFunds: FundInstrument[] = data.map((item: any) => ({
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
        fundType: item.fundType || "عمومی",
        nav: item.nav || 0,
        navChange: item.navChange,
        premium: item.premium,
        aum: item.aum,
        rawInsCode: item.insCode,
        market: "fund",
      }));
      
      setFunds(formattedFunds);
    } catch (e) {
      console.error("Error fetching funds:", e);
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
      const cached = localStorage.getItem("funds_data");
      if (cached) {
        try {
          setFunds(JSON.parse(cached));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFundsData();
    const interval = setInterval(fetchFundsData, 30000);
    return () => clearInterval(interval);
  }, [fetchFundsData]);

  useEffect(() => {
    if (funds.length > 0) {
      localStorage.setItem("funds_data", JSON.stringify(funds));
    }
  }, [funds]);

  const filteredFunds = filterType === "all" 
    ? funds 
    : funds.filter(f => f.fundType === filterType);

  const fundTypes = Array.from(new Set(funds.map(f => f.fundType)));
  const totalFunds = filteredFunds.length;
  const upCount = filteredFunds.filter(f => f.changePercent > 0).length;
  const downCount = filteredFunds.filter(f => f.changePercent < 0).length;
  const avgPremium = filteredFunds.reduce((sum, f) => sum + (f.premium || 0), 0) / (filteredFunds.length || 1);

  return (
    <div className="space-y-4">
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            🏦 دیده‌بان صندوق‌های بورسی
            <Badge variant="outline" className="text-xs">
              {totalFunds} صندوق
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            مثبت: {upCount} | منفی: {downCount} | میانگین صرف/کسر: {avgPremium.toFixed(2)}٪
          </p>
        </div>
        <Button
          size="sm"
          onClick={fetchFundsData}
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
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={filterType === "all" ? "default" : "outline"}
          onClick={() => setFilterType("all")}
          className="text-xs"
        >
          همه ({funds.length})
        </Button>
        {fundTypes.map(type => (
          <Button
            key={type}
            size="sm"
            variant={filterType === type ? "default" : "outline"}
            onClick={() => setFilterType(type)}
            className="text-xs"
          >
            {type} ({funds.filter(f => f.fundType === type).length})
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <div className="text-xs text-muted-foreground">صندوق‌های مثبت</div>
          <div className="text-2xl font-bold text-emerald-400">{upCount}</div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <div className="text-xs text-muted-foreground">صندوق‌های منفی</div>
          <div className="text-2xl font-bold text-red-400">{downCount}</div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="text-xs text-muted-foreground">میانگین NAV</div>
          <div className="text-2xl font-bold text-blue-400">
            {(filteredFunds.reduce((s, f) => s + f.nav, 0) / (filteredFunds.length || 1)).toLocaleString("fa-IR", { maximumFractionDigits: 0 })}
          </div>
        </Card>
        <Card className="p-3 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <div className="text-xs text-muted-foreground">بیشترین NAV</div>
          <div className="text-2xl font-bold text-purple-400">
            {Math.max(...filteredFunds.map(f => f.nav), 0).toLocaleString("fa-IR", { maximumFractionDigits: 0 })}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-2 text-right font-semibold">نماد</th>
                <th className="p-2 text-right font-semibold">نام</th>
                <th className="p-2 text-right font-semibold">نوع</th>
                <th className="p-2 text-right font-semibold">قیمت</th>
                <th className="p-2 text-right font-semibold">NAV</th>
                <th className="p-2 text-right font-semibold">صرف/کسر</th>
                <th className="p-2 text-right font-semibold">تغییر %</th>
                <th className="p-2 text-right font-semibold">حجم</th>
                <th className="p-2 text-right font-semibold">ارزش معاملات</th>
              </tr>
            </thead>
            <tbody>
              {filteredFunds.map((fund, idx) => (
                <motion.tr
                  key={fund._id}
                  className="border-b hover:bg-muted/30 transition-colors"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <td className="p-2 font-medium">{fund.symbol}</td>
                  <td className="p-2">{fund.name}</td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-[9px]">
                      {fund.fundType}
                    </Badge>
                  </td>
                  <td className="p-2 tabular-nums font-bold">{fund.last.toLocaleString("fa-IR")}</td>
                  <td className="p-2 tabular-nums">{fund.nav.toLocaleString("fa-IR")}</td>
                  <td className={`p-2 tabular-nums font-bold ${fund.premium && fund.premium >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {fund.premium ? `${fund.premium >= 0 ? "+" : ""}${fund.premium.toFixed(2)}٪` : "-"}
                  </td>
                  <td className={`p-2 tabular-nums font-bold ${fund.changePercent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {fund.changePercent >= 0 ? "+" : ""}{fund.changePercent.toFixed(2)}٪
                  </td>
                  <td className="p-2 tabular-nums">{fund.volume.toLocaleString("fa-IR")}</td>
                  <td className="p-2 tabular-nums">{(fund.value / 1000000).toFixed(2)}M</td>
                </motion.tr>
              ))}
              {filteredFunds.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    هیچ صندوقی یافت نشد
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
