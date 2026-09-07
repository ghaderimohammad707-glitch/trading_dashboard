/**
 * سیستم نوتیفیکیشن مرورگر
 * درخواست دسترسی + ارسال نوتیفیکیشن
 */

let hasPermission = false;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    console.log("[Notifications] Browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    hasPermission = true;
    return true;
  }

  if (Notification.permission === "denied") {
    hasPermission = false;
    return false;
  }

  const result = await Notification.requestPermission();
  hasPermission = result === "granted";
  return hasPermission;
}

export function sendNotification(
  title: string,
  options?: {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    priority?: "low" | "medium" | "high";
  },
): void {
  if (!hasPermission && Notification.permission !== "granted") {
    console.log("[Notifications] Permission not granted");
    return;
  }

  try {
    const notification = new Notification(title, {
      body: options?.body,
      icon: options?.icon || "/logo.svg",
      tag: options?.tag,
      requireInteraction: options?.priority === "high",
    });

    // بستن خودکار بعد از ۵ ثانیه (مگر high priority)
    if (options?.priority !== "high") {
      setTimeout(() => notification.close(), 5000);
    }
  } catch (e) {
    console.error("[Notifications] Failed to send:", e);
  }
}

export function sendPriceAlert(symbol: string, currentPrice: number, targetPrice: number, direction: "above" | "below"): void {
  const emoji = direction === "above" ? "📈" : "📉";
  const text = `${symbol} به قیمت ${currentPrice.toLocaleString("fa-IR")} رسید (${direction === "above" ? "بالاتر" : "پایین‌تر"} از ${targetPrice.toLocaleString("fa-IR")})`;

  sendNotification(`${emoji} هشدار قیمت`, {
    body: text,
    tag: `price-${symbol}-${direction}`,
    requireInteraction: true,
    priority: "high",
  });
}

export function sendSignalNotification(symbol: string, signal: "buy" | "sell", strength: number): void {
  const emoji = signal === "buy" ? "🟢" : "🔴";
  const label = signal === "buy" ? "خرید" : "فروش";

  sendNotification(`${emoji} سیگنال ${label}`, {
    body: `${symbol} — سیگنال ${label} با قدرت ${strength}٪`,
    tag: `signal-${symbol}`,
  });
}

export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}
