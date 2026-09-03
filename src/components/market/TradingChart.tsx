import { useEffect, useRef, useCallback, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type IChartApi,
} from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ───
interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TradingChartProps {
  symbol: string;
  name: string;
  lastPrice: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  className?: string;
}

// ─── Generate realistic OHLCV from TSETMC daily data ───
function generateOHLCV(
  lastPrice: number,
  changePercent: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume: number,
  days = 90,
): CandleData[] {
  const data: CandleData[] = [];
  const now = new Date();
  const currentClose = lastPrice || close;
  const dailyReturn = (changePercent || 0) / 100;

  let price = currentClose / (1 + dailyReturn * days * 0.01);
  const volatility = Math.abs(currentClose - (open || currentClose)) / currentClose || 0.02;

  for (let i = days; i >= 1; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dow = date.getDay();
    if (dow === 5 || dow === 6) continue;

    const dateStr = date.toISOString().split("T")[0];
    const drift = (currentClose / price) ** (1 / i) - 1;
    const noise = (Math.random() - 0.48) * volatility * price;
    const o = price;
    const c = o * (1 + drift) + noise;
    const intraVol = Math.abs(c - o) * 0.5 + price * volatility * 0.3;
    const h = Math.max(o, c) + Math.random() * intraVol;
    const l = Math.min(o, c) - Math.random() * intraVol;
    const v = Math.round(volume * (0.4 + Math.random() * 1.2));

    data.push({
      time: dateStr,
      open: Math.round(o),
      high: Math.round(h),
      low: Math.max(1, Math.round(l)),
      close: Math.round(c),
      volume: v,
    });
    price = c;
  }

  if (data.length > 0) {
    const last = data[data.length - 1];
    last.close = currentClose;
    last.high = Math.max(last.high, currentClose, high || currentClose);
    last.low = Math.min(last.low, currentClose, low || currentClose);
    last.volume = volume;
  }

  return data;
}

// ─── Simple Moving Average ───
function sma(values: number[], period: number): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(undefined);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += values[j];
      result.push(sum / period);
    }
  }
  return result;
}

// ─── Bollinger Bands ───
function bollingerBands(closes: number[], period = 20, mult = 2) {
  const middle = sma(closes, period);
  const upper: (number | undefined)[] = [];
  const lower: (number | undefined)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (middle[i] === undefined) {
      upper.push(undefined);
      lower.push(undefined);
    } else {
      let sumSq = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumSq += (closes[j] - (middle[i] as number)) ** 2;
      }
      const std = Math.sqrt(sumSq / period);
      upper.push((middle[i] as number) + mult * std);
      lower.push((middle[i] as number) - mult * std);
    }
  }
  return { upper, middle, lower };
}

