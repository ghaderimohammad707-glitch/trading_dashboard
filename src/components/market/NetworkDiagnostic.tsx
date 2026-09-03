/**
 * ابزار تشخیص شبکه — تست اتصال به همه APIها
 * وضعیت اتصال، سرعت پاسخ، و خطاهای احتمالی رو نمایش می‌ده
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  WifiOff,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Clock,
  Globe,
  Server,

  Newspaper,
  BarChart3,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EndpointResult {
  name: string;
  url: string;
  status: "pending" | "success" | "error" | "timeout";
  latency: number;
  error?: string;
  data?: string;
}

const API_ENDPOINTS = [
  {
    name: "TSETMC CDN",
    url: "/tsetmc-api/api/ClosingPrice/GetMarketWatch?market=0&paperTypes[0]=1&withBestLimits=false&hEven=0&RefID=0",
    icon: BarChart3,
    category: "market" as const,
    timeout: 10000,
  },
  {
    name: "TSETMC Mirror",
    url: "/tsetmc-api-v2/api/ClosingPrice/GetMarketWatch?market=0&paperTypes[0]=1&withBestLimits=false&hEven=0&RefID=0",
    icon: Server,
    category: "market" as const,
    timeout: 10000,
  },
  {
    name: "TGJU API",
    url: "/tgju-api/v2/market/current/2568",
    icon: Globe,
    category: "commodity" as const,
    timeout: 8000,
  },
  {
    name: "Codal API",
    url: "/codal-api/api/v2/notification/list?category=1&page=1&size=1",
    icon: Newspaper,
    category: "codal" as const,
    timeout: 8000,
  },

  {
    name: "RSS فارس",
    url: "/rss/fars",
    icon: Newspaper,
    category: "news" as const,
    timeout: 8000,
  },
  {
    name: "RSS تنسیم",
    url: "/rss/tasnim",
    icon: Newspaper,
    category: "news" as const,
    timeout: 8000,
  },
  {
    name: "CDN TSETMC (Historical)",
    url: "https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceHistory/65976355498348890/30",
    icon: Clock,
    category: "market" as const,
    timeout: 10000,
  },
];

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  market: { label: "بازار", color: "text-emerald-400" },
  commodity: { label: "کالا و ارز", color: "text-amber-400" },
  codal: { label: "کدال", color: "text-blue-400" },
  news: { label: "اخبار", color: "text-purple-400" },
  backend: { label: "بک‌اند", color: "text-cyan-400" },
};

export function NetworkDiagnostic() {
  const [results, setResults] = useState<EndpointResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const testEndpoint = useCallback(
    async (ep: (typeof API_ENDPOINTS)[0]): Promise<EndpointResult> => {
      const result: EndpointResult = {
        name: ep.name,
        url: ep.url,
        status: "pending",
        latency: 0,
      };

      const start = performance.now();
      try {
        const res = await fetch(ep.url, {
          signal: AbortSignal.timeout(ep.timeout),
          headers: { Accept: "application/json" },
        });
        const elapsed = Math.round(performance.now() - start);
        const text = await res.text();

        if (res.ok && (text.startsWith("{") || text.startsWith("["))) {
          const dataLen = text.length;
          result.status = "success";
          result.latency = elapsed;
          result.data = `${(dataLen / 1024).toFixed(1)} KB`;
        } else {
          result.status = "error";
          result.latency = elapsed;
          result.error = `HTTP ${res.status} — ${text.substring(0, 80)}`;
        }
      } catch (e) {
        const elapsed = Math.round(performance.now() - start);
        result.latency = elapsed;
        if (e instanceof DOMException && e.name === "TimeoutError") {
          result.status = "timeout";
          result.error = `Timeout after ${ep.timeout / 1000}s`;
        } else {
          result.status = "error";
          result.error = e instanceof Error ? e.message : String(e);
        }
      }
      return result;
    },
    [],
  );

  const runAllTests = useCallback(async () => {
    setTesting(true);
    setResults(
      API_ENDPOINTS.map((ep) => ({
        name: ep.name,
        url: ep.url,
        status: "pending" as const,
        latency: 0,
      })),
    );

    // Test endpoints sequentially to avoid network congestion
    const newResults: EndpointResult[] = [];
    for (const ep of API_ENDPOINTS) {
      const result = await testEndpoint(ep);
      newResults.push(result);
      setResults([...newResults]);
      // Small delay between tests
      await new Promise((r) => setTimeout(r, 200));
    }

    setTesting(false);
  }, [testEndpoint]);

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error" || r.status === "timeout").length;

  return (
    <div className="rounded-xl border border-border/40 bg-card/80 overflow-hidden" dir="rtl">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {testing ? (
            <Loader2 className="size-4 animate-spin text-blue-400" />
          ) : results.length > 0 ? (
            successCount === results.length ? (
              <Wifi className="size-4 text-emerald-400" />
            ) : errorCount > 0 ? (
              <WifiOff className="size-4 text-red-400" />
            ) : (
              <Wifi className="size-4 text-amber-400" />
            )
          ) : (
            <Globe className="size-4 text-muted-foreground" />
          )}
          <span className="text-sm font-semibold">تشخیص شبکه</span>
          {results.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 h-4">
              {successCount}/{results.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!testing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                runAllTests();
              }}
              className="h-7 gap-1 text-xs"
            >
              <RefreshCw className="size-3" />
              تست
            </Button>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }}>
            <Zap className="size-3 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      {/* Results */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {results.length === 0 && !testing && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  دکمه «تست» را بزنید تا اتصال به همه APIها بررسی شود
                </p>
              )}

              {results.map((result, idx) => {
                const ep = API_ENDPOINTS[idx];
                const Icon = ep.icon;
                const cat = CATEGORY_LABELS[ep.category];

                return (
                  <motion.div
                    key={result.name}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-xs transition-all",
                      result.status === "success"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : result.status === "error" || result.status === "timeout"
                          ? "border-red-500/20 bg-red-500/5"
                          : result.status === "pending"
                            ? "border-border/30 bg-muted/20"
                            : "border-border/30 bg-card",
                    )}
                  >
                    {/* Status icon */}
                    <div className="shrink-0">
                      {result.status === "success" && <CheckCircle2 className="size-4 text-emerald-400" />}
                      {result.status === "error" && <XCircle className="size-4 text-red-400" />}
                      {result.status === "timeout" && <Clock className="size-4 text-amber-400" />}
                      {result.status === "pending" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    </div>

                    {/* Icon + Name */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Icon className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{result.name}</span>
                      <span className={cn("text-[10px] shrink-0", cat.color)}>{cat.label}</span>
                    </div>

                    {/* Latency */}
                    <div className="shrink-0 text-left">
                      {result.latency > 0 && (
                        <span
                          className={cn(
                            "tabular-nums",
                            result.latency < 1000
                              ? "text-emerald-400"
                              : result.latency < 3000
                                ? "text-amber-400"
                                : "text-red-400",
                          )}
                        >
                          {result.latency < 1000
                            ? `${result.latency}ms`
                            : `${(result.latency / 1000).toFixed(1)}s`}
                        </span>
                      )}
                      {result.data && (
                        <span className="text-muted-foreground mr-2">{result.data}</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* Error details */}
              {results.some((r) => r.error) && (
                <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-xs font-semibold text-red-400 mb-2">جزئیات خطاها:</p>
                  {results
                    .filter((r) => r.error)
                    .map((r) => (
                      <div key={r.name} className="text-[11px] text-red-300/80 mb-1 font-mono" dir="ltr">
                        <span className="text-red-400">{r.name}:</span> {r.error}
                      </div>
                    ))}
                </div>
              )}

              {/* Summary */}
              {results.length > 0 && !testing && (
                <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
                  <span>
                    {successCount === results.length
                      ? "✅ همه APIها متصل هستند"
                      : errorCount === results.length
                        ? "❌ همه APIها قطع هستند"
                        : `⚠️ ${successCount} متصل، ${errorCount} قطع`}
                  </span>
                  <span>
                    میانگین:{" "}
                    {results.filter((r) => r.latency > 0).length > 0
                      ? `${Math.round(results.filter((r) => r.latency > 0).reduce((s, r) => s + r.latency, 0) / results.filter((r) => r.latency > 0).length)}ms`
                      : "—"}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
