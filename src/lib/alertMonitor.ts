/**
 * Alert Monitoring Engine - موتور پایش و ارسال هشدارها
 * پایش لحظه‌ای هشدارها و ارسال از طریق کانال‌های مختلف
 */

import { sendNotification, sendPriceAlert, sendSignalNotification } from "./browserNotifications";
import type { Alert } from "@/components/market/AlertsTab";

// ─── Types ───
export interface AlertTrigger {
  alertId: string;
  symbol: string;
  triggeredAt: number;
  channel: string;
  message: string;
  currentPrice: number;
  targetValue: number;
}

export interface NotificationChannel {
  id: string;
  name: string;
  enabled: boolean;
  config?: any;
}

// ─── Channel Configurations ───
const channels: NotificationChannel[] = [
  { id: "alarm", name: "آلارم مرورگر", enabled: true },
  { id: "email", name: "ایمیل", enabled: false, config: { endpoint: "/api/email" } },
  { id: "telegram", name: "تلگرام", enabled: false, config: { botToken: "", chatId: "" } },
  { id: "sms", name: "پیامک", enabled: false, config: { endpoint: "/api/sms" } },
];

// ─── Triggered Alerts History ───
const triggeredHistory: AlertTrigger[] = [];
const MAX_HISTORY = 100;

// ─── Alert Monitor State ───
let isMonitoring = false;
let monitorInterval: NodeJS.Timeout | null = null;
let lastCheckTime = 0;

// ─── Helper Functions ───
function formatPrice(price: number): string {
  return price.toLocaleString("fa-IR");
}

function getTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days} روز پیش`;
}

// ─── Channel Send Functions ───
async function sendViaChannel(
  channel: string,
  alert: Alert,
  currentPrice: number,
): Promise<boolean> {
  try {
    switch (channel) {
      case "alarm":
        // Browser notification
        const direction = alert.alertType.includes("above") || alert.alertType === "price_above" ? "above" : "below";
        sendPriceAlert(alert.symbol, currentPrice, alert.targetValue, direction);
        return true;

      case "email":
        // Email notification (requires backend)
        console.log(`[Alert] Email notification for ${alert.symbol}:`, {
          subject: `هشدار ${alert.symbol}`,
          body: `نماد ${alert.symbol} به شرط هشدار رسید.\nقیمت فعلی: ${formatPrice(currentPrice)}\nهدف: ${formatPrice(alert.targetValue)}\nزمان: ${new Date().toLocaleTimeString("fa-IR")}`,
        });
        // TODO: Implement actual email sending via backend API
        // await fetch('/api/email', { method: 'POST', body: JSON.stringify({...}) });
        return false; // Not implemented yet

      case "telegram":
        // Telegram notification (requires backend)
        console.log(`[Alert] Telegram notification for ${alert.symbol}:`, {
          text: `🔔 هشدار جدید\n\n📊 نماد: ${alert.symbol}\n💰 قیمت فعلی: ${formatPrice(currentPrice)}\n🎯 هدف: ${formatPrice(alert.targetValue)}\n⏰ زمان: ${new Date().toLocaleTimeString("fa-IR")}`,
        });
        // TODO: Implement actual Telegram sending via backend API
        // await fetch('/api/telegram', { method: 'POST', body: JSON.stringify({...}) });
        return false; // Not implemented yet

      case "sms":
        // SMS notification (requires backend)
        console.log(`[Alert] SMS notification for ${alert.symbol}:`, {
          message: `هشدار ${alert.symbol}: قیمت ${formatPrice(currentPrice)} - هدف ${formatPrice(alert.targetValue)}`,
        });
        // TODO: Implement actual SMS sending via backend API
        // await fetch('/api/sms', { method: 'POST', body: JSON.stringify({...}) });
        return false; // Not implemented yet

      default:
        console.warn(`[Alert] Unknown channel: ${channel}`);
        return false;
    }
  } catch (error) {
    console.error(`[Alert] Failed to send via ${channel}:`, error);
    return false;
  }
}

// ─── Alert Check Logic ───
function checkAlertCondition(
  alert: Alert,
  currentPrice: number,
  changePercent: number,
  volume: number,
): boolean {
  switch (alert.alertType) {
    case "price_above":
      return currentPrice >= alert.targetValue;

    case "price_below":
      return currentPrice <= alert.targetValue;

    case "change_up":
      return changePercent >= alert.targetValue;

    case "change_down":
      return changePercent <= -alert.targetValue;

    case "volume_spike":
      return volume >= alert.targetValue;

    case "signal_buy":
    case "signal_sell":
    case "risk_high":
      // These are handled by signal engine
      return alert.isTriggered || false;

    default:
      return false;
  }
}

// ─── Main Monitor Function ───
export async function monitorAlerts(
  alerts: Alert[],
  instruments: any[],
  onAlertTriggered?: (trigger: AlertTrigger) => void,
): Promise<void> {
  if (!isMonitoring) return;

  const now = Date.now();
  const activeAlerts = alerts.filter(a => a.isActive && !a.isTriggered);

  if (activeAlerts.length === 0) return;

  for (const alert of activeAlerts) {
    const instrument = instruments.find(i => i.symbol === alert.symbol);
    if (!instrument) continue;

    const currentPrice = instrument.last ?? 0;
    const changePercent = instrument.changePercent ?? 0;
    const volume = instrument.volume ?? 0;

    const isTriggered = checkAlertCondition(alert, currentPrice, changePercent, volume);

    if (isTriggered) {
      // Update alert state
      const trigger: AlertTrigger = {
        alertId: alert._id,
        symbol: alert.symbol,
        triggeredAt: now,
        channel: "alarm",
        message: `${alert.symbol} به هدف رسید`,
        currentPrice,
        targetValue: alert.targetValue,
      };

      // Add to history
      triggeredHistory.unshift(trigger);
      if (triggeredHistory.length > MAX_HISTORY) {
        triggeredHistory.pop();
      }

      // Send notifications via all channels
      for (const channel of alert.channels) {
        const success = await sendViaChannel(channel, alert, currentPrice);
        if (success) {
          console.log(`[Alert] Notification sent via ${channel} for ${alert.symbol}`);
        }
      }

      // Callback for UI update
      if (onAlertTriggered) {
        onAlertTriggered(trigger);
      }
    }
  }

  lastCheckTime = now;
}

// ─── Start/Stop Monitoring ───
export function startAlertMonitoring(
  alerts: Alert[],
  instruments: any[],
  onAlertTriggered?: (trigger: AlertTrigger) => void,
): void {
  if (isMonitoring) return;

  isMonitoring = true;
  console.log("[AlertMonitor] Started monitoring alerts");

  // Request notification permission
  if ("Notification" in window) {
    void Notification.requestPermission();
  }

  // Check every 5 seconds
  monitorInterval = setInterval(() => {
    void monitorAlerts(alerts, instruments, onAlertTriggered);
  }, 5000);
}

export function stopAlertMonitoring(): void {
  if (!isMonitoring) return;

  isMonitoring = false;
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  console.log("[AlertMonitor] Stopped monitoring alerts");
}

export function isMonitoringActive(): boolean {
  return isMonitoring;
}

export function getLastCheckTime(): number {
  return lastCheckTime;
}

// ─── Get Triggered History ───
export function getTriggeredHistory(limit: number = 20): AlertTrigger[] {
  return triggeredHistory.slice(0, limit);
}

export function clearTriggeredHistory(): void {
  triggeredHistory.splice(0, triggeredHistory.length);
}

// ─── Test Notification ───
export function testNotification(channel: string): Promise<boolean> {
  return sendViaChannel(channel, {
    _id: "test",
    symbol: "TEST",
    alertType: "price_above",
    targetValue: 0,
    isActive: true,
    isTriggered: false,
    channels: [channel],
    triggerCount: 0,
  }, 1000);
}

// ─── Export Channel Info ───
export function getAvailableChannels(): NotificationChannel[] {
  return channels;
}

export function updateChannelConfig(channelId: string, config: any): void {
  const channel = channels.find(c => c.id === channelId);
  if (channel) {
    channel.config = config;
  }
}

export function setChannelEnabled(channelId: string, enabled: boolean): void {
  const channel = channels.find(c => c.id === channelId);
  if (channel) {
    channel.enabled = enabled;
  }
}
