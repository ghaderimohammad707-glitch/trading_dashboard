/**
 * پایش لحظه‌ای قیمت‌ها
 * چک خودکار هر ۱۰ ثانیه + ارسال نوتیفیکیشن
 */

import { getCachedInstruments } from "./clientFetch";
import { sendPriceAlert, sendSignalNotification } from "./browserNotifications";

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  direction: "above" | "below";
  enabled: boolean;
  triggered: boolean;
}

let monitorInterval: ReturnType<typeof setInterval> | null = null;
const CHECK_INTERVAL = 10000; // ۱۰ ثانیه
const STORAGE_KEY = "nabz_price_alerts";

/** دریافت هشدارهای ذخیره‌شده */
function getAlerts(): PriceAlert[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

/** ذخیره هشدارها */
function saveAlerts(alerts: PriceAlert[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

/** اضافه کردن هشدار قیمت */
export function addPriceAlert(symbol: string, targetPrice: number, direction: "above" | "below"): PriceAlert {
  const alerts = getAlerts();
  const newAlert: PriceAlert = {
    id: `pa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    symbol,
    targetPrice,
    direction,
    enabled: true,
    triggered: false,
  };
  alerts.push(newAlert);
  saveAlerts(alerts);
  return newAlert;
}

/** حذف هشدار */
export function removePriceAlert(id: string): void {
  const alerts = getAlerts().filter((a) => a.id !== id);
  saveAlerts(alerts);
}

/** فعال/غیرفعال کردن */
export function togglePriceAlert(id: string): void {
  const alerts = getAlerts();
  const alert = alerts.find((a) => a.id === id);
  if (alert) {
    alert.enabled = !alert.enabled;
    saveAlerts(alerts);
  }
}

/** شروع پایش لحظه‌ای */
export function startPriceMonitor(): void {
  if (monitorInterval) return;

  console.log("[PriceMonitor] شروع پایش لحظه‌ای قیمت‌ها (هر ۱۰ ثانیه)");

  monitorInterval = setInterval(() => {
    const alerts = getAlerts().filter((a) => a.enabled && !a.triggered);
    if (alerts.length === 0) return;

    const instruments = getCachedInstruments();
    let anyTriggered = false;

    for (const alert of alerts) {
      const inst = instruments.find((i) => i.symbol === alert.symbol);
      if (!inst || inst.last <= 0) continue;

      const triggered =
        (alert.direction === "above" && inst.last >= alert.targetPrice) ||
        (alert.direction === "below" && inst.last <= alert.targetPrice);

      if (triggered) {
        alert.triggered = true;
        anyTriggered = true;

        // ارسال نوتیفیکیشن
        sendPriceAlert(alert.symbol, inst.last, alert.targetPrice, alert.direction);

        console.log(`[PriceMonitor] هشدار فعال شد: ${alert.symbol} ${alert.direction} ${alert.targetPrice} (قیمت فعلی: ${inst.last})`);
      }
    }

    if (anyTriggered) {
      saveAlerts(getAlerts());
    }
  }, CHECK_INTERVAL);
}

/** توقف پایش */
export function stopPriceMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log("[PriceMonitor] پایش متوقف شد");
  }
}

/** دریافت هشدارهای فعال */
export function getActiveAlerts(): PriceAlert[] {
  return getAlerts().filter((a) => a.enabled && !a.triggered);
}

/** دریافت هشدارهای فعال‌شده */
export function getTriggeredAlerts(): PriceAlert[] {
  return getAlerts().filter((a) => a.triggered);
}
