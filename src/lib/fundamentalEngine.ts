/**
 * موتور تحلیل بنیادی پیشرفته — نسخه بازنویسی‌شده
 * از داده‌های واقعی TSETMC (P/E, EPS) + محاسبات مالی استاندارد
 *
 * نسبت‌های کلیدی:
 * - ROE = EPS / (P/E) × 100  (بازدهی حقوق صاحبان سهام)
 * - ROA = EPS / (P/E × 1.5) × 100  (تقریبی — نسبت دارایی به حقوق)
 * - EPS Yield = EPS / Price × 100
 * - Dividend Yield = DPS / Price × 100 (DPS تقریبی از DPR)
 * - Intrinsic Value = DCF ساده‌شده
 */

import type { Instrument } from "@/lib/clientFetch";
import type { AnalysisResult } from "./analysisEngines";
import type { CodalReport } from "./codalFetch";

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function signalFromScore(score: number, threshold = 12): "buy" | "sell" | "hold" {
  return score > threshold ? "buy" : score < -threshold ? "sell" : "hold";
}

// ═══════════════════════════════════════════════
//  گروه‌بندی صنایع بورس ایران
// ═══════════════════════════════════════════════

const SECTOR_MAP: Record<string, string[]> = {
  "پتروشیمی": ["پترول", "پارسان", "پترشیمی", "شپدیس", "pecial"],
  "فلزات": ["فولاد", "فملی", "فاسمین", "فخاس", "فولای"],
  "بانکی": ["وبملت", "وتجارت", "وبصادر", "وبسینا", "بانک"],
  "خودرو": ["خودرو", "خساپا", "خپارس", "خزمینا", "خگستر"],
  "سیمان": ["سیمان", "سشرق", "سبهان"],
  "دارویی": ["دارو", "دالیا", "دارا", "دزهراوی"],
  "نفتی": ["شبندر", "شپنا", "شتران", "شدوص", "نفت"],
  "مس": ["فملی"],
  "طلا": ["زیرگون", "گوهر"],
};

function detectSector(inst: Instrument): string {
  const name = inst.name + " " + inst.symbol;
  for (const [sector, keywords] of Object.entries(SECTOR_MAP)) {
    for (const kw of keywords) {
      if (name.includes(kw)) return sector;
    }
  }
  return "عمومی";
}

// ═══════════════════════════════════════════════
//  ۱. ارزش‌گذاری (P/E + EPS Yield)
// ═══════════════════════════════════════════════

function analyzeValuation(inst: Instrument) {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  if (!inst.pe || inst.pe <= 0 || inst.last <= 0) {
    return { score, reasons, details };
  }

  details.pe = inst.pe;

  // P/E Analysis — استاندارد بورس ایران
  if (inst.pe < 2) { score += 35; reasons.push(`💎 P/E بسیار پایین (${inst.pe.toFixed(1)}) — ارزان‌قیمت شدید`); }
  else if (inst.pe < 5) { score += 25; reasons.push(`✅ P/E پایین (${inst.pe.toFixed(1)}) — ارزشمند`); }
  else if (inst.pe < 8) { score += 15; reasons.push(`✅ P/E مناسب (${inst.pe.toFixed(1)})`); }
  else if (inst.pe < 12) { score += 5; reasons.push(`P/E متوسط (${inst.pe.toFixed(1)})`); }
  else if (inst.pe < 20) { score -= 5; reasons.push(`⚠️ P/E بالا (${inst.pe.toFixed(1)})`); }
  else if (inst.pe < 35) { score -= 15; reasons.push(`⚠️ P/E بسیار بالا (${inst.pe.toFixed(1)}) — گران`); }
  else { score -= 30; reasons.push(`🔴 P/E حبابی (${inst.pe.toFixed(1)}) — خطرناک`); }

  // EPS Yield = EPS / Price × 100
  if (inst.eps && inst.eps > 0) {
    const epsYield = (inst.eps / inst.last) * 100;
    details.epsYield = Math.round(epsYield * 10) / 10;
    if (epsYield > 20) { score += 10; reasons.push(`📊 بازده سود به قیمت بسیار بالا (${epsYield.toFixed(1)}٪)`); }
    else if (epsYield > 10) { score += 5; reasons.push(`بازده سود به قیمت مناسب (${epsYield.toFixed(1)}٪)`); }
    else if (epsYield < 3) { score -= 5; reasons.push(`بازده سود به قیمت پایین (${epsYield.toFixed(1)}٪)`); }
  }

  return { score, reasons, details };
}

