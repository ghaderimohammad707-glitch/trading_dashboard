/**
 * تب دیده‌بان بنیادی — نمایش تحلیل‌های بنیادی سهام
 * متصل به موتور تحلیل بنیادی پیشرفته
 */
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, TrendingUp, TrendingDown, Award, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { FundamentalAnalysisResult, QuarterlyData, AnnualData } from "@/lib/fundamental/types";
import { performFundamentalAnalysis, type FundamentalAnalysisInput } from "@/lib/fundamental/engine";
import { fetchCompanyProfile, fetchFinancialStatements } from "@/lib/fundamental/codalFetcher";
import { getCachedInstruments, type Instrument as ClientInstrument } from "@/lib/clientFetch";
import { cn } from "@/lib/utils";

interface FundamentalTabProps {
  onSymbolSelect?: (symbol: string) => void;
}

export function FundamentalTab({ onSymbolSelect }: FundamentalTabProps) {
  const [results, setResults] = useState<FundamentalAnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "buy" | "sell" | "hold">("all");
  const [sortBy, setSortBy] = useState<"score" | "pe" | "roe" | "growth">("score");

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const instruments = getCachedInstruments();
      if (instruments.length === 0) {
        setError("ابتدا داده‌های بازار را بروزرسانی کنید");
        setLoading(false);
        return;
      }

      // تحلیل ۵۰ نماد برتر از نظر حجم و تغییرات
      const topInstruments = instruments
        .filter(i => i.segment === "tse" || i.segment === "ifb")
        .sort((a, b) => (b.volume * Math.abs(b.changePercent)) - (a.volume * Math.abs(a.changePercent)))
        .slice(0, 50);

      const analysisPromises = topInstruments.map(async (inst) => {
        try {
          // دریافت پروفایل شرکت
          const profile = await fetchCompanyProfile(inst.symbol);
          if (!profile) return null;

          // دریافت صورت‌های مالی
          const statements = await fetchFinancialStatements(inst.symbol);
          
          const input: FundamentalAnalysisInput = {
            symbol: inst.symbol,
            companyProfile: profile,
            latestQuarterly: (statements?.quarterly?.[0] || null) as QuarterlyData | null,
            latestAnnual: (statements?.annual?.[0] || null) as AnnualData | null,
            previousAnnual: (statements?.annual?.[1] || null) as AnnualData | null,
            industryData: {
              avgPE: 15,
              avgPB: 2,
              avgROE: 0.15,
              avgGrowth: 0.1,
            },
            marketData: {
              riskFreeRate: 0.20, // نرخ بدون ریسک ۲۰٪
              marketReturn: 0.35, // بازده بازار ۳۵٪
              inflationRate: 0.30, // تورم ۳۰٪
            },
          };

          const result = await performFundamentalAnalysis(input);
          return result;
        } catch (err) {
          console.error(`خطا در تحلیل ${inst.symbol}:`, err);
          return null;
        }
      });

      const analysisResults = await Promise.all(analysisPromises);
      const validResults = analysisResults.filter((r): r is FundamentalAnalysisResult => r !== null);
      setResults(validResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در تحلیل بنیادی");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void handleRefresh();
  }, []);

  const filteredResults = useMemo(() => {
    let filtered = [...results];
    
    if (filter !== "all") {
      filtered = filtered.filter(r => {
        if (filter === "buy") return r.recommendation === "BUY_STRONG" || r.recommendation === "BUY";
        if (filter === "sell") return r.recommendation === "SELL_STRONG" || r.recommendation === "SELL";
        return r.recommendation === "HOLD";
      });
    }

    // مرتب‌سازی
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "score":
          return b.score.percentage - a.score.percentage;
        case "pe":
          return a.ratios.valuation.peRatio - b.ratios.valuation.peRatio;
        case "roe":
          return b.ratios.profitability.roe - a.ratios.profitability.roe;
        case "growth":
          return b.ratios.growth.revenueGrowth1Y - a.ratios.growth.revenueGrowth1Y;
        default:
          return 0;
      }
    });

    return filtered;
  }, [results, filter, sortBy]);

  const getRecommendationColor = (rec: string) => {
    if (rec.includes("BUY")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (rec.includes("SELL")) return "bg-red-500/10 text-red-400 border-red-500/30";
    return "bg-amber-500/10 text-amber-400 border-amber-500/30";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-lime-400";
    if (score >= 40) return "text-amber-400";
    if (score >= 20) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-4 p-4" dir="rtl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Award className="size-6 text-primary" />
          <h2 className="text-lg font-bold">دیده‌بان بنیادی</h2>
          <Badge variant="outline" className="text-xs">
            {results.length} نماد تحلیل‌شده
          </Badge>
        </div>
        <Button
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          {loading ? "در حال تحلیل..." : "بروزرسانی تحلیل"}
        </Button>
      </motion.div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="py-4 flex items-center gap-2 text-red-400">
            <AlertTriangle className="size-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          همه ({results.length})
        </Button>
        <Button
          variant={filter === "buy" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("buy")}
          className="bg-emerald-500/10 hover:bg-emerald-500/20"
        >
          خرید ({results.filter(r => r.recommendation.includes("BUY")).length})
        </Button>
        <Button
          variant={filter === "hold" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("hold")}
          className="bg-amber-500/10 hover:bg-amber-500/20"
        >
          نگهداری ({results.filter(r => r.recommendation === "HOLD").length})
        </Button>
        <Button
          variant={filter === "sell" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("sell")}
          className="bg-red-500/10 hover:bg-red-500/20"
        >
          فروش ({results.filter(r => r.recommendation.includes("SELL")).length})
        </Button>

        <div className="mr-auto flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border rounded px-2 py-1 bg-card"
          >
            <option value="score">امتیاز</option>
            <option value="pe">P/E</option>
            <option value="roe">ROE</option>
            <option value="growth">رشد درآمد</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نماد</TableHead>
              <TableHead>صنعت</TableHead>
              <TableHead>امتیاز</TableHead>
              <TableHead>P/E</TableHead>
              <TableHead>P/B</TableHead>
              <TableHead>ROE</TableHead>
              <TableHead>رشد درآمد</TableHead>
              <TableHead>ارزش ذاتی</TableHead>
              <TableHead>توصیه</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {loading ? "در حال تحلیل..." : "نتیجه‌ای یافت نشد"}
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.map((result) => (
                <TableRow
                  key={result.symbol}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSymbolSelect?.(result.symbol)}
                >
                  <TableCell className="font-bold">{result.symbol}</TableCell>
                  <TableCell>{result.companyProfile.sector || "-"}</TableCell>
                  <TableCell>
                    <Badge className={cn(getScoreColor(result.score.percentage), "bg-transparent")}>
                      {Math.round(result.score.percentage)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {result.ratios.valuation.peRatio > 0 
                      ? result.ratios.valuation.peRatio.toFixed(1) 
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {result.ratios.valuation.pbRatio > 0 
                      ? result.ratios.valuation.pbRatio.toFixed(2) 
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {(result.ratios.profitability.roe * 100).toFixed(1)}٪
                  </TableCell>
                  <TableCell>
                    {(result.ratios.growth.revenueGrowth1Y * 100).toFixed(1)}٪
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{Math.round(result.valuation.fairValuePE || 0).toLocaleString()}</span>
                      {result.valuation.discountToFairValue > 0.15 && (
                        <CheckCircle className="size-3 text-emerald-400" />
                      )}
                      {result.valuation.discountToFairValue < -0.15 && (
                        <XCircle className="size-3 text-red-400" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRecommendationColor(result.recommendation)}>
                      {result.recommendation === "BUY_STRONG" && "خرید قوی"}
                      {result.recommendation === "BUY" && "خرید"}
                      {result.recommendation === "HOLD" && "نگهداری"}
                      {result.recommendation === "SELL" && "فروش"}
                      {result.recommendation === "SELL_STRONG" && "فروش قوی"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Summary Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs text-muted-foreground">میانگین امتیاز</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getScoreColor(
                results.reduce((sum, r) => sum + r.score.percentage, 0) / results.length
              ))}>
                {Math.round(results.reduce((sum, r) => sum + r.score.percentage, 0) / results.length)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs text-muted-foreground">نمادهای زیرارزشی</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                {results.filter(r => r.valuation.valuationStatus === "UNDERVALUED").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs text-muted-foreground">سیگنال خرید</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-lime-400">
                {results.filter(r => r.recommendation.includes("BUY")).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs text-muted-foreground">سیگنال فروش</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {results.filter(r => r.recommendation.includes("SELL")).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
