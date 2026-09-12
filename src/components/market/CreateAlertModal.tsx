import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAlertStore, type AlertType } from '../store/alertStore';
import { X } from 'lucide-react';

interface CreateAlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSymbol?: string;
}

export const CreateAlertModal: React.FC<CreateAlertModalProps> = ({
  open,
  onOpenChange,
  defaultSymbol,
}) => {
  const { addAlert } = useAlertStore();
  const [symbol, setSymbol] = useState(defaultSymbol || '');
  const [alertType, setAlertType] = useState<AlertType>('price_above');
  const [threshold, setThreshold] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!symbol || !threshold) {
      return;
    }

    addAlert({
      symbol,
      type: alertType,
      threshold: parseFloat(threshold),
      message: message || undefined,
    });

    // Reset form
    setSymbol('');
    setAlertType('price_above');
    setThreshold('');
    setMessage('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setSymbol('');
    setAlertType('price_above');
    setThreshold('');
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ایجاد هشدار جدید</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* نماد */}
            <div className="space-y-2">
              <Label htmlFor="symbol">نماد</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="مثال: فولاد"
                required
              />
            </div>

            {/* نوع هشدار */}
            <div className="space-y-2">
              <Label htmlFor="alertType">نوع هشدار</Label>
              <Select
                value={alertType}
                onValueChange={(value: AlertType) => setAlertType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب نوع هشدار" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_above">بالاتر رفتن قیمت</SelectItem>
                  <SelectItem value="price_below">پایین‌تر آمدن قیمت</SelectItem>
                  <SelectItem value="volume_spike">افزایش حجم معاملات</SelectItem>
                  <SelectItem value="smart_money">ورود پول هوشمند</SelectItem>
                  <SelectItem value="fundamental_change">تغییر شاخص بنیادی</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* آستانه */}
            <div className="space-y-2">
              <Label htmlFor="threshold">
                {alertType === 'volume_spike' 
                  ? 'ضریب حجم (مثلاً 2 برای دو برابر میانگین)' 
                  : 'آستانه'}
              </Label>
              <Input
                id="threshold"
                type="number"
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder={
                  alertType === 'volume_spike' 
                    ? 'مثال: 2' 
                    : 'مثال: 5000'
                }
                required
              />
            </div>

            {/* پیام سفارشی */}
            <div className="space-y-2">
              <Label htmlFor="message">پیام (اختیاری)</Label>
              <Input
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="پیام دلخواه شما"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              انصراف
            </Button>
            <Button type="submit">
              ایجاد هشدار
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