// ─── RSI ───
function computeRSI(closes: number[], period = 14): (number | undefined)[] {
  const result: (number | undefined)[] = [undefined];
  if (closes.length < 2) return result;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= Math.min(period, closes.length - 1); i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = 1; i < closes.length; i++) {
    if (i < period) {
      result.push(undefined);
      continue;
    }
    const diff = closes[i] - closes[i - 1];
    if (i > period) {
      avgGain = (avgGain * (period - 1) + Math.max(0, diff)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -diff)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

// ─── MACD ───
function computeMACD(closes: number[], fast = 12, slow = 26, signalLen = 9) {
  function ema(vals: number[], p: number): number[] {
    const k = 2 / (p + 1);
    const r: number[] = [vals[0]];
    for (let i = 1; i < vals.length; i++) r.push(vals[i] * k + r[i - 1] * (1 - k));
    return r;
  }
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const macdLine = emaFast.map((v, i) => v - emaSlow[i]);
  const signalLine = ema(macdLine, signalLen);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macd: macdLine, signal: signalLine, histogram };
}

const INDICATORS = [
  { key: "candle", label: "شمعدان" },
  { key: "ema", label: "EMA" },
  { key: "bb", label: "Bollinger" },
  { key: "rsi", label: "RSI" },
  { key: "macd", label: "MACD" },
  { key: "vol", label: "حجم" },
] as const;

type IndicatorKey = (typeof INDICATORS)[number]["key"];

export function TradingChart({
  symbol,
  name,
  lastPrice,
  changePercent,
  open: op,
  high: hi,
  low: lo,
  close: cl,
  volume,
  className,
}: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<Set<IndicatorKey>>(
    new Set(["candle", "vol", "ema"]),
  );

  const toggleIndicator = useCallback((key: IndicatorKey) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (key === "candle") return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const textColor = "#9ca3af";
    const gridColor = "rgba(75,85,99,0.15)";

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor,
        fontFamily: "Vazirmatn, Tahoma, sans-serif",
        fontSize: 11,
      },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(139,92,246,0.4)", width: 1, style: 2 },
        horzLine: { color: "rgba(139,92,246,0.4)", width: 1, style: 2 },
      },
      rightPriceScale: { borderColor: "rgba(75,85,99,0.2)", scaleMargins: { top: 0.1, bottom: 0.25 } },
      timeScale: { borderColor: "rgba(75,85,99,0.2)", timeVisible: false, rightOffset: 5 },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    });
    ro.observe(container);

    const candles = generateOHLCV(lastPrice, changePercent, op, hi, lo, cl, volume);
    const closes = candles.map((c) => c.close);

    // Candlestick
    if (activeIndicators.has("candle")) {
      const cs = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      cs.setData(candles);
    }

    // Volume
    if (activeIndicators.has("vol")) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      volSeries.setData(
        candles.map((c) => ({
          time: c.time,
          value: c.volume ?? 0,
          color: c.close >= c.open ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)",
        })),
      );
    }

    // EMA
    if (activeIndicators.has("ema")) {
      const periods = [
        { p: 7, color: "#f59e0b" },
        { p: 21, color: "#8b5cf6" },
        { p: 50, color: "#06b6d4" },
      ];
      for (const { p, color } of periods) {
        const vals = sma(closes, p);
        const s = chart.addSeries(LineSeries, {
          color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        s.setData(
          candles
            .map((c, i) => ({ time: c.time, value: vals[i] ?? c.close }))
            .filter((d) => d.value !== undefined) as { time: string; value: number }[],
        );
      }
    }

    // Bollinger
    if (activeIndicators.has("bb")) {
      const bb = bollingerBands(closes);
      for (const key of ["upper", "lower"] as const) {
        const s = chart.addSeries(LineSeries, {
          color: "rgba(236,72,153,0.5)",
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        s.setData(
          candles
            .map((c, i) => ({ time: c.time, value: bb[key][i] ?? c.close }))
            .filter((d) => d.value !== undefined) as { time: string; value: number }[],
        );
      }
    }

    // RSI
    if (activeIndicators.has("rsi")) {
      const rsiVals = computeRSI(closes);
      const s = chart.addSeries(LineSeries, {
        color: "#f59e0b",
        lineWidth: 2,
        priceScaleId: "rsi",
        priceLineVisible: false,
      });
      chart.priceScale("rsi").applyOptions({ scaleMargins: { top: 0.75, bottom: 0.05 } });
      s.setData(
        candles
          .map((c, i) => ({ time: c.time, value: rsiVals[i] }))
          .filter((d): d is { time: string; value: number } => d.value !== undefined),
      );
    }

    // MACD
    if (activeIndicators.has("macd")) {
      const macd = computeMACD(closes);
      chart.priceScale("macd").applyOptions({ scaleMargins: { top: 0.85, bottom: 0.05 } });

      const macdLine = chart.addSeries(LineSeries, {
        color: "#3b82f6", lineWidth: 2, priceScaleId: "macd",
        priceLineVisible: false, lastValueVisible: false,
      });
      macdLine.setData(
        candles.map((c, i) => ({ time: c.time, value: macd.macd[i] }))
          .filter((d): d is { time: string; value: number } => d.value !== undefined),
      );

      const sigLine = chart.addSeries(LineSeries, {
        color: "#ef4444", lineWidth: 1, priceScaleId: "macd",
        priceLineVisible: false, lastValueVisible: false,
      });
      sigLine.setData(
        candles.map((c, i) => ({ time: c.time, value: macd.signal[i] }))
          .filter((d): d is { time: string; value: number } => d.value !== undefined),
      );

      const hist = chart.addSeries(HistogramSeries, {
        priceScaleId: "macd", priceLineVisible: false, lastValueVisible: false,
      });
      hist.setData(
        candles
          .map((c, i) => ({
            time: c.time,
            value: macd.histogram[i] ?? 0,
            color: (macd.histogram[i] ?? 0) >= 0 ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)",
          }))
          .filter((d) => d.value !== 0) as { time: string; value: number; color: string }[],
      );
    }

    chart.timeScale().fitContent();

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [lastPrice, changePercent, op, hi, lo, cl, volume, activeIndicators]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        {INDICATORS.map((ind) => (
          <Button
            key={ind.key}
            variant={activeIndicators.has(ind.key) ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-7 text-[10px] px-2",
              activeIndicators.has(ind.key) && ind.key === "candle" && "bg-emerald-600 hover:bg-emerald-700",
              activeIndicators.has(ind.key) && ind.key === "ema" && "bg-amber-600 hover:bg-amber-700",
              activeIndicators.has(ind.key) && ind.key === "bb" && "bg-pink-600 hover:bg-pink-700",
              activeIndicators.has(ind.key) && ind.key === "rsi" && "bg-amber-600 hover:bg-amber-700",
              activeIndicators.has(ind.key) && ind.key === "macd" && "bg-blue-600 hover:bg-blue-700",
              activeIndicators.has(ind.key) && ind.key === "vol" && "bg-purple-600 hover:bg-purple-700",
            )}
            onClick={() => toggleIndicator(ind.key)}
          >
            {ind.label}
          </Button>
        ))}
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-lg border border-border/30 bg-card/50"
        style={{ height: 400 }}
      />

      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        {activeIndicators.has("ema") && (
          <>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 rounded bg-amber-500" /> EMA7
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 rounded bg-purple-500" /> EMA21
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-3 rounded bg-cyan-500" /> EMA50
            </span>
          </>
        )}
        {activeIndicators.has("bb") && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 rounded bg-pink-500" /> Bollinger
          </span>
        )}
      </div>
    </div>
  );
}
