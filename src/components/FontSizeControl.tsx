import { useState } from "react";
import { useFontSize } from "@/lib/fontSize";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Type, Plus, Minus, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FontSizeControl() {
  const { base, setBase, resetAll } = useFontSize();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-1.5 text-xs h-8"
        title="تنظیمات اندازه فونت"
      >
        <Type className="size-3.5" />
        <span className="hidden sm:inline">{base}px</span>
        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl p-4"
          >
            <div className="text-xs font-semibold text-muted-foreground mb-3">تنظیمات فونت</div>

            {/* Global font size */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-muted-foreground">اندازه فونت کلی</span>
                <span className="text-[11px] font-bold tabular-nums-fa" dir="ltr">{base}px</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="size-7 p-0"
                  onClick={() => setBase(base - 1)}
                  disabled={base <= 10}
                >
                  <Minus className="size-3" />
                </Button>
                <input
                  type="range"
                  min={10}
                  max={22}
                  value={base}
                  onChange={(e) => setBase(Number(e.target.value))}
                  className="flex-1 h-1 accent-primary"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="size-7 p-0"
                  onClick={() => setBase(base + 1)}
                  disabled={base >= 22}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
              {/* Preset buttons */}
              <div className="flex gap-1 mt-2">
                {[
                  { label: "کوچک", value: 11 },
                  { label: "پیش‌فرض", value: 14 },
                  { label: "بزرگ", value: 16 },
                  { label: "خیلی بزرگ", value: 19 },
                ].map((preset) => (
                  <Button
                    key={preset.value}
                    variant={base === preset.value ? "default" : "outline"}
                    size="sm"
                    className="flex-1 h-6 text-[9px]"
                    onClick={() => setBase(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Preview text */}
            <div className="mb-4 rounded-lg bg-muted/30 p-3">
              <div className="text-[10px] text-muted-foreground mb-1">پیش‌نمایش:</div>
              <p style={{ fontSize: `${base}px` }} className="text-foreground font-bold leading-tight">
                سکه امامی — ۷۲,۵۰۰,۰۰۰ تومان
              </p>
              <p style={{ fontSize: `${Math.max(10, base - 2)}px` }} className="text-muted-foreground mt-1">
                تغییر: +۱.۲٪ | حجم: ۱۲,۳۴۵
              </p>
            </div>

            {/* Reset */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs gap-1.5 text-muted-foreground"
              onClick={resetAll}
            >
              <RotateCcw className="size-3" />
              بازگشت به پیش‌فرض
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
