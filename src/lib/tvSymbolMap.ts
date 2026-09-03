/**
 * TradingView symbol mapping for common Iranian TSE/IFB stocks.
 *
 * TradingView uses "TSE:" prefix with Persian ticker names.
 * Many stocks work directly (e.g. TSE:فولاد), but some need special mapping
 * because the TSETMC symbol differs from what TradingView recognizes.
 *
 * Fallback: if a symbol is not in this map, we use the raw cleaned symbol
 * with a TSE: prefix and let TradingView handle it (or show the fallback UI).
 */

// Keys: TSETMC symbols as they appear in the API
// Values: TradingView ticker symbols (without TSE: prefix)
const KNOWN_SYMBOLS: Record<string, string> = {
  // ─── فولاد / Steel ───
  "فولاد":       "فولاد",
  "فولادمبارکه": "فولاد",

  // ─── فملی / Copper ───
  "فملی":        "فملی",

  // ─── پالایشی / Refining ───
  "شپنا":        "شپنا",
  "شبندر":       "شبندر",
  "شتران":       "شتران",
  "شاراک":       "شاراک",

  // ─── خودرو / Automotive ───
  "خودرو":       "خودرو",
  "خساپا":       "خساپا",
  "خپارس":       "خپارس",
  "خمحرکن":      "خمحرکن",
  "خاهنا":       "خاهنا",
  "خوساز":       "خوساز",

  // ─── بانکی / Banking ───
  "وبملت":       "وبملت",
  "وتجارت":      "وتجارت",
  "وبصادر":      "وبصادر",
  "فایل":        "فایل",

  // ─── شیمیایی / Chemicals ───
  "شسپا":        "شسپا",
  "فارس":        "فارس",
  "نوری":        "نوری",
  "پارسان":      "پارسان",
  "زاگرس":       "زاگرس",
  "شاوان":       "شاوان",
  "بولارن":      "بولارن",

  // ─── معدنی / Mining ───
  "کگل":         "کگل",
  "کچاد":        "کچاد",
  "ذوب":         "ذوب",
  "فاسمین":      "فاسمین",

  // ─── شستا / Social Security ───
  "شستا":        "شستا",

  // ─── انرژی / Energy ───
  "شپدیس":       "شپدیس",
  "پردیس":       "پردیس",

  // ─── بیمه / Insurance ───
  "البرز":       "البرز",

  // ─── رایانه / IT ───
  "رازی":        "رازی",

  // ─── غذایی / Food ───
  "غسالم":       "غسالم",
  "غمارگ":       "غمارگ",
};

/**
 * Resolve a TSETMC symbol to a TradingView-compatible ticker.
 * If the symbol is in the known map, use the mapped value.
 * Otherwise, clean the symbol and use it directly with TSE: prefix.
 */
export function resolveTvSymbol(tsetmcSymbol: string): string {
  // Direct lookup
  if (KNOWN_SYMBOLS[tsetmcSymbol]) {
    return KNOWN_SYMBOLS[tsetmcSymbol];
  }

  // Clean: convert Persian digits to Latin, keep Persian letters + Latin + digits
  const cleaned = tsetmcSymbol
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1776))
    .replace(/[^\p{L}\p{N}]/gu, "");

  return cleaned || tsetmcSymbol;
}

/**
 * Get the full TradingView symbol with TSE: prefix.
 */
export function getTradingViewTicker(tsetmcSymbol: string): string {
  return `TSE:${resolveTvSymbol(tsetmcSymbol)}`;
}
