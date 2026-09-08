import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SEGMENT_BY_VALUE, type SegmentType } from "@/lib/clientFetch";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BellRing,
  CandlestickChart,
  ChevronLeft,
  Coins,
  Layers,
  LineChart,
  Newspaper,
  PieChart,
  Radar,
  Shield,
  Sigma,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

const SEGMENTS = [
  { value: "tse", shortLabel: "بورس", label: "بورس تهران", description: "شرکت‌های بزرگ و بنیادی", icon: TrendingUp },
  { value: "ifb", shortLabel: "فرابورس", label: "فرابورس ایران", description: "بازار دوم و شرکت‌های کوچک", icon: BarChart3 },
  { value: "fund", shortLabel: "صندوق", label: "صندوق‌های سرمایه‌گذاری", description: "صندوق‌های ETF و گردان", icon: PieChart },
  { value: "option", shortLabel: "اختیار", label: "اختیار معامله", description: "ابزارهای مشتقه", icon: Target },
  { value: "commodity", shortLabel: "کالا", label: "مرز کالا", description: "قیمت‌های جهانی", icon: Coins },
];

/* ═══════════════════════════════════════════════════════
   SIMULATED TICKER TAPE
   ═══════════════════════════════════════════════════════ */
const tickerItems = [
  { symbol: "فولاد", change: 2.3, price: "۱۲,۴۵۰" },
  { symbol: "فملی", change: -1.1, price: "۸,۲۳۰" },
  { symbol: "خودرو", change: 4.9, price: "۳,۸۷۰" },
  { symbol: "شپنا", change: 0.8, price: "۱۵,۶۰۰" },
  { symbol: "شبندر", change: -2.5, price: "۱۱,۲۰۰" },
  { symbol: "فولاد", change: 2.3, price: "۱۲,۴۵۰" },
  { symbol: "فملی", change: -1.1, price: "۸,۲۳۰" },
  { symbol: "خودرو", change: 4.9, price: "۳,۸۷۰" },
  { symbol: "شپنا", change: 0.8, price: "۱۵,۶۰۰" },
  { symbol: "شبندر", change: -2.5, price: "۱۱,۲۰۰" },
];

/* ═══════════════════════════════════════════════════════
   SIMULATED ORDER BOOK
   ═══════════════════════════════════════════════════════ */
const orderBook = [
  { bid: 12450, bidVol: 125000, ask: 12500, askVol: 89000 },
  { bid: 12440, bidVol: 98000, ask: 12510, askVol: 67000 },
  { bid: 12430, bidVol: 234000, ask: 12520, askVol: 45000 },
  { bid: 12420, bidVol: 56000, ask: 12530, askVol: 123000 },
  { bid: 12410, bidVol: 189000, ask: 12540, askVol: 78000 },
];

/* ═══════════════════════════════════════════════════════
   FEATURE DATA
   ═══════════════════════════════════════════════════════ */
