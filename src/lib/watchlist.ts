/**
 * لیست دیده‌بان — ذخیره نمادهای مورد علاقه در localStorage
 */

export interface WatchlistItem {
  symbol: string;
  name: string;
  addedAt: number;
  note?: string;
  alertPrice?: number; // قیمت هشدار
}

const STORAGE_KEY = "nabz_watchlist";

export function getWatchlist(): WatchlistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToWatchlist(item: Omit<WatchlistItem, "addedAt">): WatchlistItem[] {
  const list = getWatchlist();
  // Don't add duplicates
  if (list.some((w) => w.symbol === item.symbol)) return list;
  const newList = [{ ...item, addedAt: Date.now() }, ...list];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  return newList;
}

export function removeFromWatchlist(symbol: string): WatchlistItem[] {
  const list = getWatchlist().filter((w) => w.symbol !== symbol);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function updateWatchlistItem(symbol: string, updates: Partial<Pick<WatchlistItem, "note" | "alertPrice">>): WatchlistItem[] {
  const list = getWatchlist().map((w) =>
    w.symbol === symbol ? { ...w, ...updates } : w
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function isInWatchlist(symbol: string): boolean {
  return getWatchlist().some((w) => w.symbol === symbol);
}

export function toggleWatchlist(item: Omit<WatchlistItem, "addedAt">): WatchlistItem[] {
  if (isInWatchlist(item.symbol)) {
    return removeFromWatchlist(item.symbol);
  }
  return addToWatchlist(item);
}
