import { motion } from "framer-motion";
import { 
  CandlestickChart, Radar, LineChart, Sigma, Wallet, Zap,
  TrendingUp, Activity, BellRing, Shield, Layers, Target,
  Brain, Cpu, Sparkles, ArrowRight, BarChart3, Globe2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const features = [
  {
    icon: CandlestickChart,
    title: "دادهٔ لحظه‌ای بازار",
    desc: "قیمت، حجم، ارزش معاملات و جزئیات کامل ۳۰۰۰+ نماد از TSETMC.",
    color: "from-emerald-400 to-cyan-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/20",
  },
  {
    icon: Radar,
    title: "موتور تابلوخوانی",
    desc: "تحلیل صف خرید/فروش، عمق بازار، توازن تقاضا و عرضه.",
    color: "from-blue-400 to-indigo-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    glow: "shadow-blue-500/20",
  },
  {
    icon: LineChart,
    title: "تحلیل تکنیکال",
    desc: "تشخیص روند، الگوهای کندلی، گپ، مومنتوم و اشباع خرید/فروش.",
    color: "from-violet-400 to-purple-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    glow: "shadow-violet-500/20",
  },
  {
    icon: Sigma,
    title: "یونانی‌های اختیار",
    desc: "محاسبه دلتا، گاما، تتا، وگا و ارزش ذاتی/زمانی قراردادها.",
    color: "from-amber-400 to-orange-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/20",
  },
  {
    icon: Wallet,
    title: "پایش پرتفوی",
    desc: "ارزیابی مداوم سبد توسط موتورهای تحلیلی و توصیه اصلاحی.",
    color: "from-cyan-400 to-sky-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/20",
  },
  {
    icon: Brain,
    title: "هوش مصنوعی",
    desc: "ترکیب ۵ موتور تحلیلی با وزن‌دهی پویا و نمره اطمینان.",
    color: "from-rose-400 to-pink-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    glow: "shadow-rose-500/20",
  },
];

const stats = [
  { value: "۳,۲۰۰+", label: "نماد فعال", icon: TrendingUp, trend: "+۱۲٪" },
  { value: "۵", label: "موتور تحلیل", icon: Cpu, trend: "AI-Powered" },
  { value: "۲۴/۷", label: "پایش بازار", icon: Activity, trend: "Real-time" },
  { value: "۰٪", label: "هزینه", icon: Shield, trend: "Free Forever" },
];

const advancedFeatures = [
  {
    icon: Brain,
    title: "سیگنال‌های هوشمند",
    desc: "ترکیب داده‌های لحظه‌ای با الگوریتم‌های یادگیری ماشین برای شناسایی بهترین فرصت‌های معاملاتی",
    items: ["تشخیص خودکار الگوها", "نمره اطمینان سیگنال", "مدیریت ریسک هوشمند"],
    gradient: "from-rose-500 via-pink-500 to-purple-500",
  },
  {
    icon: BarChart3,
    title: "تابلوخوانی پیشرفته",
    desc: "تحلیل رفتار بازیگران بازار، شناسایی جریان پول هوشمند و ردیابی معاملات بزرگ",
    items: ["ردیابی پول هوشمند", "تحلیل صف‌های خرید و فروش", "شناسایی حمایت و مقاومت"],
    gradient: "from-blue-500 via-cyan-500 to-emerald-500",
  },
  {
    icon: Globe2,
    title: "تحلیل چندبازاره",
    desc: "پایش همزمان بورس، فرابورس، کالا و ارز دیجیتال با امکان مقایسه و آربیتراژ",
    items: ["بورس تهران", "فرابورس ایران", "بازار جهانی"],
    gradient: "from-amber-500 via-orange-500 to-red-500",
  },
];

export function FeaturesSection() {
  return (
    <>
      {/* Stats Section with Enhanced Design */}
      <section className="relative border-y bg-gradient-to-b from-muted/30 to-transparent overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px md:grid-cols-4 relative z-10">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group relative flex flex-col items-center gap-3 bg-background/50 backdrop-blur-sm px-6 py-8 hover:bg-background/80 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-lg"
                >
                  <Icon className="size-7" />
                </motion.div>
                <div className="text-center relative z-10">
                  <motion.div 
                    dir="ltr" 
                    className="text-3xl font-black bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent"
                    initial={{ scale: 0.8 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1, type: "spring" }}
                  >
                    {s.value}
                  </motion.div>
                  <div className="text-sm font-medium text-muted-foreground">{s.label}</div>
                  <Badge variant="secondary" className="mt-2 text-xs bg-primary/10 text-primary border-primary/20">
                    {s.trend}
                  </Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Main Features Section */}
      <section id="features" className="mx-auto max-w-6xl flex flex-col gap-12 px-4 py-20">
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="secondary" className="gap-2 px-4 py-1.5 text-sm border-primary/30 bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
              قابلیت‌های منحصر به فرد
            </Badge>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold md:text-4xl lg:text-5xl bg-gradient-to-l from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent"
          >
            ابزارهای حرفه‌ای معامله
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl text-base text-muted-foreground leading-7"
          >
            هر آنچه برای تصمیم‌گیری هوشمندانه نیاز دارید، در یک نگاه. ترکیبی از تکنولوژی و تجربه.
          </motion.p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`group relative flex flex-col gap-4 rounded-3xl border ${f.border} bg-card/40 p-7 transition-all duration-500 hover:shadow-2xl ${f.glow} overflow-hidden`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className={`absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br ${f.color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500`} />
                <motion.div 
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  className={`relative flex size-14 items-center justify-center rounded-2xl ${f.bg} backdrop-blur-sm border ${f.border}`}
                >
                  <Icon className={`size-7 bg-gradient-to-br ${f.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
                </motion.div>
                <div className="relative">
                  <div className="font-bold text-lg tracking-tight mb-2">{f.title}</div>
                  <p className="text-sm leading-6 text-muted-foreground/90">{f.desc}</p>
                </div>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                  className={`h-1 rounded-full bg-gradient-to-r ${f.color} opacity-50 group-hover:opacity-100 transition-opacity`}
                />
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Advanced Features Section */}
      <section className="relative mx-auto max-w-6xl px-4 py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="relative">
          <div className="flex flex-col items-center gap-4 text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Badge variant="secondary" className="gap-2 px-4 py-1.5 text-sm border-primary/30 bg-primary/10">
                <Cpu className="w-4 h-4 text-primary" />
                تکنولوژی پیشرفته
              </Badge>
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-bold md:text-4xl lg:text-5xl"
            >
              چرا نبض بازار؟
            </motion.h2>
          </div>
          
          <div className="grid gap-8 lg:grid-cols-3">
            {advancedFeatures.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  whileHover={{ y: -8 }}
                  className="group relative rounded-3xl border border-border/50 bg-card/30 backdrop-blur-xl p-8 overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                  <div className={`absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br ${feature.gradient} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500`} />
                  
                  <div className="relative">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`inline-flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 mb-6 shadow-xl`}
                    >
                      <div className="size-full rounded-2xl bg-card flex items-center justify-center">
                        <Icon className={`size-8 bg-gradient-to-br ${feature.gradient} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent' }} />
                      </div>
                    </motion.div>
                    
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-7 mb-6">{feature.desc}</p>
                    
                    <ul className="space-y-3">
                      {feature.items.map((item, j) => (
                        <motion.li
                          key={item}
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + j * 0.1 }}
                          className="flex items-center gap-3 text-sm"
                        >
                          <div className={`size-5 rounded-full bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}>
                            <ArrowRight className="size-3 text-white" />
                          </div>
                          <span className="text-foreground/80">{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative mx-auto max-w-6xl px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-12 text-center"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, delay: 1 }}
            className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[80px]"
          />
          
          <div className="relative z-10">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold md:text-4xl mb-4"
            >
              آماده شروع هستید؟
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="max-w-2xl mx-auto text-muted-foreground mb-8"
            >
              همین الان وارد داشبورد شوید و قدرت تحلیل هوشمند را تجربه کنید.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <Button asChild size="lg" className="gap-3 px-10 h-14 text-lg rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300">
                <Link to="/dashboard">
                  ورود به داشبورد
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