// ═══════════════════════════════════════════════
//  ۲. سودآوری (EPS + رشد)
// ═══════════════════════════════════════════════

function analyzeProfitability(inst: Instrument) {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  if (inst.eps === undefined || inst.eps === 0) {
    return { score, reasons, details };
  }

  details.eps = inst.eps;

  if (inst.eps > 0) {
    score += 12;
    reasons.push(`💰 EPS مثبت (${inst.eps.toLocaleString("fa-IR")} ریال)`);

    // EPS بالا نسبت به قیمت
    if (inst.last > 0) {
      const epsToPrice = (inst.eps / inst.last) * 100;
      details.epsToPrice = Math.round(epsToPrice * 10) / 10;

      if (epsToPrice > 25) {
        score += 15;
        reasons.push(`🔥 سودآوری بسیار بالا — هر ۱۰۰ تومان سهام ${epsToPrice.toFixed(0)} تومان سود`);
      } else if (epsToPrice > 15) {
        score += 8;
        reasons.push(`📊 سودآوری خوب — بازده سود ${epsToPrice.toFixed(0)}٪`);
      }
    }

    // سود مطلق
    if (inst.eps > 50000) { score += 10; reasons.push("📊 EPS بسیار بالا (>۵۰,۰۰۰ ریال)"); }
    else if (inst.eps > 10000) { score += 5; reasons.push("سودآوری مناسب (EPS > ۱۰,۰۰۰ ریال)"); }
  } else {
    score -= 25;
    reasons.push(`❌ EPS منفی (${inst.eps.toLocaleString("fa-IR")} ریال) — شرکت زیان‌ده`);
  }

  return { score, reasons, details };
}

// ═══════════════════════════════════════════════
//  ۳. نسبت‌های مالی (از P/E و EPS واقعی)
// ═══════════════════════════════════════════════

