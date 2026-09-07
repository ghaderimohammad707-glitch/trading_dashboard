import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { getCachedInstruments } from "@/lib/clientFetch";

interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (alert: any) => void;
  instruments?: any[];
}

const ALERT_TYPES = [
  { type: "price_above", label: "قیمت بالای" },
  { type: "price_below", label: "قیمت زیر" },
  { type: "change_up", label: "افزایش بیش از (٪)" },
  { type: "change_down", label: "کاهش بیش از (٪)" },
  { type: "volume_spike", label: "افزایش حجم" },
  { type: "signal_buy", label: "سیگنال خرید" },
  { type: "signal_sell", label: "سیگنال فروش" },
];

export function AlertModal({ open, onOpenChange, onAdd }: Omit<AlertModalProps, 'instruments'>) {
  const [symbol, setSymbol] = useState("");
  const [alertType, setAlertType] = useState("price_above");
  const [targetValue, setTargetValue] = useState("");
  const [channels, setChannels] = useState<string[]>(["alarm"]);
  const [instruments, setInstruments] = useState<any[]>([]);

  // Load instruments from cache when modal opens
  useEffect(() => {
    if (open) {
      const cached = getCachedInstruments();
      setInstruments(cached.length > 0 ? cached : []);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !targetValue) return;

    onAdd({
      symbol,
      alertType,
      targetValue: parseFloat(targetValue),
      isActive: true,
      isTriggered: false,
      channels,
    });

    // Reset form
    setSymbol("");
    setAlertType("price_above");
    setTargetValue("");
    setChannels(["alarm"]);
  };

  const toggleChannel = (ch: string) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ایجاد هشدار جدید</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="symbol">نماد</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب نماد" />
              </SelectTrigger>
              <SelectContent>
                {instruments.slice(0, 100).map(inst => (
                  <SelectItem key={inst.symbol} value={inst.symbol}>
                    {inst.name} ({inst.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="alertType">نوع هشدار</Label>
            <Select value={alertType} onValueChange={setAlertType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_TYPES.map(t => (
                  <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="targetValue">مقدار هدف</Label>
            <Input
              id="targetValue"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="0"
              dir="ltr"
            />
          </div>

          <div>
            <Label>کانال‌های اطلاع‌رسانی</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { id: "alarm", label: "آلارم" },
                { id: "email", label: "ایمیل" },
                { id: "sms", label: "پیامک" },
                { id: "telegram", label: "تلگرام" },
              ].map(ch => (
                <div key={ch.id} className="flex items-center gap-2">
                  <Checkbox
                    id={ch.id}
                    checked={channels.includes(ch.id)}
                    onCheckedChange={() => toggleChannel(ch.id)}
                  />
                  <Label htmlFor={ch.id} className="text-sm">{ch.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={!symbol || !targetValue}>
              <Bell className="size-4 ml-1" />
              ایجاد هشدار
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
