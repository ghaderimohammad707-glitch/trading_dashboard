/**
 * تب تابلوخوانی پیشرفته — نسخه کامل فاز 2
 * نمایش عمق بازار، کد به کد، پول هوشمند، صف‌ها
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Lock,
  Unlock,
  Eye,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import type { Instrument } from "@/lib/clientFetch";
import { analyzeTablouKhaniFull } from "@/lib/tablouKhaniEngine";
import type { AnalysisResult } from "@/lib/analysisEngines";

interface TablouKhaniTabProps {
  instruments: Instrument[];
  onSelect?: (inst: Instrument) => void;
}

export function TablouKhaniTab({ instruments, onSelect }: TablouKhaniTabProps) {
  const [filter, setFilter] = useState("");
  const [minVolume, setMinVolume] = useState("100000");
  const [activeView, setActiveView] = useState<"depth" | "code" | "queue" | "smart">("depth");

  // تحلیل تمام نمادها
  const analyzed = useMemo(() => {
    return instruments
      .map((inst) => ({
        inst,
        analysis: analyzeTablouKhaniFull(inst),
      }))
      .filter(({ inst }) => {
        const vol = inst.volume || 0;
        const minVol = Number(minVolume) || 0;
        if (vol < minVol) return false;
        if (filter && !inst.symbol.includes(filter) && !inst.name.includes(filter)) return false;
        return true;
      })
      .sort((a, b) => (b.analysis.score || 0) - (a.analysis.score || 0));
  }, [instruments, filter, minVolume]);

  // دسته‌بندی بر اساس نوع سیگنال
  const bySignal = useMemo(() => {
    const result = {
      buy: analyzed.filter((a) => a.analysis.signal === "buy"),
      sell: analyzed.filter((a) => a.analysis.signal === "sell"),
      hold: analyzed.filter((a) => a.analysis.signal === "hold"),
    };
    return result;
  }, [analyzed]);

  // نمادهای با صف خرید/فروش سنگین
  const queueLocks = useMemo(() => {
    return analyzed.filter(
      (a) =>
        typeof a.analysis.details.queueStatus === "string" && a.analysis.details.queueStatus?.includes("سنگین") ||
        typeof a.analysis.details.limitStatus === "string" && a.analysis.details.limitStatus?.includes("محکم")
    );
  }, [analyzed]);

  // نمادهای با پول هوشمند فعال
  const smartMoney = useMemo(() => {
    return analyzed.filter(
      (a) =>
        a.analysis.details.smartMoney === "ورودی" ||
        typeof a.analysis.details.codeToCode === "string" && a.analysis.details.codeToCode?.includes("تجمیع")
    );
  }, [analyzed]);

  // نمادهای با کد به کد مشکوک
  const codeToCode = useMemo(() => {
    return analyzed.filter(
      (a) =>
        typeof a.analysis.details.codeToCode === "string" &&
        a.analysis.details.codeToCode &&
        !a.analysis.details.codeToCode.includes("مشترک")
    );
  }, [analyzed]);

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="size-5 text-primary" />
            تابلوخوانی پیشرفته
          </h2>
          <p className="text-sm text-muted-foreground">
            عمق بازار، کد به کد، پول هوشمند و صف‌های معاملاتی
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {analyzed.length.toLocaleString("fa-IR")} نماد
          </Badge>
          <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500">
            {bySignal.buy.length} خرید
          </Badge>
          <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-500">
            {bySignal.sell.length} فروش
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="جستجوی نماد..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pr-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">حداقل حجم:</span>
          <Input
            value={minVolume}
            onChange={(e) => setMinVolume(e.target.value)}
            type="number"
            className="w-28 text-xs"
            dir="ltr"
          />
        </div>
      </div>

      {/* Views Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="depth" className="text-xs">عمق بازار</TabsTrigger>
          <TabsTrigger value="code" className="text-xs">کد به کد</TabsTrigger>
          <TabsTrigger value="queue" className="text-xs">صف‌ها</TabsTrigger>
          <TabsTrigger value="smart" className="text-xs">پول هوشمند</TabsTrigger>
        </TabsList>

        {/* عمق بازار */}
        <TabsContent value="depth" className="mt-4">
          <div className="grid gap-3">
            {analyzed.slice(0, 50).map(({ inst, analysis }, idx) => (
              <motion.div
                key={inst.symbol}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => onSelect?.(inst)}
                className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-12 items-center justify-center rounded-xl text-lg font-bold ${
                        analysis.score >= 15
                          ? "bg-emerald-500/10 text-emerald-500"
                          : analysis.score <= -15
                          ? "bg-red-500/10 text-red-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {analysis.score}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{inst.symbol}</span>
                        <span className="text-xs text-muted-foreground">{inst.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        آخرین: {inst.last?.toLocaleString("fa-IR")} | تغییر:{" "}
                        <span
                          className={
                            inst.changePercent >= 0
                              ? "text-emerald-500"
                              : "text-red-500"
                          }
                        >
                          {inst.changePercent.toFixed(1)}٪
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      analysis.signal === "buy"
                        ? "default"
                        : analysis.signal === "sell"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {analysis.signal === "buy" ? "خرید" : analysis.signal === "sell" ? "فروش" : "نگهداری"}
                  </Badge>
                </div>

                {/* عمق بازار */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-emerald-500/5 p-2">
                    <div className="text-emerald-600 mb-1 flex items-center gap-1">
                      <ArrowUpRight className="size-3" />
                      خریداران
                    </div>
                    <div className="font-bold tabular-nums-fa">
                      {(analysis.details.totalBidVolume || 0).toLocaleString("fa-IR")}
                    </div>
                    {analysis.details.depthRatio && (
                      <div className="text-muted-foreground text-[10px] mt-1">
                        نسبت: {analysis.details.depthRatio}
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg bg-red-500/5 p-2">
                    <div className="text-red-600 mb-1 flex items-center gap-1">
                      <ArrowDownRight className="size-3" />
                      فروشندگان
                    </div>
                    <div className="font-bold tabular-nums-fa">
                      {(analysis.details.totalAskVolume || 0).toLocaleString("fa-IR")}
                    </div>
                    {analysis.details.dominantSide && (
                      <div className="text-muted-foreground text-[10px] mt-1">
                        غالب: {analysis.details.dominantSide}
                      </div>
                    )}
                  </div>
                </div>

                {/* دلایل */}
                {analysis.reasons.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {analysis.reasons.slice(0, 3).map((reason, i) => (
                      <Badge key={i} variant="outline" className="text-[9px] h-5">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* کد به کد */}
        <TabsContent value="code" className="mt-4">
          <div className="grid gap-3">
            {codeToCode.slice(0, 30).map(({ inst, analysis }, idx) => (
              <motion.div
                key={inst.symbol}
                initial={{ opacity: 0, x: idx % 2 === 0 ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onSelect?.(inst)}
                className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <span className="font-bold">{inst.symbol}</span>
                    <span className="text-xs text-muted-foreground">{inst.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {analysis.details.codeToCode}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                  <div className="text-center">
                    <div className="text-muted-foreground text-[10px]">حقیقی خالص</div>
                    <div
                      className={`font-bold tabular-nums-fa ${
                        Number(analysis.details.realNetFlow || 0) >= 0
                          ? "text-emerald-500"
                          : "text-red-500"
                      }`}
                    >
                      {(Number(analysis.details.realNetFlow || 0) / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground text-[10px]">حقوقی خالص</div>
                    <div
                      className={`font-bold tabular-nums-fa ${
                        Number(analysis.details.legalNetFlow || 0) >= 0
                          ? "text-emerald-500"
                          : "text-red-500"
                      }`}
                    >
                      {(Number(analysis.details.legalNetFlow || 0) / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground text-[10px]">مشارکت حقیقی</div>
                    <div className="font-bold tabular-nums-fa">
                      {Number(analysis.details.realParticipation || 0)}٪
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {codeToCode.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="mx-auto size-12 opacity-20 mb-2" />
                <p>هیچ کد به کدی یافت نشد</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* صف‌ها */}
        <TabsContent value="queue" className="mt-4">
          <div className="grid gap-3">
            {queueLocks.slice(0, 30).map(({ inst, analysis }, idx) => (
              <motion.div
                key={inst.symbol}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onSelect?.(inst)}
                className={`rounded-xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                  typeof analysis.details.queueStatus === "string" && analysis.details.queueStatus?.includes("خرید") ||
                  typeof analysis.details.limitStatus === "string" && analysis.details.limitStatus?.includes("سقف")
                    ? "bg-emerald-500/5 border-emerald-500/30"
                    : "bg-red-500/5 border-red-500/30"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {typeof analysis.details.queueStatus === "string" && analysis.details.queueStatus?.includes("خرید") ||
                    typeof analysis.details.limitStatus === "string" && analysis.details.limitStatus?.includes("سقف") ? (
                      <Lock className="size-4 text-emerald-500" />
                    ) : (
                      <Unlock className="size-4 text-red-500" />
                    )}
                    <span className="font-bold">{inst.symbol}</span>
                    <span className="text-xs text-muted-foreground">{inst.name}</span>
                  </div>
                  <Badge
                    className={
                      typeof analysis.details.queueStatus === "string" && analysis.details.queueStatus?.includes("خرید") ||
                      typeof analysis.details.limitStatus === "string" && analysis.details.limitStatus?.includes("سقف")
                        ? "bg-emerald-500 text-white"
                        : "bg-red-500 text-white"
                    }
                  >
                    {String(analysis.details.queueStatus || analysis.details.limitStatus || "")}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                  <div>
                    <div className="text-muted-foreground text-[10px]">حجم صف</div>
                    <div className="font-bold tabular-nums-fa">
                      {(
                        (Number(analysis.details.buyQueueVolume) || Number(analysis.details.sellQueueVolume) || 0) /
                        1000000
                      ).toFixed(1)}M
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[10px]">تعداد نفرات</div>
                    <div className="font-bold tabular-nums-fa">
                      {(
                        analysis.details.buyQueueCount || analysis.details.sellQueueCount || 0
                      ).toLocaleString("fa-IR")}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {queueLocks.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Lock className="mx-auto size-12 opacity-20 mb-2" />
                <p>هیچ صفی یافت نشد</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* پول هوشمند */}
        <TabsContent value="smart" className="mt-4">
          <div className="grid gap-3">
            {smartMoney.slice(0, 30).map(({ inst, analysis }, idx) => (
              <motion.div
                key={inst.symbol}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => onSelect?.(inst)}
                className="rounded-xl border bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-amber-500" />
                    <span className="font-bold">{inst.symbol}</span>
                    <span className="text-xs text-muted-foreground">{inst.name}</span>
                  </div>
                  <Badge className="bg-amber-500 text-white text-xs">
                    {analysis.details.smartMoney === "ورودی" ? "ورود پول هوشمند" : "تجمیع"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  {analysis.reasons.find((r) => r.includes("پول هوشمند") || r.includes("تجمیع"))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                  <div className="rounded bg-card/50 p-2">
                    <div className="text-muted-foreground text-[10px]">نسبت سفارشات بزرگ</div>
                    <div className="font-bold tabular-nums-fa">
                      {analysis.details.bigOrderRatio || 0}٪
                    </div>
                  </div>
                  <div className="rounded bg-card/50 p-2">
                    <div className="text-muted-foreground text-[10px]">امتیاز</div>
                    <div className="font-bold text-amber-500 tabular-nums-fa">
                      {analysis.score}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {smartMoney.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="mx-auto size-12 opacity-20 mb-2" />
                <p>هیچ ورود پول هوشمندی یافت نشد</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