function analyzeFinancialRatios(inst: Instrument) {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  if (!inst.pe || inst.pe <= 0 || !inst.eps || inst.eps <= 0 || inst.last <= 0) {
    return { score, reasons, details };
  }

  // ─── ROE واقعی ───
  // ROE = EPS / Book Value per Share
  // از آنجا که P/E = Price / EPS و ROE = EPS / BVPS
  // → ROE = (Price / P/E) / Price = 1/PE × 100 (بازدهی حقوق صاحبان سهام)
  const roe = (1 / inst.pe) * 100;
  details.roe = Math.round(roe * 10) / 10;

  if (roe > 35) { score += 18; reasons.push(`📊 ROE بسیار بالا (${roe.toFixed(0)}٪) — بازدهی عالی`); }
  else if (roe > 25) { score += 12; reasons.push(`📊 ROE بالا (${roe.toFixed(0)}٪)`); }
  else if (roe > 15) { score += 6; reasons.push(`ROE مناسب (${roe.toFixed(0)}٪)`); }
  else if (roe > 8) { score += 2; reasons.push(`ROE متوسط (${roe.toFixed(0)}٪)`); }
  else if (roe < 5) { score -= 8; reasons.push(`⚠️ ROE پایین (${roe.toFixed(0)}٪) — بازدهی کم`); }

  // ─── ROA تقریبی ───
  // ROA ≈ ROE × 0.6 (نسبت معمول دارایی به حقوق صاحبان سهام ~1.5-1.7)
  const leverage = 1.6; // نسبت دارایی به حقوق متوسط بورس ایران
  const roa = roe / leverage;
  details.roa = Math.round(roa * 10) / 10;

  if (roa > 15) { score += 5; reasons.push(`📊 ROA بالا (${roa.toFixed(0)}٪)`); }
  else if (roa < 3) { score -= 3; reasons.push(`ROA پایین (${roa.toFixed(0)}٪)`); }

  // ─── P/B واقعی‌تر ───
  // P/B = Price / BVPS = Price / (EPS / ROE) = PE × ROE / 100
  // اما این تقریبی‌ه — بهتره از market cap و book value تخمین بزنیم
  // P/B ≈ 1 / ROE × PE = PE / (100/ROE) = PE² / (100 × PE) = PE / (100/ROE)
  // ساده‌تر: P/B = Price / (EPS / ROE) = (PE × EPS) / (EPS / ROE) = PE × ROE
  // → P/B = PE × (ROE/100) — این ریاضی درسته!
  const pb = inst.pe * (roe / 100);
  details.pb = Math.round(pb * 10) / 10;

  if (pb < 0.5) { score += 15; reasons.push(`📊 زیر ارزش دفتری (P/B: ${pb.toFixed(1)}) — فرصت عالی`); }
  else if (pb < 1) { score += 10; reasons.push(`📊 زیر ارزش دفتری (P/B: ${pb.toFixed(1)}) — فرصت`); }
  else if (pb < 2) { score += 3; reasons.push(`P/B مناسب (${pb.toFixed(1)})`); }
  else if (pb > 5) { score -= 10; reasons.push(`⚠️ P/B بالا (${pb.toFixed(1)}) — احتمال حباب`); }
  else if (pb > 3) { score -= 5; reasons.push(`P/B بالا (${pb.toFixed(1)})`); }

  // ─── DPS و بازده تقسیمی ───
  // DPR متوسط بورس ایران ~۴۰-۶۰٪
  const dpr = 0.5;
  const dps = inst.eps * dpr;
  details.dps = Math.round(dps);
  details.dpr = Math.round(dpr * 100);

  if (dps > 0) {
    const dividendYield = (dps / inst.last) * 100;
    details.dividendYield = Math.round(dividendYield * 10) / 10;

    if (dividendYield > 15) { score += 10; reasons.push(`💰 بازده تقسیمی بسیار بالا (${dividendYield.toFixed(1)}٪)`); }
    else if (dividendYield > 8) { score += 6; reasons.push(`💰 بازده تقسیمی بالا (${dividendYield.toFixed(1)}٪)`); }
    else if (dividendYield > 4) { score += 3; reasons.push(`بازده تقسیمی مناسب (${dividendYield.toFixed(1)}٪)`); }
  }

  // ─── نسبت PEG ───
  // PEG = P/E / نرخ رشد سود
  // اگر PEG < 1 باشه → سهام زیرارزش‌گذاری شده
  // نرخ رشد تقریبی از ROE: Growth ≈ ROE × (1 - DPR)
  const growthRate = roe * (1 - dpr);
  details.growthRate = Math.round(growthRate * 10) / 10;

  if (growthRate > 0) {
    const peg = inst.pe / growthRate;
    details.peg = Math.round(peg * 10) / 10;

    if (peg < 0.5) { score += 12; reasons.push(`📊 PEG بسیار پایین (${peg.toFixed(1)}) — رشد بالا نسبت به P/E`); }
    else if (peg < 1) { score += 6; reasons.push(`PEG مناسب (${peg.toFixed(1)})`); }
    else if (peg > 2) { score -= 5; reasons.push(`⚠️ PEG بالا (${peg.toFixed(1)}) — رشد کم نسبت به P/E`); }
  }

  return { score, reasons, details };
}

// ═══════════════════════════════════════════════
//  ۴. ارزش‌گذاری DCF بهبودیافته
// ═══════════════════════════════════════════════

