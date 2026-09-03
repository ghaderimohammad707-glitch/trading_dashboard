/**
 * هشدار ریسک — نمایش در اولین بازدید
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "nabz_disclaimer_dismissed";

export function RiskDisclaimer() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (!dismissed) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="max-w-lg w-full rounded-2xl border border-amber-500/30 bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10">
                <AlertTriangle className="size-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-amber-500">⚠️ هشدار ریسک</h3>
                <p className="text-xs text-muted-foreground">لطفاً قبل از استفاده بخوانید</p>
              </div>
              <Button variant="ghost" size="sm" onClick={dismiss} className="mr-auto">
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">نبض بازار</strong> یک ابزار کمکی برای تحلیل بازار است
                و <strong className="text-red-500">هیچ تضمینی برای دقت سیگنال‌ها</strong> ارائه نمی‌دهد.
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>سیگنال‌ها بر اساس الگوریتم‌های تکنیکال و بنیادی تولید می‌شوند اما <strong>پیشنهاد خرید یا فروش نیستند</strong></li>
                <li>بازار سرمایه دارای ریسک است و ممکن است بخشی یا کل سرمایه خود را از دست بدهید</li>
                <li>قبل از هر تصمیم معاملاتی، با یک مشاور مالی معتبر مشورت کنید</li>
                <li>این ابزار جایگزین تحقیق شخصی و تحلیل مستقل شما نیست</li>
              </ul>
              <p className="text-[10px] text-muted-foreground/60">
                با کلیک روی «متوجه شدم»، این هشدار را تأیید کرده و مسئولیت تصمیمات معاملاتی خود را می‌پذیرید.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <Button onClick={dismiss} className="flex-1 gap-2">
                <AlertTriangle className="size-4" />
                متوجه شدم
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
