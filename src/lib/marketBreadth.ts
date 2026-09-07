/**
 * تحلیل عرض بازار و چرخش صنایع
 * Market Breadth, Advance/Decline, Sector Rotation
 */

import type { Instrument } from "@/lib/clientFetch";

export interface MarketBreadthData {
  advanceCount: number;        // نمادهای مثبت
  declineCount: number;        // نمادهای منفی
  unchangedCount: number;      // بدون تغییر
  limitUpCount: number;        // صف خرید
  limitDownCount: number;      // صف فروش
  advanceDeclineRatio: number; // نسبت پیشرفت/افت
  breadthPercent: number;      // درصد عرض بازار
  newHighCount: number;        // نمادهای نزدیک سقف
  newLowCount: number;         // نمادهای نزدیک کف
  avgChange: number;           // میانگین تغییرات
  weightedAvgChange: number;   // میانگین تغییرات وزنی
  strongBuyCount: number;      // حجم بالا + مثبت
  strongSellCount: number;     // حجم بالا + منفی
}

export interface SectorData {
  name: string;
  avgChange: number;
  totalVolume: number;
  advanceCount: number;
  declineCount: number;
  topGainers: { symbol: string; changePercent: number }[];
  topLosers: { symbol: string; changePercent: number }[];
  momentum: "strong_up" | "up" | "flat" | "down" | "strong_down";
}

/**
 * گروه‌بندی نمادها بر اساس نام
 */
function classifySector(inst: Instrument): string {
  const name = inst.name;
  if (name.includes("فولاد") || name.includes("فملی") || name.includes("فاسمین") || name.includes("فخاس")) return "فلزات اساسی";
  if (name.includes("پتروشیمی") || name.includes("پترول") || name.includes("پارسان") || name.includes("شپدیس")) return "پتروشیمی";
  if (name.includes("بانک") || name.includes("وبملت") || name.includes("وتجارت") || name.includes("وبصادر") || name.includes("وسینا")) return "بانکی";
  if (name.includes("خودرو") || name.includes("خساپا") || name.includes("خپارس") || name.includes("خگستر")) return "خودرویی";
  if (name.includes("سیمان") || name.includes("سشرق") || name.includes("سبهان")) return "سیمانی";
  if (name.includes("دارو") || name.includes("دالیا") || name.includes("دارا")) return "دارویی";
  if (name.includes("شبندر") || name.includes("شپنا") || name.includes("شتران") || name.includes("نفت")) return "فرآورده‌های نفتی";
  if (name.includes("صندوق")) return "صندوق‌ها";
  if (name.includes("اختیار")) return "اختیار معامله";
  return "سایر";
}

/**
 * محاسبه عرض بازار
 */
export function calculateMarketBreadth(instruments: Instrument[]): MarketBreadthData {
  let advanceCount = 0;
  let declineCount = 0;
  let unchangedCount = 0;
  let limitUpCount = 0;
  let limitDownCount = 0;
  let newHighCount = 0;
  let newLowCount = 0;
  let totalChange = 0;
  let weightedChange = 0;
  let totalVolume = 0;
  let strongBuyCount = 0;
  let strongSellCount = 0;

  for (const inst of instruments) {
    if (inst.segment !== "tse" && inst.segment !== "ifb") continue;
    if (inst.last <= 0) continue;

    const change = inst.changePercent;

    if (change > 0) advanceCount++;
    else if (change < 0) declineCount++;
    else unchangedCount++;

    if (change >= 4.9) limitUpCount++;
    if (change <= -4.9) limitDownCount++;

    // نزدیک سقف/کف قیمت مجاز
    if (inst.high > 0 && inst.last > 0) {
      const distToHigh = ((inst.high - inst.last) / inst.high) * 100;
      if (distToHigh < 0.5) newHighCount++;
      const distToLow = ((inst.last - inst.low) / inst.low) * 100;
      if (distToLow < 0.5 && inst.low > 0) newLowCount++;
    }

    totalChange += change;
    totalVolume += inst.volume;

    // تغییرات وزنی بر اساس حجم
    weightedChange += change * inst.volume;

    // حجم بالا + مثبت/منفی
    if (inst.volume > 5000000 && change > 2) strongBuyCount++;
    if (inst.volume > 5000000 && change < -2) strongSellCount++;
  }

  const total = advanceCount + declineCount + unchangedCount;

  return {
    advanceCount,
    declineCount,
    unchangedCount,
    limitUpCount,
    limitDownCount,
    advanceDeclineRatio: declineCount > 0 ? Math.round((advanceCount / declineCount) * 100) / 100 : advanceCount > 0 ? 10 : 0,
    breadthPercent: total > 0 ? Math.round(((advanceCount - declineCount) / total) * 100) : 0,
    newHighCount,
    newLowCount,
    avgChange: total > 0 ? Math.round((totalChange / total) * 100) / 100 : 0,
    weightedAvgChange: totalVolume > 0 ? Math.round((weightedChange / totalVolume) * 100) / 100 : 0,
    strongBuyCount,
    strongSellCount,
  };
}

/**
 * تحلیل چرخش صنایع
 */
export function analyzeSectorRotation(instruments: Instrument[]): SectorData[] {
  const sectorMap = new Map<string, Instrument[]>();

  for (const inst of instruments) {
    if (inst.segment !== "tse" && inst.segment !== "ifb") continue;
    if (inst.last <= 0) continue;

    const sector = classifySector(inst);
    if (!sectorMap.has(sector)) sectorMap.set(sector, []);
    sectorMap.get(sector)!.push(inst);
  }

  const sectors: SectorData[] = [];

  for (const [name, insts] of sectorMap) {
    const totalVolume = insts.reduce((s, i) => s + i.volume, 0);
    const avgChange = insts.reduce((s, i) => s + i.changePercent, 0) / insts.length;
    const advanceCount = insts.filter((i) => i.changePercent > 0).length;
    const declineCount = insts.filter((i) => i.changePercent < 0).length;

    const sorted = [...insts].sort((a, b) => b.changePercent - a.changePercent);
    const topGainers = sorted.slice(0, 3).map((i) => ({ symbol: i.symbol, changePercent: i.changePercent }));
    const topLosers = sorted.slice(-3).reverse().map((i) => ({ symbol: i.symbol, changePercent: i.changePercent }));

    let momentum: SectorData["momentum"] = "flat";
    if (avgChange > 3) momentum = "strong_up";
    else if (avgChange > 1) momentum = "up";
    else if (avgChange < -3) momentum = "strong_down";
    else if (avgChange < -1) momentum = "down";

    sectors.push({
      name,
      avgChange: Math.round(avgChange * 100) / 100,
      totalVolume,
      advanceCount,
      declineCount,
      topGainers,
      topLosers,
      momentum,
    });
  }

  return sectors.sort((a, b) => b.avgChange - a.avgChange);
}
