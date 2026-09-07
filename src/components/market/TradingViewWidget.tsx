import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getTradingViewTicker } from "@/lib/tvSymbolMap";
import { AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * TradingView advanced chart widget embed.
 * Uses the free TradingView widget script for full-featured charts
 * with drawing tools, 100+ indicators, and multi-timeframe support.
 *
 * Includes error handling for symbols not found on TradingView.
 */
export function TradingViewWidget({
  symbol,
  name,
  className,
}: {
  symbol: string;
  name: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tvSymbol = getTradingViewTicker(symbol);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";
    setLoadError(false);
    setLoading(true);

    // Safety timeout: if TradingView doesn't report within 8s, show fallback
    errorTimerRef.current = setTimeout(() => {
      setLoading(false);
      setLoadError(true);
    }, 8000);

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;

    script.onload = () => {
      // Script loaded, but symbol might still be invalid
      // Clear the timeout — if widget renders, we'll get data
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      // Give extra time for the widget to actually render data
      errorTimerRef.current = setTimeout(() => {
        setLoading(false);
      }, 3000);
    };

    script.onerror = () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      setLoading(false);
      setLoadError(true);
    };

    script.textContent = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Asia/Tehran",
      theme: "dark",
      style: "1",
      locale: "fa_IR",
      backgroundColor: "rgba(10,15,26,1)",
      gridColor: "rgba(75,85,99,0.15)",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      allow_symbol_change: true,
      drawings_access: {
        type: "toolbar",
        tools: ["highlight", "trend_line", "horizontal_line", "fibonacci", "rectangle"],
      },
      studies: ["STD;EMA", "STD;RSI", "STD;MACD", "STD;BB", "STD;VWAP", "STD;Volume"],
    });

    container.appendChild(script);

    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      container.innerHTML = "";
    };
  }, [tvSymbol, retryCount]);

  const handleRetry = () => {
    setLoadError(false);
    setLoading(true);
    setRetryCount((c) => c + 1);
  };

  if (loadError) {
    return (
      <div className={cn("flex flex-col items-center justify-center rounded-lg border border-border/30 bg-card/50 p-8 text-center", className)}>
        <AlertTriangle className="mb-3 size-8 text-amber-400/70" />
        <p className="mb-1 text-sm font-semibold">نمودار TradingView موجود نیست</p>
        <p className="mb-4 text-xs text-muted-foreground max-w-xs">
          نماد <span className="font-mono" dir="ltr">{tvSymbol}</span> در TradingView پشتیبانی نمی‌شود.
          <br />از نمودار محلی استفاده کنید یا نماد را به صورت دستی در TradingView جستجو کنید.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleRetry}>
            <RefreshCw className="size-3.5" /> تلاش مجدد
          </Button>
          <a
            href={`https://www.tradingview.com/chart/?symbol=${tvSymbol}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="size-3.5" /> باز کردن در TradingView
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("tradingview-widget-container rounded-lg overflow-hidden border border-border/30", className)}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            <span>بارگذاری نمودار TradingView...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full relative" style={{ minHeight: 450 }} />
    </div>
  );
}
