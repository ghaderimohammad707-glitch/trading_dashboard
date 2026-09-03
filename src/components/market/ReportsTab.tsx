import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Copy, Download, Send, CheckCircle, XCircle, BarChart3, Printer } from "lucide-react";
import {
  generateDailySummary,
  generateSymbolReport,
  copyToClipboard,
  downloadAsText,
} from "@/lib/reportGenerator";
import {
  getTelegramConfig,
  setTelegramConfig,
  testTelegramConnection,
  sendDailySummaryToTelegram,
  isTelegramConfigured,
} from "@/lib/telegramBot";
import { getEngineAccuracy } from "@/lib/enginePerformance";
import { getSignalStats } from "@/lib/signalHistory";

export function ReportsTab() {
  const [symbol, setSymbol] = useState("");
  const [botToken, setBotToken] = useState(getTelegramConfig().botToken);
  const [chatId, setChatId] = useState(getTelegramConfig().chatId);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeSection, setActiveSection] = useState<"summary" | "symbol" | "telegram" | "engines">("summary");

  const dailySummary = useMemo(() => generateDailySummary(), []);
  const symbolReport = symbol ? generateSymbolReport(symbol) : "";
  const engineAccuracy = useMemo(() => getEngineAccuracy(), []);
  const signalStats = useMemo(() => getSignalStats(), []);

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    alert("کپی شد!");
  };

  const handleExportPDF = useCallback((title: string, content: string) => {
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>${title} — نبض بازار</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Vazirmatn', 'Tahoma', sans-serif; direction: rtl; padding: 40px; color: #1a1a2e; background: white; }
          h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #0f172a; }
          .subtitle { font-size: 12px; color: #64748b; margin-bottom: 24px; }
          .divider { border: none; border-top: 2px solid #e2e8f0; margin: 16px 0; }
          pre { font-family: 'Vazirmatn', monospace; font-size: 13px; line-height: 2; white-space: pre-wrap; direction: rtl; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="subtitle">تاریخ: ${new Date().toLocaleDateString("fa-IR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })} | ساعت: ${new Date().toLocaleTimeString("fa-IR")}</div>
        <hr class="divider">
        <pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        <div class="footer">نبض بازار — دستیار معامله‌گر هوشمند | ${new Date().toLocaleDateString("fa-IR")}</div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (!w) alert("لطفاً popup blocker را غیرفعال کنید");
  }, []);

  const handleTestTelegram = async () => {
    setTelegramConfig(botToken, chatId);
    const result = await testTelegramConnection();
    setTestResult(result);
  };

  const handleSendSummary = async () => {
    const success = await sendDailySummaryToTelegram(dailySummary);
    alert(success ? "خلاصه بازار ارسال شد!" : "خطا در ارسال");
  };

  const sections = [
    { id: "summary" as const, label: "خلاصه بازار", icon: "📊" },
    { id: "symbol" as const, label: "گزارش نماد", icon: "📋" },
    { id: "engines" as const, label: "عملکرد موتورها", icon: "⚙️" },
    { id: "telegram" as const, label: "تلگرام", icon: "📨" },
  ];

  return (
    <div dir="rtl" className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-primary" />
        <h2 className="text-lg font-bold">گزارش‌ها و ارسال</h2>
      </div>

      {/* انتخاب بخش */}
      <div className="flex gap-2">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-all cursor-pointer ${
              activeSection === s.id
                ? "bg-primary/10 text-primary font-medium border border-primary/20"
                : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* خلاصه بازار */}
      {activeSection === "summary" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">📊 خلاصه بازار امروز</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleCopy(dailySummary)} className="gap-1">
                  <Copy className="size-3" /> کپی
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadAsText(dailySummary, `summary-${new Date().toISOString().slice(0, 10)}.txt`)} className="gap-1">
                  <Download className="size-3" /> دانلود
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportPDF("گزارش روزانه بازار", dailySummary)} className="gap-1">
                  <Printer className="size-3" /> PDF
                </Button>
                {isTelegramConfigured() && (
                  <Button size="sm" onClick={handleSendSummary} className="gap-1">
                    <Send className="size-3" /> ارسال به تلگرام
                  </Button>
                )}
              </div>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-6 bg-muted/30 p-4 rounded-lg">
              {dailySummary}
            </pre>
          </div>
        </div>
      )}

      {/* گزارش نماد */}
      {activeSection === "symbol" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">نماد</label>
                <Input dir="ltr" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="مثلاً فولاد" />
              </div>
            </div>
          </div>
          {symbolReport && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">📋 گزارش {symbol}</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopy(symbolReport)} className="gap-1">
                    <Copy className="size-3" /> کپی
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => downloadAsText(symbolReport, `${symbol}-report.txt`)} className="gap-1">
                    <Download className="size-3" /> دانلود
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportPDF(`گزارش تحلیل ${symbol}`, symbolReport)} className="gap-1">
                    <Printer className="size-3" /> PDF
                  </Button>
                </div>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-6 bg-muted/30 p-4 rounded-lg">
                {symbolReport}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* عملکرد موتورها */}
      {activeSection === "engines" && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">⚙️ عملکرد موتورهای تحلیلی</h3>
            {Object.keys(engineAccuracy).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                هنوز داده کافی برای محاسبه دقت موتورها موجود نیست
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(engineAccuracy).map(([engine, data]) => (
                  <div key={engine} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        data.accuracy > 60 ? "bg-emerald-500/10 text-emerald-500" :
                        data.accuracy > 40 ? "bg-amber-500/10 text-amber-500" :
                        "bg-red-500/10 text-red-500"
                      }`}>
                        {data.accuracy.toFixed(0)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{engine}</div>
                        <div className="text-xs text-muted-foreground">
                          {data.correct}/{data.total} درست | میانگین بازده: {data.avgReturn > 0 ? "+" : ""}{data.avgReturn}٪
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <Badge variant={data.recentTrend === "improving" ? "default" : data.recentTrend === "declining" ? "destructive" : "secondary"} className="text-[10px]">
                        {data.recentTrend === "improving" ? "📈 بهبود" : data.recentTrend === "declining" ? "📉 افت" : "➡️ پایدار"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* آمار سیگنال‌ها */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">🎯 آمار سیگنال‌ها</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <div className="text-muted-foreground text-xs">کل سیگنال‌ها</div>
                <div className="font-bold">{signalStats.total}</div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <div className="text-muted-foreground text-xs">نرخ برد</div>
                <div className={`font-bold ${signalStats.winRate > 50 ? "text-emerald-500" : "text-red-500"}`}>
                  {signalStats.winRate}٪
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <div className="text-muted-foreground text-xs">سود متوسط</div>
                <div className={`font-bold ${signalStats.avgPnl > 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {signalStats.avgPnl > 0 ? "+" : ""}{signalStats.avgPnl}٪
                </div>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <div className="text-muted-foreground text-xs">در انتظار</div>
                <div className="font-bold text-amber-500">{signalStats.pending}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* تلگرام */}
      {activeSection === "telegram" && (
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold">📨 تنظیمات تلگرام</h3>
          <p className="text-xs text-muted-foreground">
            برای ارسال خودکار سیگنال‌ها به تلگرام، ربات بسازید و Chat ID را وارد کنید.
          </p>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">توکن ربات</label>
            <Input dir="ltr" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456:ABC-DEF..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Chat ID</label>
            <Input dir="ltr" value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="-1001234567890" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleTestTelegram} variant="outline" className="gap-1">
              <Send className="size-3" /> تست اتصال
            </Button>
          </div>
          {testResult && (
            <div className={`flex items-center gap-2 text-sm ${testResult.success ? "text-emerald-500" : "text-red-500"}`}>
              {testResult.success ? <CheckCircle className="size-4" /> : <XCircle className="size-4" />}
              {testResult.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
