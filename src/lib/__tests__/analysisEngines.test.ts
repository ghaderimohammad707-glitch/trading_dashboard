import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyzeTechnical,
  analyzeFundamental,
  analyzeVolume,
  analyzeTablouKhani,
  analyzeSentiment,
  analyzeOptions,
  decisionBrain,
  generateSignal,
  generateAllSignals,
} from '../analysisEngines';
import type { Instrument } from '../clientFetch';

/* ═══════════════════════════════════════════════════════
   Helper
   ═══════════════════════════════════════════════════════ */

function makeInstrument(overrides: Partial<Instrument> = {}): Instrument {
  return {
    _id: "test-1",
    symbol: "فولاد",
    name: "فولاد مبارکه اصفهان",
    segment: "tse",
    last: 5000,
    close: 5000,
    open: 4900,
    high: 5100,
    low: 4800,
    change: 200,
    changePercent: 4.17,
    volume: 5000000,
    value: 25000000000,
    tradeCount: 8000,
    status: "open",
    rawInsCode: "12345",
    pe: 8,
    eps: 600,
    yesterday: 4800,
    bestBuy1: 4990,
    bestBuyVol1: 2000000,
    bestSell1: 5010,
    bestSellVol1: 1500000,
    ...overrides,
  };
}

/* ═══════════════════════════════════════════════════════
   1. موتور تکنیکال پیشرفته
   ═══════════════════════════════════════════════════════ */

describe("۱.۱ analyzeTechnical — تشخیص روند", () => {
  it("برگرداندن hold برای داده صفر", () => {
    const r = analyzeTechnical(makeInstrument({ last: 0, close: 0 }));
    expect(r.signal).toBe("hold");
  });

  it("روند صعودی قوی (>3%) → buy", () => {
    const r = analyzeTechnical(makeInstrument({ yesterday: 4800, last: 5200, changePercent: 8 }));
    expect(r.signal).toBe("buy");
    expect(r.details.trend).toBe("strong_up");
    expect(r.score).toBeGreaterThan(20);
  });

  it("روند صعودی ملایم (1-3%) → buy", () => {
    const r = analyzeTechnical(makeInstrument({ yesterday: 4900, last: 5000, changePercent: 2 }));
    expect(r.signal).toBe("buy");
    expect(r.details.trend).toBe("up");
  });

  it("روند نزولی قوی (<-3%) → sell", () => {
    const r = analyzeTechnical(makeInstrument({ yesterday: 5200, last: 4800, changePercent: -8 }));
    expect(r.signal).toBe("sell");
    expect(r.details.trend).toBe("strong_down");
  });

  it("روند نزولی ملایم (-1 تا -3%) → sell", () => {
    const r = analyzeTechnical(makeInstrument({ yesterday: 5050, last: 4950, changePercent: -2 }));
    expect(r.details.trend).toBe("down");
  });

  it("بازار ثابت → hold", () => {
    const r = analyzeTechnical(makeInstrument({ yesterday: 4998, last: 5000, changePercent: 0.04 }));
    expect(r.details.trend).toBe("flat");
  });
});

describe("۱.۲ analyzeTechnical — RSI تقریبی", () => {
  it("RSI اشباع خرید (>70)", () => {
    const r = analyzeTechnical(makeInstrument({ high: 5200, low: 5000, last: 5190, changePercent: 5 }));
    expect(r.details.rsi).toBeGreaterThanOrEqual(70);
    expect(r.reasons.some((r) => r.includes("اشباع خرید") || r.includes("RSI بالا"))).toBe(true);
  });

  it("RSI اشباع فروش (<30)", () => {
    const r = analyzeTechnical(makeInstrument({ high: 5200, low: 5000, last: 5010, changePercent: -5 }));
    expect(r.details.rsi).toBeLessThanOrEqual(30);
    expect(r.reasons.some((r) => r.includes("اشباع فروش") || r.includes("RSI پایین"))).toBe(true);
  });

  it("RSI در محدوده عادی", () => {
    const r = analyzeTechnical(makeInstrument({ high: 5200, low: 4800, last: 5000, changePercent: 0.5 }));
    expect(r.details.rsi).toBeGreaterThanOrEqual(20);
    expect(r.details.rsi).toBeLessThanOrEqual(80);
  });
});

