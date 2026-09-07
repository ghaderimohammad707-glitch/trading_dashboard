import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import { Activity, ArrowLeft, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

export default function LandingNew() {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm"
            >
              <Activity className="size-5" />
            </motion.div>
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

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* CTA Section */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-5"
          >
            <h2 className="text-2xl font-bold md:text-3xl">آماده‌اید؟</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              همین الان وارد داشبورد شوید و داده‌های واقعی بازار را ببینید.
            </p>
            <Button asChild size="lg" className="gap-2 rounded-xl px-10 shadow-lg shadow-primary/20">
              <Link to="/dashboard">
                ورود به داشبورد بازار
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
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
