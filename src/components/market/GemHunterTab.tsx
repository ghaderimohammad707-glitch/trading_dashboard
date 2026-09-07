/**
 * تب کشف گنج (Gem Hunter) — اسکن مداوم بازار
 * Finds assets with high Gem Score: low P/E + suspicious volume + uptrend + smart money
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Gem, TrendingUp, TrendingDown, Star, Zap, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Instrument } from "@/lib/clientFetch";
import { generateSignal, type CompositeSignal } from "@/lib/analysisEngines";

interface GemHunterProps {
  instruments: Instrument[];
  onSelect?: (inst: Instrument) => void;
}

export function GemHunterTab({ instruments, onSelect }: GemHunterProps) {
  const gems = useMemo(() => {
    return instruments
      .map((inst) => generateSignal(inst))
      .filter((sig) => sig.gemScore !== undefined && sig.gemScore >= 30)
      .sort((a, b) => (b.gemScore || 0) - (a.gemScore || 0));
  }, [instruments]);

  const categories = useMemo(() => {
    const result: Record<string, CompositeSignal[]> = {
      بورس: [],
      فرابورس: [],
      صندوق: [],
      اختیار: [],
    };
    gems.forEach((g) => {
      const inst = instruments.find((i) => i.symbol === g.symbol);
      if (!inst) return;
      if (inst.segment === "tse") result.بورس.push(g);
      else if (inst.segment === "ifb") result.فرابورس.push(g);
      else if (inst.segment === "fund") result.صندوق.push(g);
      else if (inst.segment === "option") result.اختیار.push(g);
    });
    return result;
  }, [gems, instruments]);

  const totalGems = gems.length;

  if (totalGems === 0) {
    return (
      <div className="flex flex-col gap-4" dir="rtl">
        <div className="text-center py-16">
          <Gem className="mx-auto mb-3 size-12 text-amber-400/30" />
          <h2 className="text-lg font-bold mb-1">💎 کشف گنج</h2>
          <p className="text-sm text-muted-foreground">
            {instruments.length === 0 ? 'ابتدا داده بازار را بارگذاری کنید' : `${instruments.length.toLocaleString('fa-IR')} نماد اسکن شد — هیچ گنجی با آستانه فعلی یافت نشد`}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            دارایی‌هایی با بنیاد قوی + روند صعودی + حجم مناسب
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" dir="rtl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Gem className="size-5 text-amber-400" />
          <h2 className="text-lg font-bold">💎 کشف گنج</h2>
          <Badge variant="secondary" className="text-xs">{totalGems} دارایی</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          دارایی‌هایی که موتورها عالی ارزیابی کردند — ترکیب تکنیکال + بنیادی + تابلوخوانی
        </p>
      </div>

      {/* Gem Score Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { range: "80-100", label: "💎 الماس", color: "text-amber-400" },
          { range: "70-79", label: "⭐ ستاره", color: "text-purple-400" },
          { range: "60-69", label: "🔥 امیدوارکننده", color: "text-orange-400" },
          { range: "55-59", label: "📊 قابل بررسی", color: "text-blue-400" },
        ].map((l) => (
          <span key={l.range} className={`${l.color} font-medium`}>
            {l.label} ({l.range})
          </span>
        ))}
      </div>

      {/* Categories */}
      {Object.entries(categories).map(([cat, catGems]) => {
        if (catGems.length === 0) return null;
        return (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              {cat} <Badge variant="outline" className="text-[10px]">{catGems.length}</Badge>
            </h3>
            <div className="grid gap-2">
              {catGems.map((gem, idx) => {
                const inst = instruments.find((i) => i.symbol === gem.symbol);
                const score = gem.gemScore || 0;
                const scoreColor = score >= 80 ? "text-amber-400" : score >= 70 ? "text-purple-400" : score >= 60 ? "text-orange-400" : "text-blue-400";
                const scoreIcon = score >= 80 ? "💎" : score >= 70 ? "⭐" : score >= 60 ? "🔥" : "📊";

                return (
                  <motion.div
                    key={gem.symbol}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center justify-between rounded-xl border bg-card p-3 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => inst && onSelect?.(inst)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Gem Score Badge */}
                      <div className={`flex size-10 items-center justify-center rounded-xl text-lg font-bold ${scoreColor} bg-card border`}>
                        {score}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{gem.symbol}</span>
                          <span className="text-xs text-muted-foreground">{gem.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>📈 {inst?.pe ? `P/E: ${inst.pe.toFixed(1)}` : "—"}</span>
                          <span>💰 {inst?.eps ? `EPS: ${inst.eps.toLocaleString("fa-IR")}` : "—"}</span>
                          <span className="font-mono" dir="ltr">{inst?.last?.toLocaleString()}</span>
                          <span className={gem.signal === "buy" ? "text-emerald-400" : gem.signal === "sell" ? "text-red-400" : "text-yellow-400"}>
                            {gem.signal === "buy" ? "🟢 خرید" : gem.signal === "sell" ? "🔴 فروش" : "🟡 نگهداری"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {scoreIcon}
                      <div className="text-left text-xs">
                        <div className="font-semibold">{score} Gem</div>
                        <div className="text-muted-foreground">قدرت {gem.strength}٪</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