const features = [
  {
    icon: CandlestickChart,
    title: "دادهٔ لحظه‌ای بازار",
    desc: "قیمت، حجم، ارزش معاملات و جزئیات کامل ۳۰۰۰+ نماد از TSETMC.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Radar,
    title: "موتور تابلوخوانی",
    desc: "تحلیل صف خرید/فروش، عمق بازار، توازن تقاضا و عرضه.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: LineChart,
    title: "تحلیل تکنیکال",
    desc: "تشخیص روند، الگوهای کندلی، گپ، مومنتوم و اشباع خرید/فروش.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: Sigma,
    title: "یونانی‌های اختیار",
    desc: "محاسبه دلتا، گاما، تتا، وگا و ارزش ذاتی/زمانی قراردادها.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Wallet,
    title: "پایش پرتفوی",
    desc: "ارزیابی مداوم سبد توسط موتورهای تحلیلی و توصیه اصلاحی.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Zap,
    title: "مغز تصمیم‌گیرنده",
    desc: "ترکیب ۵ موتور تحلیلی با وزن‌دهی پویا و نمره اطمینان.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
];

const stats = [
  { value: "۳,۲۰۰+", label: "نماد فعال", icon: TrendingUp },
  { value: "۵", label: "موتور تحلیل", icon: Radar },
  { value: "۲۴/۷", label: "پایش بازار", icon: Activity },
  { value: "۰٪", label: "هزینه", icon: Coins },
];

/* ═══════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════ */

function TickerTape() {
  return (
    <div className="relative overflow-hidden border-b bg-card/50 py-2">
      <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap">
        {[...tickerItems, ...tickerItems].map((item, i) => (
          <div key={i} className="inline-flex items-center gap-2 px-4">
            <span className="text-xs font-bold">{item.symbol}</span>
            <span dir="ltr" className="text-xs font-semibold tabular-nums-fa">{item.price}</span>
            <span className={`text-[10px] font-semibold ${item.change > 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {item.change > 0 ? "+" : ""}{item.change}٪
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderBookPreview() {
  const maxVol = Math.max(...orderBook.map(o => Math.max(o.bidVol, o.askVol)));
  return (
    <div className="rounded-2xl border border-border/40 bg-card/80 p-4 font-mono">
      <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
        <Layers className="size-3.5" />
        عمق بازار (نمونه)
      </div>
      <div className="space-y-1">
        {[...orderBook].reverse().map((row, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px]">
            <div className="flex-1 text-right">
              <div className="relative">
                <div className="absolute left-0 top-0 h-full bg-emerald-500/10 rounded" style={{ width: `${(row.bidVol / maxVol) * 100}%` }} />
                <span className="relative z-10 px-1 text-emerald-400">{row.bidVol.toLocaleString("fa-IR")}</span>
              </div>
            </div>
            <span dir="ltr" className="w-14 text-center text-muted-foreground">{row.bid.toLocaleString("fa-IR")}</span>
            <span dir="ltr" className="w-14 text-center text-muted-foreground">{row.ask.toLocaleString("fa-IR")}</span>
            <div className="flex-1">
              <div className="relative">
                <div className="absolute right-0 top-0 h-full bg-rose-500/10 rounded" style={{ width: `${(row.askVol / maxVol) * 100}%` }} />
                <span className="relative z-10 px-1 text-rose-400">{row.askVol.toLocaleString("fa-IR")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground mt-2 px-1">
        <span>🟢 حجم خرید</span>
        <span>🔴 حجم فروش</span>
      </div>
    </div>
  );
}

function SignalPreview() {
  const signals = [
    { symbol: "فولاد", signal: "خرید", strength: 78, color: "text-emerald-400" },
    { symbol: "خودرو", signal: "خرید", strength: 65, color: "text-emerald-400" },
    { symbol: "فملی", signal: "فروش", strength: 45, color: "text-rose-400" },
    { symbol: "شپنا", signal: "نگهداری", strength: 52, color: "text-muted-foreground" },
  ];
  return (
    <div className="rounded-2xl border border-border/40 bg-card/80 p-4">
      <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
        <Target className="size-3.5" />
        سیگنال‌های هوشمند (نمونه)
      </div>
      <div className="space-y-2.5">
        {signals.map((s) => (
          <div key={s.symbol} className="flex items-center gap-2">
            <span className="text-xs font-bold w-12">{s.symbol}</span>
            <div className="flex-1 h-1.5 rounded-full bg-muted/30">
              <div className={`h-full rounded-full ${s.signal === "خرید" ? "bg-emerald-500" : s.signal === "فروش" ? "bg-rose-500" : "bg-muted-foreground/40"}`} style={{ width: `${s.strength}%` }} />
            </div>
            <span className={`text-[10px] font-semibold w-14 text-left ${s.color}`}>{s.signal}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* ═══ Ticker Tape ═══ */}
      <TickerTape />

      {/* ═══ Nav ═══ */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm">
              <Activity className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-base tracking-tight">نبض بازار</div>
              <div className="text-[10px] text-muted-foreground">داشبورد معاملاتی بورس ایران</div>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">قابلیت‌ها</a>
            <a href="#markets" className="transition-colors hover:text-foreground">بازارها</a>
            <a href="#stats" className="transition-colors hover:text-foreground">آمار</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="gap-1.5 rounded-xl">
              <Link to="/dashboard">
                ورود
                <ChevronLeft className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden">
        {/* Background grid pattern */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(oklch(0.955_0.004_250_/_0.03)_1px,transparent_1px),linear-gradient(90deg,oklch(0.955_0.004_250_/_0.03)_1px,transparent_1px)] bg-[size:40px_40px] dark:bg-[linear-gradient(oklch(0.955_0.004_250_/_0.05)_1px,transparent_1px),linear-gradient(90deg,oklch(0.955_0.004_250_/_0.05)_1px,transparent_1px)]" />
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -top-32 right-1/4 size-96 rounded-full bg-primary/8 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 size-72 rounded-full bg-emerald-500/6 blur-[100px]" />

        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12 px-4 py-20 md:flex-row md:py-28">
          {/* Left text */}
          <div className="flex-1 flex flex-col items-center gap-6 text-center md:items-start md:text-right">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge variant="secondary" className="gap-1.5 px-4 py-1.5 text-xs">
                <Sparkles className="size-3.5 text-primary" />
                نسخه اول — داشبورد بازار
              </Badge>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              <span className="block text-muted-foreground/70 text-2xl md:text-3xl font-medium mb-2">معامله با چشم باز</span>
              <span className="block">نبض بازار را</span>
              <span className="bg-gradient-to-l from-primary via-emerald-400 to-primary bg-clip-text text-transparent"> لحظه‌ای </span>
              <span className="block">ببینید</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="max-w-lg text-sm leading-7 text-muted-foreground md:text-base">
              ۳,۲۰۰+ نماد بورسی با ۵ موتور تحلیل هوشمند. تکنیکال، بنیادی، حجمی، تابلوخوانی و
              مغز تصمیم‌گیرنده — همه در یک داشبورد.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }} className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2 rounded-xl px-8">
                <Link to="/dashboard">
                  شروع رایگان
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl px-8">
                <a href="#features">قابلیت‌ها</a>
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }} className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1"><Shield className="size-3.5 text-emerald-500" /> رایگان و امن</span>
              <span className="flex items-center gap-1"><Zap className="size-3.5 text-amber-500" /> بدون نیاز به نصب</span>
              <span className="flex items-center gap-1"><Layers className="size-3.5 text-blue-500" /> داده واقعی</span>
            </motion.div>
          </div>

          {/* Right visual — Order book + Signal */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="flex-1 max-w-md w-full space-y-3">
            <OrderBookPreview />
            <SignalPreview />
          </motion.div>
        </div>
      </section>

      {/* ═══ Stats ═══ */}
      <section id="stats" className="border-y bg-muted/20">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px md:grid-cols-4">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.08 }} className="flex items-center gap-3 bg-background px-6 py-5">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div>
                  <div dir="ltr" className="text-2xl font-bold tabular-nums-fa">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section id="features" className="mx-auto max-w-6xl flex flex-col gap-10 px-4 py-16">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">ابزارهای حرفه‌ای معامله</h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            هر آنچه برای تصمیم‌گیری هوشمندانه نیاز دارید، در یک نگاه.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: i * 0.08 }} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/60 p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-lg">
                <div className={`flex size-11 items-center justify-center rounded-xl ${f.bg}`}>
                  <Icon className={`size-5 ${f.color}`} />
                </div>
                <div className="font-bold tracking-tight">{f.title}</div>
                <p className="text-sm leading-6 text-muted-foreground">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═══ Markets ═══ */}
      <section id="markets" className="border-y bg-muted/20">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">پوشش کامل بازارها</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              هر بازار در تب مجزا با جزئیات کامل، فیلتر و جستجو.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {SEGMENTS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.value} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.08 }} whileHover={{ y: -4, scale: 1.02 }} className="flex flex-col items-center gap-3 rounded-2xl border border-border/40 bg-card/60 p-5 text-center transition-all duration-300 hover:border-primary/20 hover:shadow-md">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="font-bold tracking-tight">{s.shortLabel}</div>
                  <p className="text-xs leading-5 text-muted-foreground">{s.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="flex flex-col items-center gap-5">
            <h2 className="text-2xl font-bold md:text-3xl">آماده‌اید؟</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              همین الان وارد داشبورد شوید و داده‌های واقعی بازار را ببینید.
            </p>
            <Button asChild size="lg" className="gap-2 rounded-xl px-10">
              <Link to="/dashboard">
                ورود به داشبورد بازار
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Activity className="size-4" />
            نبض بازار — نسخه ۱.۰
          </span>
          <span>داشبورد معاملاتی بازار بورس ایران</span>
        </div>
      </footer>
    </div>
  );
}