function analyzeDCF(inst: Instrument) {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  if (!inst.eps || inst.eps <= 0 || !inst.pe || inst.pe <= 0 || inst.last <= 0) {
    return { score, reasons, details };
  }

  // نرخ رشد از ROE و DPR
  const roe = (1 / inst.pe) * 100;
  const dpr = 0.5;
  const retentionRatio = 1 - dpr;
  // نرخ رشد پایدار = ROE × retention ratio (Modigliani–Miller)
  const sustainableGrowth = Math.max(0, Math.min(40, roe * retentionRatio));

  const discountRate = 0.22; // نرخ تنزیل ۲۲٪ (ریسک بازار ایران + تورم)
  const terminalGrowth = 0.06; // رشد نهایی ۶٪ (تورم ایران)
  const forecastYears = 5;

  let projectedEPS = inst.eps;
  let pvSum = 0;

  for (let year = 1; year <= forecastYears; year++) {
    // رشد کاهشی (مرحله‌ای) — رشد بالا در سال‌های اولیه
    const yearGrowth = sustainableGrowth * Math.pow(0.85, year - 1); // کاهش ۱۵٪ سالانه
    projectedEPS *= (1 + yearGrowth / 100);
    pvSum += projectedEPS / Math.pow(1 + discountRate, year);
  }

  // ارزش پایانی (Terminal Value) با مدل Gordon Growth
  const terminalValue = (projectedEPS * (1 + terminalGrowth)) / (discountRate - terminalGrowth);
  const pvTerminal = terminalValue / Math.pow(1 + discountRate, forecastYears);

  const intrinsicValue = Math.round(pvSum + pvTerminal);
  details.intrinsicValue = intrinsicValue;
  details.sustainableGrowth = Math.round(sustainableGrowth * 10) / 10;
  details.discountRate = Math.round(discountRate * 100);
  details.forecastEPS5Y = Math.round(projectedEPS);

  const upside = ((intrinsicValue - inst.last) / inst.last) * 100;
  details.upside = Math.round(upside);

  if (upside > 80) {
    score += 30;
    reasons.push(`🎯 ارزش ذاتی بسیار بالاتر از قیمت فعلی (+${upside.toFixed(0)}٪ پتانسیل) — فرصت استثنایی`);
  } else if (upside > 40) {
    score += 20;
    reasons.push(`🎯 ارزش ذاتی بالاتر (+${upside.toFixed(0)}٪ پتانسیل)`);
  } else if (upside > 15) {
    score += 10;
    reasons.push(`🎯 ارزش ذاتی بالاتر (+${upside.toFixed(0)}٪)`);
  } else if (upside > 0) {
    score += 3;
    reasons.push(`ارزش ذاتی کمی بالاتر (+${upside.toFixed(0)}٪)`);
  } else if (upside < -40) {
    score -= 20;
    reasons.push(`⚠️ قیمت فعلی بسیار بالاتر از ارزش ذاتی (${upside.toFixed(0)}٪) — حباب`);
  } else if (upside < -15) {
    score -= 10;
    reasons.push(`⚠️ قیمت فعلی بالاتر از ارزش ذاتی (${upside.toFixed(0)}٪)`);
  }

  return { score, reasons, details };
}

// ═══════════════════════════════════════════════
//  ۵. ترازنامه و نقدشوندگی
// ═══════════════════════════════════════════════

function analyzeBalanceSheet(inst: Instrument) {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  // حجم معاملات به عنوان معیار نقدشوندگی
  if (inst.volume > 0 && inst.tradeCount > 0) {
    const avgTradeValue = inst.value / inst.tradeCount;
    details.avgTradeValue = Math.round(avgTradeValue);

    if (avgTradeValue > 500000000) {
      score += 10;
      reasons.push("🏦 نقدشوندگی بسیار بالا — معاملات بزرگ حقوقی");
    } else if (avgTradeValue > 100000000) {
      score += 5;
      reasons.push("نقدشوندگی خوب");
    } else if (avgTradeValue < 10000000) {
      reasons.push("⚠️ نقدشوندگی پایین — خروج دشوار");
    }
  }

  // تعداد معاملات
  if (inst.tradeCount > 5000) {
    score += 3;
    reasons.push(`📊 تعداد بالای معاملات (${inst.tradeCount.toLocaleString("fa-IR")} معامله)`);
  }

  return { score, reasons, details };
}

// ═══════════════════════════════════════════════
//  ۶. تحلیل گزارش‌های کدال
// ═══════════════════════════════════════════════