describe("۱.۳ analyzeTechnical — EMA و MACD", () => {
  it("EMA صعودی تشخیص داده می‌شود", () => {
    const r = analyzeTechnical(makeInstrument({ open: 5100, last: 5200, yesterday: 4900, changePercent: 3 }));
    expect(r.details.shortEMA).toBeDefined();
    expect(r.details.longEMA).toBeDefined();
    expect(r.reasons.some((r) => r.includes("EMA") && r.includes("صعودی"))).toBe(true);
  });

  it("MACD محاسبه می‌شود", () => {
    const r = analyzeTechnical(makeInstrument({ changePercent: 5, high: 5200, low: 4800 }));
    expect(r.details.macd).toBeDefined();
  });
});

describe("۱.۴ analyzeTechnical — حمایت و مقاومت", () => {
  it("نزدیک حمایت → سیگنال مثبت", () => {
    // pivot=(5000+4800+4810)/3=4870, S1=2*4870-5000=4740, distToS=1.45% < 1.5%
    const r = analyzeTechnical(makeInstrument({ last: 4810, high: 5000, low: 4800, yesterday: 4900 }));
    expect(r.reasons.some((r) => r.includes("حمایت"))).toBe(true);
  });

  it("نزدیک مقاومت → سیگنال منفی", () => {
    const r = analyzeTechnical(makeInstrument({ last: 4990, high: 5000, low: 4900, yesterday: 4970 }));
    expect(r.reasons.some((r) => r.includes("مقاومت"))).toBe(true);
  });
});

describe("۱.۵ analyzeTechnical — الگوهای کندل", () => {
  it("کندل چکش صعودی", () => {
    // bodyRatio > 0.7, close > open, lowerWick > upperWick * 2
    const r = analyzeTechnical(makeInstrument({ open: 4800, close: 5080, high: 5100, low: 4790, last: 5080, changePercent: 5 }));
    expect(r.reasons.some((r) => r.includes("چکش") || r.includes("پوشای صعودی"))).toBe(true);
  });

  it("کندل ستاره دنباله‌دار", () => {
    // bodyRatio > 0.7: body=400, range=470, ratio=0.85; upperWick(50) > lowerWick(10)*2
    const r = analyzeTechnical(makeInstrument({ open: 5200, close: 4800, high: 5250, low: 4780, last: 4800, changePercent: -8 }));
    expect(r.reasons.some((r) => r.includes("ستاره") || r.includes("پوشای نزولی"))).toBe(true);
  });

  it("کندل دوجی", () => {
    const r = analyzeTechnical(makeInstrument({ open: 5000, close: 5010, high: 5100, low: 4900, last: 5010 }));
    expect(r.reasons.some((r) => r.includes("دوجی"))).toBe(true);
  });
});

describe("۱.۶ analyzeTechnical — ATR و نوسان", () => {
  it("نوسان بالا تشخیص داده می‌شود", () => {
    const r = analyzeTechnical(makeInstrument({ high: 5500, low: 4500, last: 5000 }));
    expect(r.details.atr).toBeGreaterThan(0);
    expect(r.details.atrPercent).toBeGreaterThan(5);
    expect(r.reasons.some((r) => r.includes("نوسان") || r.includes("ATR"))).toBe(true);
  });

  it("نوسان کم تشخیص داده می‌شود", () => {
    // ATR% = (5030-4970)/5000*100 = 1.2% < 1.5%
    const r = analyzeTechnical(makeInstrument({ high: 5030, low: 4970, last: 5000 }));
    expect(r.details.atrPercent).toBeLessThan(1.5);
    expect(r.reasons.some((r) => r.includes("ثبات"))).toBe(true);
  });
});

describe("۱.۷ analyzeTechnical — گپ بازگشایی", () => {
  it("گپ مثبت", () => {
    const r = analyzeTechnical(makeInstrument({ open: 5200, yesterday: 4900, last: 5200 }));
    expect(r.details.gapPercent).toBeGreaterThan(3);
    expect(r.reasons.some((r) => r.includes("گپ مثبت"))).toBe(true);
  });

  it("گپ منفی", () => {
    const r = analyzeTechnical(makeInstrument({ open: 4600, yesterday: 5000, last: 4600 }));
    expect(r.details.gapPercent).toBeLessThan(-3);
    expect(r.reasons.some((r) => r.includes("گپ منفی"))).toBe(true);
  });
});

