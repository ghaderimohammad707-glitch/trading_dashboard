/**
 * موتور تابلوخوانی پیشرفته — نسخه کامل
 * عمق بازار ۵ سطحی، کد به کد، پول هوشمند، صف واقعی، نسبت حقیقی/حقوقی
 */

import type { Instrument } from "@/lib/clientFetch";
import type { AnalysisResult } from "./analysisEngines";

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function signalFromScore(score: number, threshold = 15): "buy" | "sell" | "hold" {
  return score > threshold ? "buy" : score < -threshold ? "sell" : "hold";
}

/** جمع حجم‌های خرید در ۵ سطح */
function totalBidVol(inst: Instrument): number {
  return (inst.bestBuyVol1 || 0) + (inst.bestBuyVol2 || 0) + (inst.bestBuyVol3 || 0) + (inst.bestBuyVol4 || 0) + (inst.bestBuyVol5 || 0);
}
/** جمع حجم‌های فروش در ۵ سطح */
function totalAskVol(inst: Instrument): number {
  return (inst.bestSellVol1 || 0) + (inst.bestSellVol2 || 0) + (inst.bestSellVol3 || 0) + (inst.bestSellVol4 || 0) + (inst.bestSellVol5 || 0);
}

export function analyzeTablouKhaniFull(inst: Instrument): AnalysisResult {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  const { last, close, open, high, low, changePercent, volume, value, tradeCount } = inst;

  // ═══════════════════════════════════════════════
  //  1. عمق بازار ۵ سطحی (Depth of Market)
  // ═══════════════════════════════════════════════

  const totalBid = totalBidVol(inst);
  const totalAsk = totalAskVol(inst);
  const totalDepth = totalBid + totalAsk;

  if (totalDepth > 0) {
    // عمق کل بازار
    details.totalBidVolume = totalBid;
    details.totalAskVolume = totalAsk;
    details.totalDepth = totalDepth;

    // نسبت عمق خرید به فروش
    const depthRatio = totalAsk > 0 ? totalBid / totalAsk : totalBid > 0 ? 10 : 1;
    details.depthRatio = Math.round(depthRatio * 100) / 100;

    if (depthRatio > 3) {
      score += 25;
      reasons.push(`🟢 عمق بازار بسیار مثبت — نسبت خرید/فروش ${depthRatio.toFixed(1)}:۱`);
      details.dominantSide = "خریداران";
    } else if (depthRatio > 1.5) {
      score += 15;
      reasons.push(`🟢 عمق بازار مثبت — نسبت ${depthRatio.toFixed(1)}:۱`);
      details.dominantSide = "خریداران";
    } else if (depthRatio < 0.33) {
      score -= 25;
      reasons.push(`🔴 عمق بازار بسیار منفی — نسبت خرید/فروش ${depthRatio.toFixed(1)}:۱`);
      details.dominantSide = "فروشندگان";
    } else if (depthRatio < 0.67) {
      score -= 15;
      reasons.push(`🔴 عمق بازار منفی — نسبت ${depthRatio.toFixed(1)}:۱`);
      details.dominantSide = "فروشندگان";
    }

    // تحلیل هر ۵ سطح
    const levels = [
      { bid: inst.bestBuyVol1, ask: inst.bestSellVol1, bidP: inst.bestBuy1, askP: inst.bestSell1 },
      { bid: inst.bestBuyVol2, ask: inst.bestSellVol2, bidP: inst.bestBuy2, askP: inst.bestSell2 },
      { bid: inst.bestBuyVol3, ask: inst.bestSellVol3, bidP: inst.bestBuy3, askP: inst.bestSell3 },
      { bid: inst.bestBuyVol4, ask: inst.bestSellVol4, bidP: inst.bestBuy4, askP: inst.bestSell4 },
      { bid: inst.bestBuyVol5, ask: inst.bestSellVol5, bidP: inst.bestBuy5, askP: inst.bestSell5 },
    ];

    // تشخیص دیوار خرید/فروش در هر سطح
    for (let i = 0; i < levels.length; i++) {
      const lv = levels[i];
      if (lv.bid && lv.bid > 10000000) {
        score += 8;
        reasons.push(`🟢 دیوار خرید سطح ${i + 1}: ${(lv.bid / 1000000).toFixed(1)}M`);
      }
      if (lv.ask && lv.ask > 10000000) {
        score -= 8;
        reasons.push(`🔴 دیوار فروش سطح ${i + 1}: ${(lv.ask / 1000000).toFixed(1)}M`);
      }
    }

    // نسبت سفارشات بزرگ (حقوقی)
    const topBid = inst.bestBuyVol1 || 0;
    const topAsk = inst.bestSellVol1 || 0;
    if (volume > 0) {
      const bigOrderRatio = (topBid + topAsk) / volume;
      details.bigOrderRatio = Math.round(bigOrderRatio * 100);
      if (bigOrderRatio > 0.4 && changePercent > 0) {
        score += 12;
        reasons.push(`🐋 نسبت سفارشات بزرگ بالا (${(bigOrderRatio * 100).toFixed(0)}٪) — پول هوشمند`);
        details.smartMoney = "ورودی";
      } else if (bigOrderRatio > 0.4 && changePercent < 0) {
        score -= 12;
        reasons.push(`🐋 نسبت سفارشات بزرگ بالا — خروج پول هوشمند`);
        details.smartMoney = "خروجی";
      }
    }

    // قیمت در برابر نقطه میانی عمق
    if (inst.bestBuy1 && inst.bestSell1 && inst.bestBuy1 > 0 && inst.bestSell1 > 0) {
      const midPrice = (inst.bestBuy1 + inst.bestSell1) / 2;
      const pricePressure = ((last - midPrice) / midPrice) * 100;
      details.pricePressure = Math.round(pricePressure * 100) / 100;

      if (pricePressure > 2) {
        score += 10;
        reasons.push(`📈 قیمت بالاتر از نقطه میانی — فشار خرید (+${pricePressure.toFixed(1)}٪)`);
      } else if (pricePressure < -2) {
        score -= 10;
        reasons.push(`📉 قیمت پایین‌تر از نقطه میانی — فشار فروش (${pricePressure.toFixed(1)}٪)`);
      }
    }
  }

  // ═══════════════════════════════════════════════
  //  2. تحلیل کد به کد (حقوقی↔حقوقی، حقیقی↔حقیقی)
  // ═══════════════════════════════════════════════

  const realBuy = inst.realBuyVolume || 0;
  const realSell = inst.realSellVolume || 0;
  const legalBuy = inst.legalBuyVolume || 0;
  const legalSell = inst.legalSellVolume || 0;
  const realBuyCnt = inst.realBuyCount || 0;
  const realSellCnt = inst.realSellCount || 0;
  const legalBuyCnt = inst.legalBuyCount || 0;
  const legalSellCnt = inst.legalSellCount || 0;

  const totalReal = realBuy + realSell;
  const totalLegal = legalBuy + legalSell;
  const totalAllVolume = totalReal + totalLegal;

  if (totalAllVolume > 0) {
    // خالص خرید حقیقی
    const realNetFlow = realBuy - realSell;
    const realNetFlowPct = (realNetFlow / totalAllVolume) * 100;
    details.realNetFlow = realNetFlow;
    details.realNetFlowPct = Math.round(realNetFlowPct * 10) / 10;

    // خالص خرید حقوقی
    const legalNetFlow = legalBuy - legalSell;
    const legalNetFlowPct = (legalNetFlow / totalAllVolume) * 100;
    details.legalNetFlow = legalNetFlow;
    details.legalNetFlowPct = Math.round(legalNetFlowPct * 10) / 10;

    details.realBuyVolume = realBuy;
    details.realSellVolume = realSell;
    details.legalBuyVolume = legalBuy;
    details.legalSellVolume = legalSell;

    // سیگنال کد به کد
    if (realNetFlow > 0 && legalNetFlow < 0) {
      // حقیقی می‌خرد، حقوقی می‌فروشد → توزیع
      score -= 15;
      reasons.push("🔄 کد به کد: حقیقی خریدار (+) و حقوقی فروشنده (-) — احتمال توزیع");
      details.codeToCode = "توزیع (حقوقی→حقیقی)";
    } else if (realNetFlow < 0 && legalNetFlow > 0) {
      // حقیقی می‌فروشد، حقوقی می‌خرد → تجمیع
      score += 15;
      reasons.push("🔄 کد به کد: حقوقی خریدار (+) و حقیقی فروشنده (-) — احتمال تجمیع");
      details.codeToCode = "تجمیع (حقیقی→حقوقی)";
    } else if (realNetFlow > 0 && legalNetFlow > 0) {
      // هر دو می‌خرند → تقاضای سنگین
      score += 20;
      reasons.push("🔥 هم حقیقی و هم حقوقی خریدار — تقاضای سنگین");
      details.codeToCode = "تقاضای مشترک";
    } else if (realNetFlow < 0 && legalNetFlow < 0) {
      // هر دو می‌فروشند → عرضه سنگین
      score -= 20;
      reasons.push("💥 هم حقیقی و هم حقوقی فروشنده — عرضه سنگین");
      details.codeToCode = "عرضای مشترک";
    }

    // کد به کد واقعی (حقوقی به حقوقی)
    if (legalBuyCnt > 0 && legalSellCnt > 0 && legalBuy > 0 && legalSell > 0) {
      const legalInternalRatio = Math.min(legalBuy, legalSell) / Math.max(legalBuy, legalSell);
      details.legalInternalRatio = Math.round(legalInternalRatio * 100);
      if (legalInternalRatio > 0.8 && legalBuy > 50000000) {
        score -= 10;
        reasons.push("⚠️ نشانه کد به کد حقوقی — حجم بالا در هر دو سمت");
        details.legalToLegal = "فعال";
      }
    }

    // کد به کد حقیقی
    if (realBuyCnt > 0 && realSellCnt > 0 && realBuy > 0 && realSell > 0) {
      const realInternalRatio = Math.min(realBuy, realSell) / Math.max(realBuy, realSell);
      details.realInternalRatio = Math.round(realInternalRatio * 100);
      if (realInternalRatio > 0.8 && realBuy > 50000000) {
        reasons.push("🔄 نشانه کد به کد حقیقی — جابجایی بین کدهای حقیقی");
        details.realToReal = "فعال";
      }
    }

    // نسبت حقیقی/حقوقی
    const realPct = totalAllVolume > 0 ? (totalReal / totalAllVolume) * 100 : 50;
    const legalPct = 100 - realPct;
    details.realParticipation = Math.round(realPct);
    details.legalParticipation = Math.round(legalPct);

    if (realPct > 75) {
      reasons.push(`👤 مشارکت بالای حقیقی (${realPct.toFixed(0)}٪) — بازار خُرد فعال`);
    } else if (legalPct > 75) {
      reasons.push(`🏛️ مشارکت بالای حقوقی (${legalPct.toFixed(0)}٪) — بازار نهادی فعال`);
    }
  }

  // ═══════════════════════════════════════════════
  //  3. صف خرید/فروش واقعی
  // ═══════════════════════════════════════════════

  const buyQueueVol = inst.buyQueueVolume || 0;
  const sellQueueVol = inst.sellQueueVolume || 0;
  const buyQueueCnt = inst.buyQueueCount || 0;
  const sellQueueCnt = inst.sellQueueCount || 0;

  if (buyQueueVol > 0 || sellQueueVol > 0) {
    details.buyQueueVolume = buyQueueVol;
    details.sellQueueVolume = sellQueueVol;
    details.buyQueueCount = buyQueueCnt;
    details.sellQueueCount = sellQueueCnt;

    if (buyQueueVol > 0 && sellQueueVol > 0) {
      const queueRatio = buyQueueVol / sellQueueVol;
      details.queueRatio = Math.round(queueRatio * 100) / 100;

      if (queueRatio > 5) {
        score += 25;
        reasons.push(`🔒 صف خرید سنگین — نسبت ${queueRatio.toFixed(1)}:۱ (${buyQueueCnt.toLocaleString("fa-IR")} نفر)`);
        details.queueStatus = "صف خرید سنگین";
      } else if (queueRatio > 2) {
        score += 15;
        reasons.push(`🟢 صف خرید — نسبت ${queueRatio.toFixed(1)}:۱`);
        details.queueStatus = "صف خرید";
      } else if (queueRatio < 0.2) {
        score -= 25;
        reasons.push(`🔒 صف فروش سنگین — نسبت ${queueRatio.toFixed(1)}:۱ (${sellQueueCnt.toLocaleString("fa-IR")} نفر)`);
        details.queueStatus = "صف فروش سنگین";
      } else if (queueRatio < 0.5) {
        score -= 15;
        reasons.push(`🔴 صف فروش — نسبت ${queueRatio.toFixed(1)}:۱`);
        details.queueStatus = "صف فروش";
      }
    } else if (buyQueueVol > 0) {
      score += 12;
      reasons.push(`🟢 صف خرید — حجم ${buyQueueVol.toLocaleString("fa-IR")}`);
      details.queueStatus = "صف خرید";
    } else if (sellQueueVol > 0) {
      score -= 12;
      reasons.push(`🔴 صف فروش — حجم ${sellQueueVol.toLocaleString("fa-IR")}`);
      details.queueStatus = "صف فروش";
    }
  }

  // تشخیص سقف/کف قیمت مجاز
  if (changePercent >= 4.9 && changePercent <= 5.1) {
    score += 12; reasons.push("🔒 صف خرید (+5%)"); details.limitStatus = "سقف";
  } else if (changePercent <= -4.9 && changePercent >= -5.1) {
    score -= 12; reasons.push("🔒 صف فروش (-5%)"); details.limitStatus = "کف";
  } else if (changePercent >= 9.5 && changePercent <= 10.1) {
    score += 18; reasons.push("🔒🔒 صف خرید محکم (+10%)"); details.limitStatus = "سقف محکم";
  } else if (changePercent <= -9.5 && changePercent >= -10.1) {
    score -= 18; reasons.push("🔒🔒 صف فروش محکم (-10%)"); details.limitStatus = "کف محکم";
  }

  // ═══════════════════════════════════════════════
  //  4. حجم مشکوک با فیلتر پیشرفته
  // ═══════════════════════════════════════════════

  if (volume > 0) {
    // حجم مشکوک: تغییر کم ولی حجم بالا
    if (volume > 2000000 && Math.abs(changePercent) < 0.5) {
      score += 12;
      reasons.push("🔍 حجم مشکوک — تغییر قیمت کم ولی حجم بالا (انباشت/توزیع)");
      details.suspiciousVolume = 1;
    }

    // حجم بالا با روند → تأیید
    if (volume > 3000000 && changePercent > 2) {
      score += 15;
      reasons.push("📈 حجم بالا + رشد قیمت — تأیید روند صعودی");
    } else if (volume > 3000000 && changePercent < -2) {
      score -= 15;
      reasons.push("📉 حجم بالا + افت قیمت — هشدار نزولی");
    }

    // حجم مشکوک با کد به کد
    if (volume > 5000000 && totalLegal > totalReal * 2 && Math.abs(changePercent) < 1) {
      score -= 8;
      reasons.push("⚠️ حجم بالا + حقوقی فروشنده + تغییر کم → احتمال کد به کد");
      details.suspiciousCodeToCode = 1;
    }

    // حجم بلوکی
    if (tradeCount < 100 && volume > 100000000) {
      reasons.push("📦 معامله بلوکی — حجم بالا با تعداد معاملات کم");
      details.blockTrade = 1;
    }

    // تعداد معاملات
    details.tradeCount = tradeCount;
    if (tradeCount > 10000) {
      score += 5;
      reasons.push(`✅ نقدشوندگی عالی (${tradeCount.toLocaleString("fa-IR")} معامله)`);
    } else if (tradeCount < 100) {
      score -= 8;
      reasons.push(`⚠️ نقدشوندگی بسیار کم (${tradeCount} معامله)`);
    }
  }

  // ═══════════════════════════════════════════════
  //  5. انحراف قیمت پایانی/آخر
  // ═══════════════════════════════════════════════

  if (close > 0 && last > 0 && last !== close) {
    const diff = ((last - close) / close) * 100;
    details.closingDeviation = Math.round(diff * 100) / 100;
    if (diff > 1.5) {
      score += 8;
      reasons.push(`📈 قیمت آخر بالاتر از پایانی (+${diff.toFixed(1)}٪) — احتمال رشد فردا`);
    } else if (diff < -1.5) {
      score -= 8;
      reasons.push(`📉 قیمت آخر پایین‌تر از پایانی (${diff.toFixed(1)}٪) — احتمال افت فردا`);
    }
  }

  // ═══════════════════════════════════════════════
  //  6. نوسان درون‌روزی
  // ═══════════════════════════════════════════════

  if (high > 0 && low > 0 && last > 0) {
    const rangePct = ((high - low) / last) * 100;
    details.intradayRange = Math.round(rangePct * 100) / 100;
    if (rangePct > 6) { reasons.push(`🌊 نوسان زیاد (${rangePct.toFixed(1)}٪) — ریسک بالا`); }
    else if (rangePct < 1) { reasons.push(`⚓ ثبات قیمت (${rangePct.toFixed(1)}٪ نوسان)`); }
  }

  const clamped = clamp(score, -100, 100);
  return { signal: signalFromScore(clamped), score: clamped, reasons, details };
}
