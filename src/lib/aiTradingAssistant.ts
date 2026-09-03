/**
 * AI Trading Assistant - دستیار هوشمند ترید
 * تحلیل بازار، پیشنهاد پرتفوی، و چت‌بات تحلیلی
 */

import type { Instrument } from "./clientFetch";
import type { CompositeSignal } from "./analysisEngines";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  relatedSymbol?: string;
}

export interface PortfolioSuggestion {
  symbol: string;
  allocation: number; // درصد از کل سرمایه
  reason: string;
  riskLevel: "low" | "medium" | "high";
  expectedReturn: number;
  stopLoss: number;
  takeProfit: number;
}

export interface MarketAnalysis {
  overallSentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  keyFactors: string[];
  recommendedAction: "buy" | "sell" | "hold" | "wait";
  riskWarning?: string;
}

export interface NewsSentiment {
  title: string;
  sentiment: "positive" | "negative" | "neutral";
  score: number; // -1 تا +1
  impact: "low" | "medium" | "high";
  relatedSymbols: string[];
}

/**
 * تولید پیام خوش‌آمدگویی از دستیار هوشمند
 */
export function getWelcomeMessage(): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "سلام! من دستیار هوشمند ترید شما هستم. 🤖\n\nمی‌تونم در موارد زیر کمکتون کنم:\n• تحلیل وضعیت بازار\n• پیشنهاد سبد سهام\n• بررسی سیگنال‌ها\n• تحلیل اخبار و احساسات\n• مدیریت ریسک\n\nچه کمکی از دستم برمیاد؟",
    timestamp: new Date(),
  };
}

/**
 * پردازش سوال کاربر و تولید پاسخ
 */
export function processUserQuery(
  query: string,
  instruments: Instrument[],
  signals: CompositeSignal[]
): ChatMessage {
  const lowerQuery = query.toLowerCase();
  
  // تحلیل درخواست کاربر
  if (lowerQuery.includes("بازار") || lowerQuery.includes("وضعیت")) {
    return analyzeMarket(instruments, signals);
  }
  
  if (lowerQuery.includes("پیشنهاد") || lowerQuery.includes("سبد") || lowerQuery.includes("پرتفوی")) {
    return suggestPortfolio(instruments, signals);
  }
  
  if (lowerQuery.includes("سیگنال")) {
    return analyzeSignals(signals);
  }
  
  if (lowerQuery.includes("ریسک") || lowerQuery.includes("خطر")) {
    return explainRisk();
  }
  
  if (lowerQuery.includes("خبر") || lowerQuery.includes("اخبار")) {
    return analyzeNewsSentiment();
  }
  
  // پاسخ پیش‌فرض
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "متوجه شدم. برای تحلیل دقیق‌تر، لطفاً مشخص کنید:\n• کدام نماد یا صنعت مد نظرتون هست؟\n• چه نوع تحلیلی نیاز دارید؟ (تکنیکال، فاندامنتال، تابلوخوانی)\n• افق زمانی سرمایه‌گذاری شما چقدر است؟",
    timestamp: new Date(),
  };
}

/**
 * تحلیل کلی بازار
 */
function analyzeMarket(
  instruments: Instrument[],
  signals: CompositeSignal[]
): ChatMessage {
  if (instruments.length === 0) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "⚠️ داده‌ای برای تحلیل بازار موجود نیست. لطفاً ابتدا داده‌ها را بروزرسانی کنید.",
      timestamp: new Date(),
    };
  }

  const upCount = instruments.filter(i => i.changePercent > 0).length;
  const downCount = instruments.filter(i => i.changePercent < 0).length;
  const total = instruments.length;
  const upRatio = (upCount / total) * 100;

  let sentiment: "bullish" | "bearish" | "neutral";
  let message = "";

  if (upRatio > 60) {
    sentiment = "bullish";
    message = "📈 بازار مثبت است!\n\n";
    message += `• ${upCount} نماد صعودی (${upRatio.toFixed(1)}٪)\n`;
    message += `• ${downCount} نماد نزولی\n`;
    message += "\n💡 پیشنهاد: فرصت‌های خرید مناسب وجود دارد.";
  } else if (upRatio < 40) {
    sentiment = "bearish";
    message = "📉 بازار منفی است!\n\n";
    message += `• ${upCount} نماد صعودی (${upRatio.toFixed(1)}٪)\n`;
    message += `• ${downCount} نماد نزولی\n`;
    message += "\n⚠️ هشدار: احتیاط کنید و از خریدهای هیجانی پرهیز کنید.";
  } else {
    sentiment = "neutral";
    message = "➡️ بازار خنثی است.\n\n";
    message += `• ${upCount} نماد صعودی (${upRatio.toFixed(1)}٪)\n`;
    message += `• ${downCount} نماد نزولی\n`;
    message += "\n💡 پیشنهاد: منتظر شکست جهت باشید.";
  }

  // تحلیل سیگنال‌ها
  const buySignals = signals.filter(s => s.signal === "buy").length;
  const sellSignals = signals.filter(s => s.signal === "sell").length;

  message += `\n\n📊 وضعیت سیگنال‌ها:\n`;
  message += `• سیگنال خرید: ${buySignals}\n`;
  message += `• سیگنال فروش: ${sellSignals}\n`;

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: message,
    timestamp: new Date(),
  };
}

/**
 * پیشنهاد سبد سهام
 */
