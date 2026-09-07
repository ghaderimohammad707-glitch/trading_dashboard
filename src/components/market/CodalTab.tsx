import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileText, Loader2, TrendingUp, TrendingDown, BarChart3, Scale, AlertTriangle, Upload } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { getCachedInstruments } from "@/lib/clientFetch";
import { fetchCodalClient, getCachedCodal, type FinancialStatement } from "@/lib/codalFetch";

// ─── Types ───
interface LocalCodalReport {
  _id: string;
  symbol: string;
  companyName: string;
  reportType: string;
  title: string;
  summary: string;
  publishDate: number;
  url: string;
  impactScore?: number;
  // Financial metrics
  eps?: number;
  pe?: number;
  roe?: number;
  roa?: number;
  debtToEquity?: number;
  currentRatio?: number;
  grossMargin?: number;
  netMargin?: number;
  revenue?: number;
  netIncome?: number;
  bookValue?: number;
  marketCap?: number;
  volume?: number;
  changePercent?: number;
  financialData?: FinancialStatement;
}

type ReportFilter = "all" | "income" | "balance" | "cashflow" | "eps" | "significant";

const REPORT_TYPES: { id: ReportFilter; label: string; icon: string }[] = [
  { id: "all", label: "همه", icon: "📋" },
  { id: "income", label: "صورت سود/زیان", icon: "💰" },
  { id: "balance", label: "ترازنامه", icon: "📊" },
  { id: "cashflow", label: "جریان نقد", icon: "💹" },
  { id: "eps", label: "سود هر سهم", icon: "🎯" },
  { id: "significant", label: "مهم (>۳٪ تغییر)", icon: "⚡" },
];

// ─── Generate comprehensive financial reports from TSETMC data ───
function generateCodalReports(): LocalCodalReport[] {
  // کدال فعلاً غیرفعال است - نمایش پیام شفاف به کاربر
  // هیچ داده ساختگی تولید نمی‌شود
  return [];
}

