/**
 * تولید گزارش + خلاصه بازار خودکار
 * خروجی PDF + متن روزانه
 */

import { getCachedInstruments } from "./clientFetch";
import { calculateMarketBreadth, analyzeSectorRotation } from "./marketBreadth";
import { getSignalStats } from "./signalHistory";
import { calculatePaperPerformance } from "./paperTrading";

/** تولید خلاصه بازار روزانه */
export function generateDailySummary(): string {
  const instruments = getCachedInstruments();
  const breadth = calculateMarketBreadth(instruments);
  const sectors = analyzeSectorRotation(instruments);
  const signalStats = getSignalStats();
  const paperPerf = calculatePaperPerformance();

  const now = new Date();
  const dateStr = now.toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric" });

  let summary = `📊 گزارش روزانه بازار — ${dateStr}\n`;
  summary += "═".repeat(40) + "\n\n";

  // وضعیت کلی بازار
  summary += "📈 وضعیت کلی بازار:\n";
  summary += `  • مثبت: ${breadth.advanceCount} | منفی: ${breadth.declineCount} | خنثی: ${breadth.unchangedCount}\n`;
  summary += `  • صف خرید: ${breadth.limitUpCount} | صف فروش: ${breadth.limitDownCount}\n`;
  summary += `  • عرض بازار: ${breadth.breadthPercent > 0 ? "+" : ""}${breadth.breadthPercent}٪\n`;
  summary += `  • میانگین تغییرات: ${breadth.avgChange > 0 ? "+" : ""}${breadth.avgChange}٪\n\n`;

  // صنایع برتر
  summary += "🏆 صنایع برتر:\n";
  sectors.slice(0, 3).forEach((s, i) => {
    summary += `  ${i + 1}. ${s.name}: ${s.avgChange > 0 ? "+" : ""}${s.avgChange}٪ (${s.advanceCount}+) ${s.declineCount}-)\n`;
  });
  summary += "\n";

  // صنایع ضعیف
  summary += "📉 صنایع ضعیف:\n";
  sectors.slice(-3).forEach((s, i) => {
    summary += `  ${i + 1}. ${s.name}: ${s.avgChange > 0 ? "+" : ""}${s.avgChange}٪\n`;
  });
  summary += "\n";

  // سیگنال‌ها
  summary += "🎯 سیگنال‌ها:\n";
  summary += `  • کل سیگنال‌ها: ${signalStats.total}\n`;
  summary += `  • نرخ برد: ${signalStats.winRate}٪\n`;
  summary += `  • سود/زیان متوسط: ${signalStats.avgPnl > 0 ? "+" : ""}${signalStats.avgPnl}٪\n\n`;

  // عملکرد مجازی
  summary += "💰 عملکرد مجازی:\n";
  summary += `  • موجودی: ${paperPerf.currentEquity.toLocaleString("fa-IR")} ریال\n`;
  summary += `  • سود/زیان: ${paperPerf.totalPnlPct > 0 ? "+" : ""}${paperPerf.totalPnlPct}٪\n`;
  summary += `  • نرخ برد: ${paperPerf.winRate.toFixed(1)}٪\n\n`;

  summary += "═".repeat(40) + "\n";
  summary += "نبض بازار — دستیار معامله‌گر هوشمند";

  return summary;
}

/** تولید گزارش نماد خاص */
export function generateSymbolReport(symbol: string): string {
  const instruments = getCachedInstruments();
  const inst = instruments.find((i) => i.symbol === symbol);
  if (!inst) return `❌ نماد ${symbol} یافت نشد`;

  let report = `📊 گزارش تحلیل ${inst.name} (${inst.symbol})\n`;
  report += "═".repeat(40) + "\n\n";

  report += "📈 اطلاعات قیمتی:\n";
  report += `  • قیمت فعلی: ${inst.last.toLocaleString("fa-IR")} ریال\n`;
  report += `  • تغییر: ${inst.changePercent > 0 ? "+" : ""}${inst.changePercent}٪\n`;
  report += `  • بالاترین: ${inst.high.toLocaleString("fa-IR")} | پایین‌ترین: ${inst.low.toLocaleString("fa-IR")}\n`;
  report += `  • حجم: ${(inst.volume / 1000000).toFixed(1)}M | تعداد معامله: ${inst.tradeCount.toLocaleString("fa-IR")}\n\n`;

  if (inst.pe && inst.pe > 0) {
    report += "📊 اطلاعات بنیادی:\n";
    report += `  • P/E: ${inst.pe.toFixed(1)}\n`;
    if (inst.eps) report += `  • EPS: ${inst.eps.toLocaleString("fa-IR")} ریال\n`;
    report += "\n";
  }

  report += "═".repeat(40) + "\n";
  report += "نبض بازار — تحلیل خودکار";

  return report;
}

/** تولید خلاصه عملکرد هفتگی */
export function generateWeeklyPerformance(): string {
  const paperPerf = calculatePaperPerformance();
  const signalStats = getSignalStats();

  let report = "📊 گزارش عملکرد هفتگی\n";
  report += "═".repeat(40) + "\n\n";

  report += "💰 عملکرد معاملات مجازی:\n";
  report += `  • کل معاملات: ${paperPerf.totalTrades}\n`;
  report += `  • باز: ${paperPerf.openTrades} | بسته: ${paperPerf.closedTrades}\n`;
  report += `  • برنده: ${paperPerf.winTrades} | بازنده: ${paperPerf.lossTrades}\n`;
  report += `  • نرخ برد: ${paperPerf.winRate.toFixed(1)}٪\n`;
  report += `  • سود/زیان: ${paperPerf.totalPnlPct > 0 ? "+" : ""}${paperPerf.totalPnlPct}٪\n`;
  report += `  • Profit Factor: ${paperPerf.profitFactor}\n`;
  report += `  • حداکثر افت: ${paperPerf.maxDrawdown}٪\n\n`;

  report += "🎯 عملکرد سیگنال‌ها:\n";
  report += `  • کل سیگنال‌ها: ${signalStats.total}\n`;
  report += `  • بررسی‌شده: ${signalStats.checked}\n`;
  report += `  • نرخ برد: ${signalStats.winRate}٪\n`;
  report += `  • سود متوسط: ${signalStats.avgPnl > 0 ? "+" : ""}${signalStats.avgPnl}٪\n\n`;

  report += "═".repeat(40) + "\n";
  return report;
}

/** کپی کردن متن در کلیپ‌بورد */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** دانلود متن به عنوان فایل */
export function downloadAsText(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
