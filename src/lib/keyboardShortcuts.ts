/**
 * میانبرهای کیبورد برای تریدر حرفه‌ای
 */

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: string;
}

export const SHORTCUTS: Shortcut[] = [
  // ناوبری تب‌ها
  { key: "1", alt: true, description: "تب دیده‌بان", category: "ناوبری" },
  { key: "2", alt: true, description: "تب سیگنال‌ها", category: "ناوبری" },
  { key: "3", alt: true, description: "تب نتایج سیگنال", category: "ناوبری" },
  { key: "4", alt: true, description: "تب کشف گنج", category: "ناوبری" },
  { key: "5", alt: true, description: "تب کالا و ارز", category: "ناوبری" },
  { key: "6", alt: true, description: "تب اخبار", category: "ناوبری" },
  { key: "7", alt: true, description: "تب هشدارها", category: "ناوبری" },
  { key: "8", alt: true, description: "تب پرتفوی", category: "ناوبری" },
  { key: "9", alt: true, description: "تب ژورنال", category: "ناوبری" },

  // عملیات
  { key: "r", ctrl: true, description: "بروزرسانی داده", category: "عملیات" },
  { key: "k", ctrl: true, description: "جستجو", category: "عملیات" },
  { key: "Escape", description: "بستن پنجره/دیالوگ", category: "عملیات" },
  { key: "/", description: "فوکوس جستجو", category: "عملیات" },
];

const TAB_MAP: Record<string, string> = {
  "1": "market",
  "2": "signals",
  "3": "signal-results",
  "4": "gem-hunter",
  "5": "commodities",
  "6": "news",
  "7": "alerts",
  "8": "portfolio",
  "9": "journal",
};

type ShortcutHandler = (action: string) => void;

let registeredShortcuts: Map<string, ShortcutHandler> = new Map();

export function registerShortcuts(handler: ShortcutHandler): () => void {
  const listener = (e: KeyboardEvent) => {
    // اگر در input باشیم نادیده بگیر
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
      if (e.key === "Escape") {
        (target as HTMLInputElement).blur();
        return;
      }
      return;
    }

    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    for (const shortcut of SHORTCUTS) {
      if (
        shortcut.key === e.key &&
        !!shortcut.ctrl === ctrl &&
        !!shortcut.shift === shift &&
        !!shortcut.alt === alt
      ) {
        e.preventDefault();
        e.stopPropagation();

        // تبدیل کلید به عملکرد
        if (alt && TAB_MAP[shortcut.key]) {
          handler("tab:" + TAB_MAP[shortcut.key]);
        } else if (ctrl && shortcut.key === "r") {
          handler("refresh");
        } else if (ctrl && shortcut.key === "k") {
          handler("search");
        } else if (shortcut.key === "Escape") {
          handler("escape");
        } else if (shortcut.key === "/") {
          handler("search");
        }
        return;
      }
    }
  };

  document.addEventListener("keydown", listener);
  return () => document.removeEventListener("keydown", listener);
}

export function getShortcutDisplay(shortcut: Shortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push("Ctrl");
  if (shortcut.shift) parts.push("Shift");
  if (shortcut.alt) parts.push("Alt");
  parts.push(shortcut.key === "Escape" ? "Esc" : shortcut.key.toUpperCase());
  return parts.join("+");
}