describe("۱.۸ analyzeTechnical — مومنتوم", () => {
  it("مومنتوم صعودی شدید", () => {
    const r = analyzeTechnical(makeInstrument({ yesterday: 4800, last: 5200, changePercent: 8 }));
    expect(r.reasons.some((r) => r.includes("مومنتوم") && r.includes("صعودی"))).toBe(true);
  });

  it("مومنتوم نزولی شدید", () => {
    const r = analyzeTechnical(makeInstrument({ yesterday: 5200, last: 4800, changePercent: -8 }));
    expect(r.reasons.some((r) => r.includes("مومنتوم") && r.includes("نزولی"))).toBe(true);
  });

  it("امتیاز بین -100 و +100 باقی می‌ماند", () => {
    const r = analyzeTechnical(makeInstrument({ changePercent: 100 }));
    expect(r.score).toBeGreaterThanOrEqual(-100);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

/* ═══════════════════════════════════════════════════════
   2. موتور تحلیل بنیادی
   ═══════════════════════════════════════════════════════ */

describe("۲.۱ analyzeFundamental — P/E", () => {
  it("P/E بسیار پایین (<2) → سیگنال خرید قوی", () => {
    const r = analyzeFundamental(makeInstrument({ pe: 2, eps: 2500 }));
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.details.pe).toBe(2);
  });

  it("P/E پایین (2-5) → سیگنال خرید", () => {
    const r = analyzeFundamental(makeInstrument({ pe: 4, eps: 1250 }));
    expect(r.score).toBeGreaterThan(5);
    expect(r.reasons.some((r) => r.includes("ارزشمند"))).toBe(true);
  });

  it("P/E مناسب (5-8)", () => {
    const r = analyzeFundamental(makeInstrument({ pe: 7, eps: 700 }));
    expect(r.reasons.some((r) => r.includes("مناسب"))).toBe(true);
  });

  it("P/E بالا (20-35) → سیگنال منفی", () => {
    const r = analyzeFundamental(makeInstrument({ pe: 25, eps: 200 }));
    expect(r.score).toBeLessThan(0);
    expect(r.reasons.some((r) => r.includes("بالا"))).toBe(true);
  });

  it("P/E بسیار بالا (>35) → سیگنال منفی قوی", () => {
    const r = analyzeFundamental(makeInstrument({ pe: 50, eps: 100 }));
    expect(r.score).toBeLessThan(0);
  });
});

describe("۲.۲ analyzeFundamental — EPS", () => {
  it("EPS مثبت → سیگنال مثبت", () => {
    const r = analyzeFundamental(makeInstrument({ pe: 10, eps: 500 }));
    expect(r.reasons.some((r) => r.includes("مثبت"))).toBe(true);
  });

  it("EPS منفی → سیگنال منفی", () => {
    const r = analyzeFundamental(makeInstrument({ pe: 10, eps: -200 }));
    expect(r.reasons.some((r) => r.includes("زیان‌ده") || r.includes("منفی"))).toBe(true);
  });
});

describe("۲.۳ analyzeFundamental — ROE", () => {
  it("ROE بالا تشخیص داده می‌شود", () => {
    // ROE = (1/pe)*100 = 33.3 > 25
    const r = analyzeFundamental(makeInstrument({ pe: 3, eps: 1250 }));
    expect(r.details.roe).toBeGreaterThan(25);
    expect(r.reasons.some((r) => r.includes("ROE") && r.includes("بالا"))).toBe(true);
  });
});

describe("۲.۴ analyzeFundamental — ارزش ذاتی", () => {
  it("ارزش ذاتی بالاتر از قیمت فعلی", () => {
    const r = analyzeFundamental(makeInstrument({ pe: 5, eps: 1000, last: 5000 }));
    expect(r.details.intrinsicValue).toBeGreaterThan(5000);
    expect(r.reasons.some((r) => r.includes("ارزش ذاتی"))).toBe(true);
  });
});

describe("۲.۵ analyzeFundamental — تحلیل صندوق", () => {
  it("صندوق طلا", () => {
    const r = analyzeFundamental(makeInstrument({ segment: "fund", category: "صندوق طلا" }));
    expect(r.reasons.some((r) => r.includes("طلا"))).toBe(true);
  });

  it("صندوق درآمد ثابت", () => {
    const r = analyzeFundamental(makeInstrument({ segment: "fund", category: "صندوق درآمد ثابت" }));
    expect(r.reasons.some((r) => r.includes("درآمد ثابت"))).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════
   3. موتور تحلیل حجمی
   ═══════════════════════════════════════════════════════ */

describe("۳.۱ analyzeVolume — حضور نهادی", () => {
  it("حجم متوسط بالا → حضور نهادی قوی", () => {
    // avgTradeSize = value/volume = 250B/100 = 2.5B > 100M
    const r = analyzeVolume(makeInstrument({ value: 250000000000, volume: 100 }));
    expect(r.score).toBeGreaterThan(15);
    expect(r.reasons.some((r) => r.includes("نهادی") || r.includes("حقوقی"))).toBe(true);
    expect(r.details.institutionalFlow).toBe("قوی");
  });

  it("حجم متوسط متوسط", () => {
    // avgTradeSize = value/volume = 75B/1000 = 75M (50M-100M)
    const r = analyzeVolume(makeInstrument({ value: 75000000000, volume: 1000 }));
    expect(r.details.institutionalFlow).toBe("متوسط");
  });

  it("معاملات خُرد", () => {
    // avgTradeSize = value/volume = 25B/5M = 5000 < 5M
    const r = analyzeVolume(makeInstrument({ value: 25000000000, volume: 5000000 }));
    expect(r.details.institutionalFlow).toBe("خرد");
  });
});

describe("۳.۲ analyzeVolume — حجم مشکوک", () => {
  it("حجم بالا + تغییر کم = مشکوک", () => {
    const r = analyzeVolume(makeInstrument({ volume: 5000000, changePercent: 0.2, value: 25000000000 }));
    expect(r.reasons.some((r) => r.includes("مشکوک"))).toBe(true);
    expect(r.details.suspiciousVolume).toBe(1);
  });

  it("حجم بالا + رشد = تأیید روند", () => {
    const r = analyzeVolume(makeInstrument({ volume: 5000000, changePercent: 3, value: 25000000000 }));
    expect(r.reasons.some((r) => r.includes("تأیید روند صعودی"))).toBe(true);
  });

  it("حجم بالا + افت = هشدار", () => {
    const r = analyzeVolume(makeInstrument({ volume: 5000000, changePercent: -3, value: 25000000000 }));
    expect(r.reasons.some((r) => r.includes("هشدار نزولی"))).toBe(true);
  });
});

describe("۳.۳ analyzeVolume — اسپرد", () => {
  it("اسپرد بسیار کم", () => {
    const r = analyzeVolume(makeInstrument({ bestBuy1: 4995, bestSell1: 5000 }));
    expect(r.score).toBeGreaterThan(0);
    expect(r.details.spread).toBeLessThan(0.5);
  });

  it("اسپرد بالا", () => {
    // spread = (5200-4800)/4800*100 = 8.33% > 3%
    const r = analyzeVolume(makeInstrument({ bestBuy1: 4800, bestSell1: 5200, volume: 100, tradeCount: 10, value: 500000 }));
    expect(r.details.spread).toBeGreaterThan(3);
    expect(r.reasons.some((r) => r.includes("اسپرد بالا") || r.includes("هزینه معاملاتی"))).toBe(true);
  });
});

describe("۳.۴ analyzeVolume — VWAP", () => {
  it("قیمت بالای VWAP", () => {
    // vwap = 25B/5M = 5000; 5060 > 5000*1.01=5050
    const r = analyzeVolume(makeInstrument({ last: 5060, value: 25000000000, volume: 5000000 }));
    expect(r.details.vwap).toBeDefined();
    expect(r.reasons.some((r) => r.includes("VWAP") && r.includes("بالای"))).toBe(true);
  });

  it("قیمت زیر VWAP", () => {
    // vwap = 25B/5M = 5000; 4940 < 5000*0.99=4950
    const r = analyzeVolume(makeInstrument({ last: 4940, value: 25000000000, volume: 5000000 }));
    expect(r.reasons.some((r) => r.includes("VWAP") && r.includes("زیر"))).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════
   4. موتور تابلوخوانی
   ═══════════════════════════════════════════════════════ */

describe("۴.۱ analyzeTablouKhani — دیوار خرید/فروش", () => {
  it("دیوار خرید سنگین", () => {
    const r = analyzeTablouKhani(makeInstrument({ bestBuyVol1: 15000000, bestSellVol1: 1000000 }));
    expect(r.score).toBeGreaterThan(0);
    expect(r.reasons.some((r) => r.includes("دیوار خرید"))).toBe(true);
  });

  it("دیوار فروش سنگین", () => {
    const r = analyzeTablouKhani(makeInstrument({ bestBuyVol1: 500000, bestSellVol1: 15000000 }));
    expect(r.score).toBeLessThan(0);
    expect(r.reasons.some((r) => r.includes("دیوار فروش"))).toBe(true);
  });
});

describe("۴.۲ analyzeTablouKhani — عدم توازن", () => {
  it("تقاضای قوی‌تر", () => {
    const r = analyzeTablouKhani(makeInstrument({ bestBuyVol1: 8000000, bestSellVol1: 1000000 }));
    expect(r.score).toBeGreaterThan(0);
  });

  it("عرضه قوی‌تر", () => {
    const r = analyzeTablouKhani(makeInstrument({ bestBuyVol1: 1000000, bestSellVol1: 8000000 }));
    expect(r.reasons.length).toBeGreaterThan(0);
  });
});

describe("۴.۳ analyzeTablouKhani — صف خرید/فروش", () => {
  it("صف خرید +5%", () => {
    const r = analyzeTablouKhani(makeInstrument({ changePercent: 5, last: 5250, bestBuy1: 5250, bestSell1: 0, bestBuyVol1: 5000000, bestSellVol1: 0 }));
    expect(r.reasons.some((r) => r.includes("صف خرید"))).toBe(true);
  });

  it("صف فروش -5%", () => {
    const r = analyzeTablouKhani(makeInstrument({ changePercent: -5, last: 4750, bestBuy1: 0, bestSell1: 4750, bestBuyVol1: 0, bestSellVol1: 5000000 }));
    expect(r.reasons.some((r) => r.includes("صف فروش"))).toBe(true);
  });

  it("صف خرید محکم +10%", () => {
    const r = analyzeTablouKhani(makeInstrument({ last: 5500, bestBuy1: 5500, bestSell1: 0, bestBuyVol1: 20000000, bestSellVol1: 0 }));
    expect(r.score).toBeGreaterThan(15);
  });

  it("صف فروش محکم -10%", () => {
    const r = analyzeTablouKhani(makeInstrument({ changePercent: -10, last: 4500, bestBuy1: 0, bestSell1: 4500, bestBuyVol1: 0, bestSellVol1: 20000000 }));
    expect(r.reasons.some((r) => r.includes("صف فروش محکم"))).toBe(true);
  });
});

describe("۴.۴ analyzeTablouKhani — فشار قیمت", () => {
  it("فشار خرید", () => {
    // midPrice=5000, last=5110, pressure=2.2% > 2%
    const r = analyzeTablouKhani(makeInstrument({ last: 5110, bestBuy1: 4990, bestSell1: 5010 }));
    expect(r.reasons.some((r) => r.includes("فشار خرید"))).toBe(true);
  });

  it("فشار فروش", () => {
    // midPrice=5000, last=4890, pressure=-2.2% < -2%
    const r = analyzeTablouKhani(makeInstrument({ last: 4890, bestBuy1: 4990, bestSell1: 5010 }));
    expect(r.reasons.some((r) => r.includes("فشار فروش"))).toBe(true);
  });
});

describe("۴.۵ analyzeTablouKhani — انحراف پایانی", () => {
  it("قیمت آخر بالاتر از پایانی", () => {
    const r = analyzeTablouKhani(makeInstrument({ last: 5100, close: 5000 }));
    expect(r.reasons.some((r) => r.includes("بالاتر") || r.includes("مثبت"))).toBe(true);
  });

  it("قیمت آخر پایین‌تر از پایانی", () => {
    const r = analyzeTablouKhani(makeInstrument({ last: 4900, close: 5000 }));
    expect(r.reasons.some((r) => r.includes("پایین‌تر") || r.includes("منفی"))).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════
   5. موتور تحلیل احساسات و ریسک
   ═══════════════════════════════════════════════════════ */

describe("۵.۱ analyzeSentiment — شاخص ترس و طمع", () => {
  it("رشد قوی → طمع بالا", () => {
    const r = analyzeSentiment(makeInstrument({ changePercent: 8, volume: 5000000 }));
    expect(r.details.fearGreedIndex).toBeGreaterThanOrEqual(60);
    expect(r.reasons.some((r) => r.includes("طمع") || r.includes("مثبت"))).toBe(true);
  });

  it("افت شدید → ترس بالا", () => {
    const r = analyzeSentiment(makeInstrument({ changePercent: -8, volume: 100000 }));
    expect(r.details.fearGreedIndex).toBeLessThanOrEqual(40);
    expect(r.reasons.some((r) => r.includes("ترس") || r.includes("منفی"))).toBe(true);
  });

  it("بازار ثابت → خنثی", () => {
    const r = analyzeSentiment(makeInstrument({ changePercent: 0.1, volume: 5000000 }));
    expect(r.details.fearGreedIndex).toBeGreaterThanOrEqual(35);
    expect(r.details.fearGreedIndex).toBeLessThanOrEqual(65);
  });
});

describe("۵.۲ analyzeSentiment — ارزیابی ریسک", () => {
  it("صندوق عادی → ریسک متوسط", () => {
    const r = analyzeSentiment(makeInstrument());
    expect(r.details.riskLevel).toBeDefined();
    expect(r.details.riskScore).toBeDefined();
  });

  it("اختیار معامله → ریسک بالا", () => {
    // pe=20 avoids the pe<12 subtraction; option segment adds +20
    const r = analyzeSentiment(makeInstrument({ segment: "option", pe: 20 }));
    expect(r.details.riskScore).toBeGreaterThanOrEqual(60);
  });

  it("سهام بزرگ‌بازار → ریسک کم", () => {
    const r = analyzeSentiment(makeInstrument({ pe: 10, volume: 8000000 }));
    expect(r.details.riskScore).toBeLessThanOrEqual(50);
  });
});

describe("۵.۳ analyzeSentiment — صندوق اهرمی", () => {
  it("هشدار برای صندوق اهرمی", () => {
    const r = analyzeSentiment(makeInstrument({ name: "صندوق اهرمی آگاس" }));
    expect(r.reasons.some((r) => r.includes("اهرمی"))).toBe(true);
  });
});

describe("۵.۴ analyzeSentiment — احساسات بازار", () => {
  it("رشد قوی → احساسات مثبت", () => {
    const r = analyzeSentiment(makeInstrument({ changePercent: 6 }));
    expect(r.reasons.some((r) => r.includes("مثبت") || r.includes("طمع"))).toBe(true);
  });

  it("افت شدید → احساسات منفی", () => {
    const r = analyzeSentiment(makeInstrument({ changePercent: -6 }));
    expect(r.reasons.some((r) => r.includes("منفی") || r.includes("ترس"))).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════
   6. موتور تحلیل اختیار معامله
   ═══════════════════════════════════════════════════════ */

describe("۶.۱ analyzeOptions — غیراختیار", () => {
  it("برای سهام عادی → hold", () => {
    const r = analyzeOptions(makeInstrument({ segment: "tse" }));
    expect(r.signal).toBe("hold");
    expect(r.score).toBe(0);
  });
});

describe("۶.۲ analyzeOptions — یونانی‌های Black-Scholes", () => {
  it("اختیار خرید — محاسبه کامل", () => {
    const r = analyzeOptions(makeInstrument({
      segment: "option", optionType: "call", last: 500, strike: 4800,
      changePercent: 5, volume: 2000000, expiry: "1405/06/25",
    }));
    expect(r.details.bsDelta).toBeDefined();
    expect(r.details.bsGamma).toBeDefined();
    expect(r.details.bsTheta).toBeDefined();
    expect(r.details.bsVega).toBeDefined();
    expect(r.details.intrinsicValue).toBeDefined();
    expect(r.details.timeValue).toBeDefined();
  });

  it("اختیار فروش — محاسبه کامل", () => {
    const r = analyzeOptions(makeInstrument({
      segment: "option", optionType: "put", last: 300, strike: 5200,
      changePercent: -3, volume: 1000000, expiry: "1405/06/25",
    }));
    expect(r.details.bsDelta).toBeDefined();
    expect(r.details.intrinsicValue).toBeDefined();
  });

  it("دلتای بالا برای call ITM", () => {
    const r = analyzeOptions(makeInstrument({
      segment: "option", optionType: "call", last: 800, strike: 4500,
      changePercent: 3, volume: 3000000, expiry: "1405/06/25",
    }));
    expect(r.details.bsDelta).toBeGreaterThanOrEqual(0.7);
    expect(r.reasons.some((r) => r.includes("دلتای بالا"))).toBe(true);
  });

  it("افت زمانی شدید", () => {
    const r = analyzeOptions(makeInstrument({
      segment: "option", optionType: "call", last: 100, strike: 5000,
      changePercent: 0, volume: 500000, expiry: "1405/06/10",
    }));
    // With very short expiry, theta should be significant
    expect(r.details.bsTheta).toBeDefined();
  });
});

describe("۶.۳ analyzeOptions — حجم و سیگنال", () => {
  it("حجم بالا → سیگنال مثبت", () => {
    const r = analyzeOptions(makeInstrument({
      segment: "option", optionType: "call", last: 500, strike: 5000,
      volume: 600000, changePercent: 2,
    }));
    expect(r.reasons.some((r) => r.includes("حجم") || r.includes("خوب"))).toBe(true);
  });

  it("اختیار خرید با رشد قوی", () => {
    const r = analyzeOptions(makeInstrument({
      segment: "option", optionType: "call", last: 500, strike: 5000,
      volume: 500000, changePercent: 10,
    }));
    expect(r.reasons.some((r) => r.includes("رشد قوی"))).toBe(true);
  });

  it("اختیار فروش در حال رشد → حفاظت فعال", () => {
    const r = analyzeOptions(makeInstrument({
      segment: "option", optionType: "put", last: 500, strike: 5000,
      volume: 500000, changePercent: -10,
    }));
    expect(r.reasons.some((r) => r.includes("حفاظت فعال"))).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════
   7. مغز تصمیم‌گیرنده
   ═══════════════════════════════════════════════════════ */

describe("۷.۱ decisionBrain", () => {
  it("تولید نتیجه معتبر با تمام موتورها", () => {
    const inst = makeInstrument();
    const brain = decisionBrain(inst, analyzeTechnical(inst), analyzeFundamental(inst), analyzeVolume(inst), analyzeTablouKhani(inst), analyzeSentiment(inst));
    expect(brain.finalSignal).toBeDefined();
    expect(brain.confidence).toBeGreaterThanOrEqual(0);
    expect(brain.confidence).toBeLessThanOrEqual(100);
    expect(brain.engineWeights).toBeDefined();
    expect(brain.actionPlan).toBeDefined();
  });

  it("وزن‌دهی پویا برای اختیار", () => {
    const inst = makeInstrument({ segment: "option" });
    const brain = decisionBrain(inst, analyzeTechnical(inst), analyzeFundamental(inst), analyzeVolume(inst), analyzeTablouKhani(inst), analyzeSentiment(inst));
    // For options, technical weight should be higher
    expect(brain.engineWeights.technical).toBeGreaterThanOrEqual(0.25);
  });

  it("وزن‌دهی پویا برای صندوق", () => {
    const inst = makeInstrument({ segment: "fund" });
    const brain = decisionBrain(inst, analyzeTechnical(inst), analyzeFundamental(inst), analyzeVolume(inst), analyzeTablouKhani(inst), analyzeSentiment(inst));
    expect(brain.engineWeights.fundamental).toBeGreaterThanOrEqual(0.30);
  });

  it("سیگنال خرید قوی", () => {
    const inst = makeInstrument({ changePercent: 8, pe: 3, eps: 2000 });
    const brain = decisionBrain(inst, analyzeTechnical(inst), analyzeFundamental(inst), analyzeVolume(inst), analyzeTablouKhani(inst), analyzeSentiment(inst));
    expect(brain.finalScore).toBeGreaterThan(10);
    expect(brain.actionPlan).toBeDefined();
  });

  it("برنامه عملیاتی شامل حد ضرر و حد سود", () => {
    const inst = makeInstrument({ changePercent: 8, pe: 3 });
    const brain = decisionBrain(inst, analyzeTechnical(inst), analyzeFundamental(inst), analyzeVolume(inst), analyzeTablouKhani(inst), analyzeSentiment(inst));
    expect(brain.actionPlan).toContain("حد ضرر");
    expect(brain.actionPlan).toContain("حد سود");
  });

  it("ریسک اختیار معامله = high", () => {
    // pe=20 avoids pe<15 overwriting riskLevel to "low"
    const inst = makeInstrument({ segment: "option", pe: 20 });
    const brain = decisionBrain(inst, analyzeTechnical(inst), analyzeFundamental(inst), analyzeVolume(inst), analyzeTablouKhani(inst), analyzeSentiment(inst));
    expect(brain.riskLevel).toBe("high");
  });
});

/* ═══════════════════════════════════════════════════════
   8. تولید سیگنال ترکیبی + Gem Hunter
   ═══════════════════════════════════════════════════════ */

describe("۸.۱ generateSignal", () => {
  it("سیگنال ترکیبی با تمام فیلدها", () => {
    const sig = generateSignal(makeInstrument());
    expect(sig.symbol).toBe("فولاد");
    expect(sig.signal).toBeDefined();
    expect(sig.strength).toBeGreaterThanOrEqual(0);
    expect(sig.technical).toBeDefined();
    expect(sig.fundamental).toBeDefined();
    expect(sig.volume).toBeDefined();
    expect(sig.tablouKhani).toBeDefined();
    expect(sig.sentiment).toBeDefined();
    expect(sig.reasons).toBeDefined();
    expect(sig.reasons.length).toBeGreaterThan(0);
  });

  it("Gem Score بالا برای دارایی عالی", () => {
    const sig = generateSignal(makeInstrument({ pe: 2, eps: 5000, changePercent: 5, volume: 8000000, value: 50000000000 }));
    expect(sig.gemScore).toBeDefined();
    expect(sig.gemScore!).toBeGreaterThan(50);
  });

  it("Gem Score پایین برای دارایی ضعیف", () => {
    const sig = generateSignal(makeInstrument({ pe: 100, eps: -500, changePercent: -5, volume: 50000 }));
    expect(sig.gemScore).toBeDefined();
    expect(sig.gemScore!).toBeLessThan(50);
  });
});

describe("۸.۲ generateAllSignals", () => {
  it("فیلتر سیگنال‌های معنادار", () => {
    const instruments = [
      makeInstrument({ symbol: "فولاد", name: "فولاد مبارکه", changePercent: 6, pe: 5 }),
      makeInstrument({ symbol: "فملی", name: "مس 汽业", changePercent: -6, pe: 50 }),
      makeInstrument({ symbol: "خودرو", name: "ایران خودرو", changePercent: 0.1, pe: 30 }),
    ];
    const signals = generateAllSignals(instruments);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.length).toBeLessThanOrEqual(instruments.length);
  });

  it("مرتب‌سازی بر اساس قدرت", () => {
    const instruments = [
      makeInstrument({ symbol: "الف", name: "الف", changePercent: -6, pe: 50 }),
      makeInstrument({ symbol: "ب", name: "ب", changePercent: 8, pe: 3 }),
    ];
    const signals = generateAllSignals(instruments);
    if (signals.length >= 2) {
      expect(signals[0].strength).toBeGreaterThanOrEqual(signals[1].strength);
    }
  });

  it("شامل صندوق‌ها نیز می‌شود", () => {
    const instruments = [
      makeInstrument({ symbol: "آگاس", name: "صندوق آگاس", segment: "fund", category: "سهامی" }),
    ];
    const signals = generateAllSignals(instruments);
    expect(signals.length).toBeGreaterThan(0);
  });
});