function formatToman(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(1)} هزار میلیارد`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)} میلیارد`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)} میلیون`;
  return value.toLocaleString("fa-IR");
}

// ─── Component ───
export function CodalTab() {
  const [reports, setReports] = useState<LocalCodalReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [searchSymbol, setSearchSymbol] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "impact" | "symbol">("date");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isComingSoon = true; // Codal API temporarily disabled

  const loadReports = async () => {
    setLoading(true);
    try {
      // Try real Codal API first
      const codalResult = await fetchCodalClient(getCachedInstruments());
      if (codalResult.count > 0 && codalResult.source === "codal") {
        // Use real Codal data
        const realData = getCachedCodal().map(r => ({
          _id: r._id,
          symbol: r.symbol || "نامشخص",
          companyName: r.summary?.split("—")[0]?.trim() || r.title,
          reportType: r.reportType,
          title: r.title,
          summary: r.summary || "",
          publishDate: r.publishDate,
          url: r.url,
          impactScore: r.impactScore,
          financialData: r.financialData,
        }));
        setReports(realData);
        console.log(`[CodalTab] Loaded ${realData.length} REAL reports from Codal API`);
        setLoading(false);
        return;
      }
      // Fallback: no fake reports generated
      setReports([]);
      console.log(`[CodalTab] No reports - Codal API disabled`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  // Handle file upload for processing Codal reports
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      console.log(`[CodalTab] Processing uploaded file: ${file.name} (${file.type})`);

      // TODO: Implement server-side file processing
      // For now, show a message that this feature requires a backend
      alert('پردازش فایل نیاز به سرور دارد. این قابلیت در نسخه فعلی غیرفعال است.');
      setUploading(false);
      return;
    } catch (error) {
      console.error('[CodalTab] File upload error:', error);
      alert(`❌ خطا در پردازش فایل: ${error instanceof Error ? error.message : 'خطای ناشناخته'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filtered = useMemo(() => {
    let result = reports;

    // Filter by type
    if (filter === "income") result = result.filter((r) => r.reportType === "صورت سود/زیان");
    else if (filter === "balance") result = result.filter((r) => r.reportType === "ترازنامه");
    else if (filter === "cashflow") result = result.filter((r) => r.reportType === "جریان نقد");
    else if (filter === "eps") result = result.filter((r) => r.reportType === "سود هر سهم");
    else if (filter === "significant") result = result.filter((r) => r.impactScore !== undefined && Math.abs(r.impactScore) > 0.03);

    // Filter by symbol search
    if (searchSymbol.trim()) {
      const search = searchSymbol.trim().toUpperCase();
      result = result.filter((r) => r.symbol.toUpperCase().includes(search) || r.companyName.includes(search));
    }

    // Sort
    if (sortBy === "date") result = [...result].sort((a, b) => b.publishDate - a.publishDate);
    else if (sortBy === "impact") result = [...result].sort((a, b) => Math.abs(b.impactScore || 0) - Math.abs(a.impactScore || 0));
    else if (sortBy === "symbol") result = [...result].sort((a, b) => a.symbol.localeCompare(b.symbol, "fa"));

    return result;
  }, [reports, filter, searchSymbol, sortBy]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" />
            گزارش‌های کدال
          </h1>
          <p className="text-sm text-gray-400 mt-1">تحلیل صورت‌های مالی و گزارش‌های رسمی شرکت‌ها</p>
          {isComingSoon && (
            <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <p className="font-semibold">کدال موقتاً غیرفعال است</p>
                <p>API کدال به دلیل محدودیت‌های فنی فعلاً در دسترس نیست. گزارش‌های ساختگی نمایش داده نمی‌شوند.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isComingSoon}
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            آپلود فایل
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          {uploading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50">
        <span className="text-sm text-gray-400 ml-2">فیلتر:</span>
        {REPORT_TYPES.map((type) => (
          <Button
            key={type.id}
            variant={filter === type.id ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter(type.id)}
            className={cn(
              "text-xs",
              filter === type.id ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-white/5"
            )}
          >
            <span className="ml-1">{type.icon}</span>
            {type.label}
          </Button>
        ))}

        <div className="flex-1" />

        <input
          type="text"
          placeholder="جستجوی نماد یا شرکت..."
          value={searchSymbol}
          onChange={(e) => setSearchSymbol(e.target.value)}
          className="px-3 py-1.5 text-sm bg-black/30 border border-border/50 rounded-md focus:outline-none focus:border-blue-500/50 text-white placeholder:text-gray-500 w-48"
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-1.5 text-sm bg-black/30 border border-border/50 rounded-md focus:outline-none focus:border-blue-500/50 text-white"
        >
          <option value="date">جدیدترین</option>
          <option value="impact">بیشترین تأثیر</option>
          <option value="symbol">نام نماد</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-3 text-gray-400">در حال بارگذاری گزارش‌ها...</span>
        </div>
      ) : reports.length === 0 && !isComingSoon ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400">هیچ گزارشی یافت نشد</h3>
          <p className="text-gray-500 mt-2">گزارشی با فیلترهای انتخاب‌شده وجود ندارد</p>
        </div>
      ) : isComingSoon ? (
        <div className="text-center py-20">
          <AlertTriangle className="w-16 h-16 mx-auto text-yellow-600 mb-4" />
          <h3 className="text-lg font-semibold text-yellow-500">کدال در دسترس نیست</h3>
          <p className="text-gray-500 mt-2">لطفاً بعداً مجدداً بررسی کنید</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((report) => (
            <div
              key={report._id}
              className="p-4 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 hover:border-blue-500/30 transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-400">
                      {report.reportType}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(report.publishDate).toLocaleDateString("fa-IR")}
                    </span>
                    {report.impactScore !== undefined && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          report.impactScore > 0
                            ? "border-green-500/30 text-green-400"
                            : report.impactScore < 0
                              ? "border-red-500/30 text-red-400"
                              : "border-gray-500/30 text-gray-400"
                        )}
                      >
                        {report.impactScore > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {Math.abs(report.impactScore * 100).toFixed(0)}٪
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                    {report.title}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">{report.summary}</p>

                  {/* Financial Metrics Grid */}
                  {report.financialData && Object.keys(report.financialData).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 p-3 bg-black/20 rounded-md">
                      {report.financialData.roe !== undefined && (
                        <div>
                          <div className="text-xs text-gray-500">ROE</div>
                          <div className={cn("text-sm font-semibold", report.financialData.roe > 20 ? "text-green-400" : "text-gray-300")}>
                            {report.financialData.roe.toFixed(1)}٪
                          </div>
                        </div>
                      )}
                      {report.financialData.roa !== undefined && (
                        <div>
                          <div className="text-xs text-gray-500">ROA</div>
                          <div className="text-sm font-semibold text-gray-300">{report.financialData.roa.toFixed(1)}٪</div>
                        </div>
                      )}
                      {report.financialData.debtToEquity !== undefined && (
                        <div>
                          <div className="text-xs text-gray-500">D/E</div>
                          <div className="text-sm font-semibold text-gray-300">{report.financialData.debtToEquity.toFixed(2)}</div>
                        </div>
                      )}
                      {report.financialData.currentRatio !== undefined && (
                        <div>
                          <div className="text-xs text-gray-500">نسبت جاری</div>
                          <div className="text-sm font-semibold text-gray-300">{report.financialData.currentRatio.toFixed(2)}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button variant="ghost" size="sm" className="text-blue-400 hover:bg-blue-500/10 flex-shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && reports.length > 0 && !isComingSoon && (
        <div className="text-center py-10">
          <Scale className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">هیچ گزارشی با فیلترهای انتخاب‌شده یافت نشد</p>
        </div>
      )}
    </div>
  );
}
