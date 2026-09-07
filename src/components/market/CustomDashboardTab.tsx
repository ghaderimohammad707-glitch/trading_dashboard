import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Grid3x3, LayoutGrid, TrendingUp, Activity, 
  Users, Radio, Gem, ShieldAlert, BarChart3,
  MoveUpRight, Settings, Save, RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardWidget {
  id: string;
  title: string;
  icon: any;
  visible: boolean;
  size: "small" | "medium" | "large";
}

const defaultWidgets: DashboardWidget[] = [
  { id: "market-overview", title: "نمای کلی بازار", icon: Activity, visible: true, size: "large" },
  { id: "top-gainers", title: "برترین‌های مثبت", icon: TrendingUp, visible: true, size: "medium" },
  { id: "top-losers", title: "برترین‌های منفی", icon: TrendingUp, visible: true, size: "medium" },
  { id: "signals", title: "سیگنال‌های فعال", icon: Radio, visible: true, size: "medium" },
  { id: "tabloukhani", title: "تابلوخوانی", icon: Users, visible: false, size: "medium" },
  { id: "gem-hunter", title: "کشف گنج", icon: Gem, visible: false, size: "medium" },
  { id: "risk-alerts", title: "هشدارهای ریسک", icon: ShieldAlert, visible: true, size: "small" },
  { id: "portfolio", title: "پرتفوی من", icon: BarChart3, visible: true, size: "large" },
];

export function CustomDashboardTab() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(defaultWidgets);
  const [isEditing, setIsEditing] = useState(false);
  const [layout, setLayout] = useState<"compact" | "comfortable">("comfortable");

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => 
      w.id === id ? { ...w, visible: !w.visible } : w
    ));
  };

  const resetToDefault = () => {
    setWidgets(defaultWidgets);
  };

  const visibleWidgets = widgets.filter(w => w.visible);

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="size-6 text-primary" />
          <h2 className="text-lg font-bold">داشبورد شخصی‌سازی شده</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            className="gap-1.5"
          >
            <Settings className="size-4" />
            {isEditing ? "پایان ویرایش" : "ویرایش"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="gap-1.5"
          >
            <RotateCcw className="size-4" />
            بازگشت به پیش‌فرض
          </Button>
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
          >
            <Save className="size-4" />
            ذخیره
          </Button>
        </div>
      </div>

      {/* Layout Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">چیدمان:</span>
        <Button
          variant={layout === "compact" ? "default" : "outline"}
          size="sm"
          onClick={() => setLayout("compact")}
          className="gap-1"
        >
          <Grid3x3 className="size-4" />
          فشرده
        </Button>
        <Button
          variant={layout === "comfortable" ? "default" : "outline"}
          size="sm"
          onClick={() => setLayout("comfortable")}
          className="gap-1"
        >
          <LayoutGrid className="size-4" />
          راحت
        </Button>
      </div>

      {/* Widget Configuration Panel */}
      {isEditing && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">تنظیم ویجت‌ها</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {widgets.map(widget => (
              <Button
                key={widget.id}
                variant={widget.visible ? "default" : "outline"}
                size="sm"
                onClick={() => toggleWidget(widget.id)}
                className={cn(
                  "justify-start gap-2",
                  !widget.visible && "opacity-60"
                )}
              >
                <widget.icon className="size-4" />
                {widget.title}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Dashboard Grid */}
      <div className={cn(
        "grid gap-4",
        layout === "compact" ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 lg:grid-cols-2"
      )}>
        {visibleWidgets.map(widget => {
          const Icon = widget.icon;
          return (
            <Card 
              key={widget.id} 
              className={cn(
                "p-4 transition-all hover:shadow-md",
                widget.size === "large" && "lg:col-span-2",
                layout === "compact" && "text-sm"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{widget.title}</h3>
                </div>
                {isEditing && (
                  <Badge variant="secondary" className="text-xs">
                    {widget.size === "large" ? "بزرگ" : widget.size === "medium" ? "متوسط" : "کوچک"}
                  </Badge>
                )}
              </div>
              
              {/* Placeholder Content */}
              <div className="text-muted-foreground text-sm">
                {widget.id === "market-overview" && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>صعودی:</span>
                      <span className="text-emerald-500 font-bold">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span>نزولی:</span>
                      <span className="text-red-500 font-bold">--</span>
                    </div>
                    <div className="flex justify-between">
                      <span>کل نمادها:</span>
                      <span>--</span>
                    </div>
                  </div>
                )}
                {widget.id === "top-gainers" && (
                  <div className="text-center py-4">
                    <TrendingUp className="size-8 mx-auto text-emerald-500 mb-2" />
                    <span>برترین‌های مثبت پس از بارگذاری داده‌ها نمایش داده می‌شوند</span>
                  </div>
                )}
                {widget.id === "top-losers" && (
                  <div className="text-center py-4">
                    <TrendingUp className="size-8 mx-auto text-red-500 mb-2 rotate-180" />
                    <span>برترین‌های منفی پس از بارگذاری داده‌ها نمایش داده می‌شوند</span>
                  </div>
                )}
                {(widget.id === "signals" || widget.id === "portfolio") && (
                  <div className="text-center py-4">
                    <Activity className="size-8 mx-auto text-primary mb-2" />
                    <span>داده‌ها پس از بروزرسانی نمایش داده می‌شوند</span>
                  </div>
                )}
                {["tabloukhani", "gem-hunter", "risk-alerts"].includes(widget.id) && (
                  <div className="text-center py-4">
                    <Icon className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                    <span>این ویجت در نسخه بعدی فعال می‌شود</span>
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">اندازه:</span>
                  <div className="flex gap-1">
                    {(["small", "medium", "large"] as const).map(size => (
                      <Button
                        key={size}
                        variant={widget.size === size ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setWidgets(prev => prev.map(w =>
                          w.id === widget.id ? { ...w, size } : w
                        ))}
                      >
                        {size === "large" ? "بزرگ" : size === "medium" ? "متوسط" : "کوچک"}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {visibleWidgets.length === 0 && (
        <Card className="p-8 text-center">
          <LayoutGrid className="size-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">هیچ ویجتی انتخاب نشده است</h3>
          <p className="text-muted-foreground mb-4">
            برای شروع، روی دکمه ویرایش کلیک کنید و ویجت‌های مورد نظر خود را انتخاب کنید.
          </p>
          <Button onClick={() => setIsEditing(true)}>
            شروع پیکربندی
          </Button>
        </Card>
      )}
    </div>
  );
}
