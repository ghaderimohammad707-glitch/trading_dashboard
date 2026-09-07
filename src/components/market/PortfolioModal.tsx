import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { Plus, Upload, Search, X } from "lucide-react";
import { getCachedInstruments } from "@/lib/clientFetch";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface PortfolioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: any) => void;
  onImport?: (items: any[]) => void;
}

export function PortfolioModal({ open, onOpenChange, onAdd, onImport }: PortfolioModalProps) {
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [avgBuyPrice, setAvgBuyPrice] = useState("");
  const [segment, setSegment] = useState("tse");
  const [notes, setNotes] = useState("");
  const [instruments, setInstruments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load instruments from cache when modal opens
  useEffect(() => {
    if (open) {
      const cached = getCachedInstruments();
      setInstruments(cached.length > 0 ? cached : []);
    }
  }, [open]);

  // Filter instruments based on search query
  const filteredInstruments = instruments.filter(inst => 
    searchQuery === "" || 
    inst.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !quantity || !avgBuyPrice) return;

    onAdd({
      symbol,
      quantity: parseFloat(quantity),
      avgBuyPrice: parseFloat(avgBuyPrice),
      segment,
      notes,
    });

    // Reset form
    setSymbol("");
    setQuantity("");
    setAvgBuyPrice("");
    setSegment("tse");
    setNotes("");
    setShowSearch(false);
    setSearchQuery("");
  };

  const handleSelectInstrument = (inst: any) => {
    setSymbol(inst.symbol);
    setSegment(inst.segment === "tse" || inst.segment === "ifb" ? inst.segment : "tse");
    setShowSearch(false);
    setSearchQuery("");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error("فایل اکسل خالی است");
          return;
        }

        console.log("Imported Excel Data:", jsonData.slice(0, 3)); // Debug log

        // Map Excel columns to portfolio items - تطبیق دقیق ستون‌های اکسل
        const importedItems = jsonData.map((row: any, index: number) => {
          // پشتیبانی از نام‌های مختلف ستون نماد
          const symbolCol = row["نام نماد"] || row["نماد"] || row["symbol"] || row["Symbol"] || row["SYMBOL"];
          
          // پشتیبانی از نام‌های مختلف ستون تعداد دارایی
          const quantityCol = row["تعداد دارایی"] || row["تعداد سهام"] || row["quantity"] || row["Quantity"] || 
                             row["تعداد کل سهام خریداری شده"] || 0;
          
          // پشتیبانی از نام‌های مختلف ستون قیمت میانگین خرید
          const avgBuyPriceCol = row["قیمت میانگین خرید در آخرین دوره با لحاظ کارمزد"] || 
                                 row["قیمت میانگین خرید"] || 
                                 row["قیمت سر به سر بر حسب میانگین خرید در آخرین دوره"] ||
                                 row["قیمت میانگین کل خرید با لحاظ کارمزد"] ||
                                 row["avgBuyPrice"] || 
                                 row["AverageBuyPrice"] || 
                                 row["AVGBUYPRICE"] || 0;
          
          // تشخیص بازار از روی نام نماد یا ستون بازار
          let segmentCol = row["بازار"] || row["segment"] || "tse";
          if (!row["بازار"] && symbolCol) {
            // تشخیص خودکار بازار از روی نماد
            const sym = String(symbolCol).trim();
            if (sym.endsWith("صندوق") || sym.includes("صندوق")) {
              segmentCol = "fund";
            } else if (sym.includes("اختیار") || sym.startsWith("ض")) {
              segmentCol = "option";
            } else {
              // پیش‌فرض بورس
              segmentCol = "tse";
            }
          }
          
          const notesCol = row["توضیح نماد"] || row["یادداشت"] || row["notes"] || "";

          if (!symbolCol) {
            console.warn(`ردیف ${index + 1}: نماد پیدا نشد، ردیف نادیده گرفته شد`);
            return null;
          }

          const quantity = parseFloat(quantityCol) || 0;
          const avgBuyPrice = parseFloat(avgBuyPriceCol) || 0;
          
          if (quantity <= 0 || avgBuyPrice <= 0) {
            console.warn(`ردیف ${index + 1}: مقادیر نامعتبر - تعداد: ${quantity}, قیمت: ${avgBuyPrice}`);
            return null;
          }

          return {
            _id: `imported_${Date.now()}_${index}`,
            symbol: String(symbolCol).trim(),
            quantity: quantity,
            avgBuyPrice: avgBuyPrice,
            segment: segmentCol === "فرابورس" || segmentCol === "ifb" || segmentCol === "IFB" ? "ifb" : 
                     segmentCol === "صندوق" || segmentCol === "fund" || segmentCol === "FUND" ? "fund" :
                     segmentCol === "اختیار" || segmentCol === "option" || segmentCol === "OPTION" ? "option" : "tse",
            notes: notesCol ? String(notesCol) : "",
            addedAt: Date.now(),
          };
        }).filter(item => item !== null && item.symbol && item.quantity > 0 && item.avgBuyPrice > 0);

        console.log("Processed Items:", importedItems);

        if (importedItems.length > 0 && onImport) {
          onImport(importedItems);
          toast.success(`${importedItems.length} دارایی با موفقیت وارد شد`);
          onOpenChange(false);
        } else {
          toast.error("هیچ داده معتبری در فایل یافت نشد. لطفاً ستون‌های 'نام نماد'، 'تعداد دارایی' و 'قیمت میانگین خرید' را بررسی کنید.");
        }
      } catch (error) {
        console.error("Error importing Excel file:", error);
        toast.error("خطا در خواندن فایل اکسل. لطفاً فرمت فایل را بررسی کنید.");
      }
    };
    reader.onerror = () => {
      toast.error("خطا در خواندن فایل");
    };
    reader.readAsBinaryString(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const stockInstruments = instruments.filter(i => i.segment === "tse" || i.segment === "ifb");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>افزودن دارایی به پرتفوی</DialogTitle>
        </DialogHeader>
        
        {/* Import Excel Button */}
        <div className="flex gap-2 mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileImport}
            className="hidden"
            id="excel-import"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 gap-2"
          >
            <Upload className="size-4" />
            وارد کردن از اکسل
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="symbol">نماد</Label>
            {!showSearch ? (
              <div className="flex gap-2">
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب نماد" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockInstruments.slice(0, 100).map(inst => (
                      <SelectItem key={inst.symbol} value={inst.symbol}>
                        {inst.name} ({inst.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSearch(true)}
                  className="shrink-0"
                >
                  <Search className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex gap-2 mb-2">
                  <Input
                    type="text"
                    placeholder="جستجوی نماد (نام یا کد)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    className="shrink-0"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-md bg-background">
                  {filteredInstruments.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      هیچ نمادی یافت نشد
                    </div>
                  ) : (
                    filteredInstruments.map(inst => (
                      <button
                        key={inst.symbol}
                        type="button"
                        onClick={() => handleSelectInstrument(inst)}
                        className="w-full p-2 text-right hover:bg-muted/50 transition-colors border-b last:border-b-0"
                      >
                        <span className="font-medium">{inst.name}</span>
                        <span className="text-xs text-muted-foreground mr-2">({inst.symbol})</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">تعداد</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="avgBuyPrice">قیمت میانگین خرید (ریال)</Label>
              <Input
                id="avgBuyPrice"
                type="number"
                value={avgBuyPrice}
                onChange={(e) => setAvgBuyPrice(e.target.value)}
                placeholder="0"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="segment">بازار</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tse">بورس</SelectItem>
                <SelectItem value="ifb">فرابورس</SelectItem>
                <SelectItem value="fund">صندوق</SelectItem>
                <SelectItem value="option">اختیار معامله</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">یادداشت (اختیاری)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="یادداشت..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              انصراف
            </Button>
            <Button type="submit" disabled={!symbol || !quantity || !avgBuyPrice}>
              <Plus className="size-4 ml-1" />
              افزودن
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