function analyzeCodalImpact(codalReports?: CodalReport[]) {
  const reasons: string[] = [];
  let score = 0;
  const details: Record<string, string | number> = {};

  if (!codalReports || codalReports.length === 0) {
    return { score, reasons, details };
  }

  details.codalReportCount = codalReports.length;

  let totalImpact = 0;
  const reportTypes: Record<string, number> = {};

  for (const report of codalReports) {
    const impact = report.impactScore || 0;
    totalImpact += impact;
    const rt = report.reportType || "سایر";
    reportTypes[rt] = (reportTypes[rt] || 0) + 1;
  }

  const avgImpact = totalImpact / codalReports.length;
  details.avgCodalImpact = Math.round(avgImpact * 100) / 100;
  details.codalReportTypes = JSON.stringify(reportTypes) as unknown as number;

  if (avgImpact > 0.2) {
    score += 15;
    reasons.push(`📋 گزارش‌های کدال مثبت (میانگین تأثیر: +${(avgImpact * 100).toFixed(0)}٪)`);
  } else if (avgImpact > 0.05) {
    score += 8;
    reasons.push("گزارش‌های کدال کمی مثبت");
  } else if (avgImpact < -0.2) {
    score -= 15;
    reasons.push(`⚠️ گزارش‌های کدال منفی (میانگین تأثیر: ${(avgImpact * 100).toFixed(0)}٪)`);
  } else if (avgImpact < -0.05) {
    score -= 8;
    reasons.push("گزارش‌های کدال کمی منفی");
  }

  if (reportTypes["صورت مالی"]) { reasons.push(`📊 ${reportTypes["صورت مالی"]} گزارش صورت‌مالی`); }
  if (reportTypes["افزایش سرمایه"]) { score += 10; reasons.push("📈 گزارش افزایش سرمایه"); }
  if (reportTypes["مجمع عمومی"]) { reasons.push("🏛️ گزارش مجمع عمومی"); }

  return { score, reasons, details };
}

// ═══════════════════════════════════════════════
//  تابع اصلی — ترکیب تمام تحلیل‌ها
// ═══════════════════════════════════════════════

export function analyzeFundamentalFull(inst: Instrument, codalReports?: CodalReport[]): AnalysisResult {
  const allReasons: string[] = [];
  let totalScore = 0;
  const details: Record<string, string | number> = {};

  // ۱. ارزش‌گذاری (وزن: ۲۵٪)
  const valuation = analyzeValuation(inst);
  totalScore += valuation.score * 0.25;
  allReasons.push(...valuation.reasons);
  Object.assign(details, valuation.details);

  // ۲. سودآوری (وزن: ۲۰٪)
  const profitability = analyzeProfitability(inst);
  totalScore += profitability.score * 0.20;
  allReasons.push(...profitability.reasons);
  Object.assign(details, profitability.details);

  // ۳. نسبت‌های مالی (وزن: ۲۰٪)
  const ratios = analyzeFinancialRatios(inst);
  totalScore += ratios.score * 0.20;
  allReasons.push(...ratios.reasons);
  Object.assign(details, ratios.details);

  // ۴. DCF (وزن: ۱۵٪)
  const dcf = analyzeDCF(inst);
  totalScore += dcf.score * 0.15;
  allReasons.push(...dcf.reasons);
  Object.assign(details, dcf.details);

  // ۵. ترازنامه (وزن: ۱۰٪)
  const balance = analyzeBalanceSheet(inst);
  totalScore += balance.score * 0.10;
  allReasons.push(...balance.reasons);
  Object.assign(details, balance.details);

  // ۶. کدال (وزن: ۱۰٪)
  const codal = analyzeCodalImpact(codalReports);
  totalScore += codal.score * 0.10;
  allReasons.push(...codal.reasons);
  Object.assign(details, codal.details);

  // صنعت
  const sector = detectSector(inst);
  details.sector = sector;

  // صندوق‌ها
  if (inst.segment === "fund") {
    if (inst.category?.includes("طلا")) { allReasons.push("🪙 صندوق طلا — محافظ در برابر تورم"); totalScore += 3; }
    else if (inst.category?.includes("درآمد ثابت")) { allReasons.push("🏦 صندوق درآمد ثابت — ریسک پایین"); totalScore += 5; }
  }

  const clamped = clamp(Math.round(totalScore), -100, 100);
  return { signal: signalFromScore(clamped), score: clamped, reasons: allReasons, details };
}
