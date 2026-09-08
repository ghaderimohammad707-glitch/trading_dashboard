import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowLeft, Sparkles, Zap, Shield, Layers, Star, Users, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useRef } from "react";

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="relative overflow-hidden min-h-screen flex items-center">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:60px_60px] opacity-[0.05]" />
      
      {/* Animated Orbs */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3], rotate: [0, 180, 360] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-[120px]"
      />
      <motion.div 
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2], x: [0, 50, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-full blur-[150px]"
      />
      <motion.div 
        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15], y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-violet-500/5 to-purple-500/5 rounded-full blur-[200px]"
      />

      {/* Floating Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/30 rounded-full"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0, 0.5, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            style={{ y, opacity }}
            className="flex flex-col gap-8 text-right"
          >
            {/* Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="secondary" className="gap-2 px-5 py-2.5 text-sm mb-6 border-primary/30 bg-primary/10 backdrop-blur-sm shadow-lg">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span>نسخه جدید — هوش مصنوعی پیشرفته</span>
              </Badge>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight tracking-tight"
            >
              <span className="block text-muted-foreground/70 text-xl sm:text-2xl font-medium mb-6 flex items-center gap-3">
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                انقلاب در معامله‌گری بورس
              </span>
              <span className="block">نبض بازار را</span>
              <span className="bg-gradient-to-l from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">هوشمندانه</span>
              <span className="block">تصمیم بگیرید</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground/90 leading-9 max-w-xl"
            >
              اولین پلتفرم تحلیل بازار با هوش مصنوعی پیشرفته. ترکیب داده‌های لحظه‌ای، 
              تحلیل تکنیکال خودکار و سیگنال‌های هوشمند برای تصمیم‌گیری بهتر در بورس ایران.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Button asChild size="lg" className="group gap-3 px-10 h-14 text-base rounded-2xl shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-500">
                <Link to="/dashboard">
                  شروع رایگان
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="gap-3 px-10 h-14 text-base rounded-2xl border-2 hover:bg-primary/5 transition-all duration-300">
                <a href="#features">مشاهده قابلیت‌ها</a>
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-wrap gap-8 pt-6 border-t border-border/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-emerald-500/30">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold text-foreground">امن و مطمئن</div>
                  <div className="text-xs text-muted-foreground">داده‌های رسمی TSETMC</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center border border-amber-500/30">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="font-bold text-foreground">بدون نیاز به نصب</div>
                  <div className="text-xs text-muted-foreground">دسترسی آنلاین</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center border border-blue-500/30">
                  <Layers className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <div className="font-bold text-foreground">داده واقعی</div>
                  <div className="text-xs text-muted-foreground">بروزرسانی لحظه‌ای</div>
                </div>
              </div>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex items-center gap-6 pt-4"
            >
              <div className="flex -space-x-3 space-x-reverse">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 border-2 border-background flex items-center justify-center text-xs font-bold text-primary-foreground"
                  >
                    {["۱", "۲", "۳", "۴", "۵"][i]}
                  </motion.div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">اعتماد بیش از ۳۰۰۰+ کاربر فعال</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Side - Interactive Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Main Signal Card */}
              <motion.div
                animate={{ y: [-15, 15, -15] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10 rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-8 shadow-2xl shadow-primary/10"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      whileHover={{ rotate: 12, scale: 1.1 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"
                    >
                      <Zap className="w-8 h-8 text-primary-foreground" />
                    </motion.div>
                    <div>
                      <div className="font-bold text-xl">سیگنال هوشمند</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        بروزرسانی لحظه‌ای
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-4 py-1.5">فعال</Badge>
                </div>

                {/* Signal List */}
                <div className="space-y-4">
                  {[
                    { symbol: "فولاد", signal: "خرید قوی", strength: 92, change: "+۵.۲٪" },
                    { symbol: "فملی", signal: "خرید", strength: 78, change: "+۳.۸٪" },
                    { symbol: "خودرو", signal: "نگهداری", strength: 55, change: "+۱.۲٪" },
                    { symbol: "شستا", signal: "فروش", strength: 35, change: "-۲.۱٪" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.symbol}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.15 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="group flex items-center gap-5 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer border border-transparent hover:border-primary/20"
                    >
                      <div className="w-20 font-bold text-lg">{item.symbol}</div>
                      <div className="flex-1">
                        <div className="h-4 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.strength}%` }}
                            transition={{ duration: 1.5, delay: 1 + i * 0.2, ease: "easeOut" }}
                            className={`h-full rounded-full bg-gradient-to-r ${
                              item.strength > 70 ? 'from-emerald-500 to-emerald-400' :
                              item.strength > 50 ? 'from-amber-500 to-amber-400' :
                              'from-rose-500 to-rose-400'
                            }`}
                          />
                        </div>
                      </div>
                      <div className={`w-28 text-left font-semibold ${
                        item.strength > 70 ? 'text-emerald-400' :
                        item.strength > 50 ? 'text-amber-400' :
                        'text-rose-400'
                      }`}>
                        {item.signal}
                      </div>
                      <div className={`text-sm font-bold ${item.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.change}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Footer Stats */}
                <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Award className="w-4 h-4 text-primary" />
                    <span>دقت سیگنال‌ها: ۸۷٪</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4 text-primary" />
                    <span>۳,۲۰۰+ کاربر فعال</span>
                  </div>
                </div>
              </motion.div>

              {/* Floating Stats Cards */}
              <motion.div
                animate={{ y: [0, -25, 0], rotate: [0, 8, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-6 shadow-2xl z-20"
              >
                <div className="text-3xl font-black text-emerald-400">+۱۲.۵٪</div>
                <div className="text-sm text-muted-foreground">رشد میانگین پرتفو</div>
                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>نسبت به بازار</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 20, 0], rotate: [0, -8, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-6 -left-6 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl p-5 shadow-2xl z-20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-sm font-bold">۳,۲۰۰+ نماد فعال</div>
                    <div className="text-xs text-muted-foreground">پایش لحظه‌ای</div>
                  </div>
                </div>
              </motion.div>

              {/* Decorative Elements */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-dashed border-primary/20 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-dashed border-primary/10 rounded-full"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