function suggestPortfolio(
  instruments: Instrument[],
  signals: CompositeSignal[]
): ChatMessage {
  const buySignals = signals.filter(s => s.signal === "buy" && s.strength >= 70);
  
  if (buySignals.length === 0) {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "❌ در حال حاضر سیگنال خرید قوی برای پیشنهاد سبد وجود ندارد.\n\nمنتظر سیگنال‌های بهتر باشید یا فیلترها را تغییر دهید.",
      timestamp: new Date(),
    };
  }

  // انتخاب 5 نماد برتر
  const topSignals = buySignals
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 5);

  let message = "💼 پیشنهاد سبد سهام:\n\n";
  message += "بر اساس تحلیل فعلی، این نمادها پتانسیل خوبی دارند:\n\n";

  topSignals.forEach((signal, index) => {
    const allocation = Math.round((100 / topSignals.length) * 10) / 10;
    message += `${index + 1}. 🎯 ${signal.symbol}\n`;
    message += `   • سهم پیشنهادی: ${allocation}٪\n`;
    message += `   • اعتماد: ${signal.strength}٪\n`;
    message += `   • دلیل: ${signal.reasons?.[0] || "تحلیل تکنیکال مثبت"}\n\n`;
  });

  message += "⚠️ توجه: این پیشنهادها صرفاً تحلیلی هستند و مسئولیت معامله با شماست.";

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: message,
    timestamp: new Date(),
  };
}

/**
 * تحلیل سیگنال‌ها
 */
function analyzeSignals(signals: CompositeSignal[]): ChatMessage {
  const buyCount = signals.filter(s => s.signal === "buy").length;
  const sellCount = signals.filter(s => s.signal === "sell").length;
  const holdCount = signals.filter(s => s.signal === "hold").length;

  let message = "📡 تحلیل سیگنال‌ها:\n\n";
  message += `• سیگنال‌های خرید: ${buyCount}\n`;
  message += `• سیگنال‌های فروش: ${sellCount}\n`;
  message += `• سیگنال‌های نگهداری: ${holdCount}\n\n`;

  if (buyCount > sellCount * 2) {
    message += "🟢 جو حاکم: صعودی\nفرصت‌های خرید بیشتر از فروش است.";
  } else if (sellCount > buyCount * 2) {
    message += "🔴 جو حاکم: نزولی\nاحتیاط توصیه می‌شود.";
  } else {
    message += "🟡 جو حاکم: متعادل\nانتخاب نمادهای خاص مهم است.";
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: message,
    timestamp: new Date(),
  };
}

/**
 * توضیح درباره مدیریت ریسک
 */
function explainRisk(): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "🛡️ اصول مدیریت ریسک:\n\n" +
      "1️⃣ حد ضرر همیشه تعیین کنید (حداکثر 5-8٪)\n" +
      "2️⃣ حجم معامله را کنترل کنید (حداکثر 20٪ در یک نماد)\n" +
      "3️⃣ تنوع سبد داشته باشید (حداقل 5 نماد)\n" +
      "4️⃣ طمع نکنید - به حد سود پایبند باشید\n" +
      "5️⃣ اخبار و گزارش‌ها را دنبال کنید\n\n" +
      "💡 فرمول حجم معامله:\n" +
      "حجم = (سرمایه × ریسک مجاز) ÷ (ورود - حد ضرر)",
    timestamp: new Date(),
  };
}

/**
 * تحلیل احساسات اخبار
 */
function analyzeNewsSentiment(): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "📰 تحلیل احساسات اخبار:\n\n" +
      "در حال حاضر امکان تحلیل مستقیم اخبار وجود ندارد.\n\n" +
      "برای تحلیل اخبار پیشنهاد می‌کنم:\n" +
      "• گزارش‌های کدال را بررسی کنید\n" +
      "• اخبار اقتصادی را دنبال کنید\n" +
      "• به تغییرات حجم مشکوک توجه کنید\n\n" +
      "این ویژگی در نسخه‌های آینده بهبود خواهد یافت.",
    timestamp: new Date(),
  };
}

/**
 * محاسبه امتیاز کلی بازار
 */
export function calculateMarketScore(instruments: Instrument[]): number {
  if (instruments.length === 0) return 50;

  const upRatio = instruments.filter(i => i.changePercent > 0).length / instruments.length;
  const avgChange = instruments.reduce((sum, i) => sum + i.changePercent, 0) / instruments.length;
  
  const score = (upRatio * 50) + (Math.max(-5, Math.min(5, avgChange)) * 10) + 50;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * تولید پیشنهاد پرتفوی بهینه
 */
export function generatePortfolioSuggestions(
  instruments: Instrument[],
  signals: CompositeSignal[],
  riskTolerance: "low" | "medium" | "high" = "medium"
): PortfolioSuggestion[] {
  const buySignals = signals.filter(s => s.signal === "buy");
  
  // فیلتر بر اساس سطح ریسک
  let filteredSignals = buySignals;
  if (riskTolerance === "low") {
    filteredSignals = buySignals.filter(s => s.strength >= 80);
  } else if (riskTolerance === "high") {
    filteredSignals = buySignals.filter(s => s.strength >= 60);
  } else {
    filteredSignals = buySignals.filter(s => s.strength >= 70);
  }

  const topSignals = filteredSignals
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, 5);

  return topSignals.map(signal => ({
    symbol: signal.symbol,
    allocation: Math.round((100 / topSignals.length) * 10) / 10,
    reason: signal.reasons?.[0] || "تحلیل تکنیکال مثبت",
    riskLevel: signal.strength >= 80 ? "low" : signal.strength >= 70 ? "medium" : "high",
    expectedReturn: Math.round(signal.strength * 0.3 * 10) / 10,
    stopLoss: -5,
    takeProfit: 15,
  }));
}
