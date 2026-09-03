/**
 * ربات تلگرام — ارسال سیگنال‌ها و هشدارها
 * از طریق Telegram Bot API
 */

import type { CompositeSignal } from "./analysisEngines";

const BOT_TOKEN_KEY = "nabz_telegram_bot_token";
const CHAT_ID_KEY = "nabz_telegram_chat_id";
const API_BASE = "https://api.telegram.org";

/** تنظیمات تلگرام */
export function getTelegramConfig(): { botToken: string; chatId: string } {
  return {
    botToken: localStorage.getItem(BOT_TOKEN_KEY) || "",
    chatId: localStorage.getItem(CHAT_ID_KEY) || "",
  };
}

/** ذخیره تنظیمات تلگرام */
export function setTelegramConfig(botToken: string, chatId: string): void {
  localStorage.setItem(BOT_TOKEN_KEY, botToken);
  localStorage.setItem(CHAT_ID_KEY, chatId);
}

/** بررسی اتصال تلگرام */
export async function testTelegramConnection(): Promise<{ success: boolean; message: string }> {
  const { botToken, chatId } = getTelegramConfig();
  if (!botToken || !chatId) {
    return { success: false, message: "توکن ربات یا Chat ID تنظیم نشده" };
  }

  try {
    const response = await fetch(`${API_BASE}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ اتصال ربات نبض بازار برقرار شد!\n\n📊 سیگنال‌ها و هشدارها از اینجا ارسال می‌شوند.",
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true, message: "اتصال موفق!" };
    } else {
      return { success: false, message: data.description || "خطا در اتصال" };
    }
  } catch (e) {
    return { success: false, message: `خطا: ${e instanceof Error ? e.message : "ناشناخته"}` };
  }
}

/** ارسال پیام */
async function sendMessage(text: string, parseMode: "HTML" | "Markdown" = "HTML"): Promise<boolean> {
  const { botToken, chatId } = getTelegramConfig();
  if (!botToken || !chatId) return false;

  try {
    const response = await fetch(`${API_BASE}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    const data = await response.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

/** ارسال سیگنال به تلگرام */
export async function sendSignalToTelegram(signal: CompositeSignal): Promise<boolean> {
  const emoji = signal.signal === "buy" ? "🟢" : "🔴";
  const label = signal.signal === "buy" ? "خرید" : "فروش";
  const strength = signal.strength;

  let text = `${emoji} <b>سیگنال ${label}</b>\n`;
  text += `━━━━━━━━━━━━━━━━\n`;
  text += `📊 <b>نماد:</b> ${signal.symbol}\n`;
  text += `📝 <b>نام:</b> ${signal.name}\n`;
  text += `💪 <b>قدرت:</b> ${strength}٪\n`;
  text += `🎯 <b>امتیاز کل:</b> ${signal.compositeScore}\n\n`;

  if (signal.entryPrice) text += `💰 <b>قیمت ورود:</b> ${signal.entryPrice.toLocaleString("fa-IR")} ریال\n`;
  if (signal.targetPrice) text += `📈 <b>هدف:</b> ${signal.targetPrice.toLocaleString("fa-IR")} ریال\n`;
  if (signal.stopLoss) text += `🛑 <b>حد ضرر:</b> ${signal.stopLoss.toLocaleString("fa-IR")} ریال\n`;
  if (signal.riskRewardRatio) text += `⚖️ <b>R/R:</b> ${signal.riskRewardRatio}:۱\n`;

  text += `\n📋 <b>motor Analysis:</b>\n`;
  text += `  📊 تکنیکال: ${signal.technical.score}\n`;
  text += `  📋 بنیادی: ${signal.fundamental.score}\n`;
  text += `  📈 حجمی: ${signal.volume.score}\n`;
  text += `  🔍 تابلوخوانی: ${signal.tablouKhani.score}\n`;
  text += `  💭 احساسات: ${signal.sentiment.score}\n`;

  if (signal.reasons.length > 0) {
    text += `\n📝 <b>دلایل:</b>\n`;
    signal.reasons.slice(0, 5).forEach((r) => {
      text += `  • ${r}\n`;
    });
  }

  text += `\n⏰ ${new Date().toLocaleString("fa-IR")}`;
  text += `\n🤖 نبض بازار — تحلیل هوشمند`;

  return sendMessage(text);
}

/** ارسال هشدار قیمت به تلگرام */
export async function sendPriceAlertToTelegram(
  symbol: string,
  currentPrice: number,
  targetPrice: number,
  direction: "above" | "below",
): Promise<boolean> {
  const emoji = direction === "above" ? "📈" : "📉";
  const label = direction === "above" ? "بالاتر از" : "پایین‌تر از";

  let text = `${emoji} <b>هشدار قیمت</b>\n`;
  text += `━━━━━━━━━━━━━━━━\n`;
  text += `📊 <b>نماد:</b> ${symbol}\n`;
  text += `💰 <b>قیمت فعلی:</b> ${currentPrice.toLocaleString("fa-IR")} ریال\n`;
  text += `🎯 <b>قیمت هدف:</b> ${targetPrice.toLocaleString("fa-IR")} ریال\n`;
  text += `📍 <b>وضعیت:</b> قیمت ${label} هدف رسید\n`;
  text += `\n⏰ ${new Date().toLocaleString("fa-IR")}`;

  return sendMessage(text);
}

/** ارسال خلاصه روزانه به تلگرام */
export async function sendDailySummaryToTelegram(summary: string): Promise<boolean> {
  // محدود کردن طول پیام تلگرام (۴۰۹۶ کاراکتر)
  const truncated = summary.length > 4000 ? summary.slice(0, 4000) + "\n\n... (ادامه در اپ)" : summary;
  return sendMessage(truncated);
}

/** ارسال گزارش عملکرد هفتگی */
export async function sendWeeklyReportToTelegram(report: string): Promise<boolean> {
  const truncated = report.length > 4000 ? report.slice(0, 4000) + "\n\n... (ادامه در اپ)" : report;
  return sendMessage(truncated);
}

/** بررسی اینکه تلگرام تنظیم شده */
export function isTelegramConfigured(): boolean {
  const { botToken, chatId } = getTelegramConfig();
  return botToken.length > 0 && chatId.length > 0;
}
