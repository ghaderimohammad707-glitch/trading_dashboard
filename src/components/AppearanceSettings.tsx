import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Palette,
  RotateCcw,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

/* ═══════════════════════════════════════════════════════
   Types & Defaults
   ═══════════════════════════════════════════════════════ */

interface AppearanceSettings {
  bgColor: string;
  bgAlpha: number; // 0-100
  fgColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

const DEFAULTS: AppearanceSettings = {
  bgColor: "",
  bgAlpha: 100,
  fgColor: "",
  accentColor: "",
  fontFamily: "",
  fontSize: 14,
  lineHeight: 1.6,
  letterSpacing: 0,
};

/* ═══════════════════════════════════════════════════════
   Color Presets
   ═══════════════════════════════════════════════════════ */

const BG_PRESETS = [
  { label: "پیش‌فرض", value: "" },
  { label: "مشکی خالص", value: "#000000" },
  { label: "سرمه‌ای", value: "#0a0f1a" },
  { label: "خاکستری", value: "#111827" },
  { label: "سبز تیره", value: "#0a1a12" },
  { label: "قرمز تیره", value: "#1a0a0a" },
  { label: "بنفش تیره", value: "#0f0a1a" },
  { label: "آبی تیره", value: "#0a1520" },
  { label: "قهوه‌ای", value: "#1a120a" },
  { label: "نارنجی تیره", value: "#1a0f0a" },
];

const FG_PRESETS = [
  { label: "پیش‌فرض", value: "" },
  { label: "سفید", value: "#ffffff" },
  { label: "طوسی", value: "#e5e7eb" },
  { label: "سبز نئون", value: "#00ff88" },
  { label: "نارنجی", value: "#ff8800" },
  { label: "آبی", value: "#00bbff" },
  { label: "صورتی", value: "#ff69b4" },
  { label: "زرد", value: "#ffd700" },
  { label: "قرمز", value: "#ff4444" },
  { label: "بنفش", value: "#bb86fc" },
];

const ACCENT_PRESETS = [
  { label: "بنفش", value: "" },
  { label: "سبز", value: "#10b981" },
  { label: "آبی", value: "#3b82f6" },
  { label: "نارنجی", value: "#f97316" },
  { label: "قرمز", value: "#ef4444" },
  { label: "صورتی", value: "#ec4899" },
  { label: "زرد", value: "#eab308" },
  { label: "فیروزه‌ای", value: "#14b8a6" },
];

const BUILTIN_FONTS = [
  { label: "Vazirmatn (پیش‌فرض)", value: "" },
  { label: "IranSans", value: "'IRANSans', Tahoma, sans-serif" },
  { label: "Tahoma", value: "Tahoma, 'Segoe UI', sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Inter", value: "Inter, 'Segoe UI', sans-serif" },
  { label: "SF Pro", value: "'SF Pro Display', -apple-system, sans-serif" },
  { label: "Fira Code", value: "'Fira Code', monospace" },
  { label: "monospace", value: "'Courier New', monospace" },
];

const STORAGE_KEY = "nabz-appearance";

/* ═══════════════════════════════════════════════════════
   System Font Detection
   ═══════════════════════════════════════════════════════ */

function detectSystemFonts(): string[] {
  try {
    // Use canvas to detect common system fonts
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];

    const testFonts = [
      "Vazirmatn", "IranSans", "Tahoma", "Arial", "Helvetica",
      "Segoe UI", "Roboto", "Open Sans", "Lato", "Montserrat",
      "Poppins", "Nunito", "Source Sans 3", "IBM Plex Sans",
      "Fira Code", "Cascadia Code", "JetBrains Mono", "Consolas",
      "SF Pro Display", "SF Pro Text", "PingFang SC", "Noto Sans",
      "Ubuntu", "Droid Sans", "DejaVu Sans", "Liberation Sans",
      "Noto Naskh Arabic", "Scheherazade New", "Amiri",
    ];

    const available: string[] = [];
    const baseFonts = ["monospace", "sans-serif", "serif"];

    for (const font of testFonts) {
      let found = false;
      for (const base of baseFonts) {
        const baseline = ctx.measureText("mmmmmmmmmmlli").width;
        ctx.font = `12px "${font}", ${base}`;
        const measured = ctx.measureText("mmmmmmmmmmlli").width;
        if (measured !== baseline) {
          found = true;
          break;
        }
      }
      if (found) available.push(font);
    }

    return available;
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════════════════
   Load / Save
   ═══════════════════════════════════════════════════════ */

function loadSettings(): AppearanceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function saveSettings(s: AppearanceSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

/* ═══════════════════════════════════════════════════════
   Apply to DOM (instant)
   ═══════════════════════════════════════════════════════ */

function applyToDOM(s: AppearanceSettings) {
  const el = document.documentElement;

  // Background
  if (s.bgColor) {
    const alpha = s.bgAlpha / 100;
    el.style.setProperty("--background", `${s.bgColor}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`);
    el.style.setProperty("--card", mixColor(s.bgColor, 8, alpha));
    el.style.setProperty("--muted", mixColor(s.bgColor, 15, alpha));
    el.style.setProperty("--accent", mixColor(s.bgColor, 18, alpha));
    el.style.setProperty("--border", mixColor(s.bgColor, 22, alpha));
    el.style.setProperty("--input", mixColor(s.bgColor, 15, alpha));
  } else {
    el.style.removeProperty("--background");
    el.style.removeProperty("--card");
    el.style.removeProperty("--muted");
    el.style.removeProperty("--accent");
    el.style.removeProperty("--border");
    el.style.removeProperty("--input");
  }

  // Foreground text
  if (s.fgColor) {
    el.style.setProperty("--foreground", s.fgColor);
    el.style.setProperty("--card-foreground", s.fgColor);
    el.style.setProperty("--muted-foreground", mixColor(s.fgColor, 35));
    el.style.setProperty("--popover-foreground", s.fgColor);
  } else {
    el.style.removeProperty("--foreground");
    el.style.removeProperty("--card-foreground");
    el.style.removeProperty("--muted-foreground");
    el.style.removeProperty("--popover-foreground");
  }

  // Accent color
  if (s.accentColor) {
    el.style.setProperty("--primary", s.accentColor);
    el.style.setProperty("--ring", s.accentColor);
    el.style.setProperty("--chart-1", s.accentColor);
    el.style.setProperty("--sidebar-primary", s.accentColor);
  } else {
    el.style.removeProperty("--primary");
    el.style.removeProperty("--ring");
    el.style.removeProperty("--chart-1");
    el.style.removeProperty("--sidebar-primary");
  }

  // Font
  if (s.fontFamily) {
    el.style.setProperty("--font-sans", s.fontFamily);
  } else {
    el.style.removeProperty("--font-sans");
  }

  // Inject font overrides
  if (!document.getElementById("nabz-appearance-override")) {
    const style = document.createElement("style");
    style.id = "nabz-appearance-override";
    document.head.appendChild(style);
  }
  const overrideStyle = document.getElementById("nabz-appearance-override");
  if (overrideStyle) {
    overrideStyle.textContent = `
      body {
        font-size: ${s.fontSize}px !important;
        line-height: ${s.lineHeight} !important;
        letter-spacing: ${s.letterSpacing}px !important;
      }
    `;
  }
}

/** Mix a hex color toward black by percentage */
function mixColor(hex: string, percent: number, alpha?: number): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const factor = percent / 100;
    const nr = Math.round(r + (0 - r) * factor);
    const ng = Math.round(g + (0 - g) * factor);
    const nb = Math.round(b + (0 - b) * factor);
    if (alpha !== undefined && alpha < 1) {
      return `rgba(${nr}, ${ng}, ${nb}, ${alpha})`;
    }
    return `rgb(${nr}, ${ng}, ${nb})`;
  } catch {
    return hex;
  }
}

/* ═══════════════════════════════════════════════════════
   Color Picker Sub-component
   ═══════════════════════════════════════════════════════ */

function ColorPicker({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: string;
  presets: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  const [customColor, setCustomColor] = useState(value || "#000000");

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <div className="grid grid-cols-5 gap-1.5">
        {presets.map((p) => (
          <button
            key={p.value || "default"}
            onClick={() => onChange(p.value)}
            className={cn(
              "group relative flex flex-col items-center gap-0.5 cursor-pointer rounded-lg border p-1.5 transition-all",
              value === p.value
                ? "border-primary ring-1 ring-primary"
                : "border-border/50 hover:border-primary/50",
            )}
          >
            <div
              className="size-5 rounded-md border border-border/30 shadow-sm"
              style={{
                background:
                  p.value || "linear-gradient(135deg, oklch(0.13 0.014 260), oklch(0.17 0.016 260))",
              }}
            />
            <span className="text-[8px] text-muted-foreground leading-none truncate w-full text-center">
              {p.label}
            </span>
            {value === p.value && (
              <Check className="absolute top-0.5 left-0.5 size-2.5 text-primary" />
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={customColor}
          onChange={(e) => {
            setCustomColor(e.target.value);
            onChange(e.target.value);
          }}
          className="size-7 rounded border border-border cursor-pointer"
        />
        <Input
          value={customColor}
          onChange={(e) => {
            setCustomColor(e.target.value);
            if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
              onChange(e.target.value);
            }
          }}
          placeholder="#000000"
          className="h-7 text-[11px] font-mono flex-1"
          dir="ltr"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Font Picker Sub-component
   ═══════════════════════════════════════════════════════ */

function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [customFontUrl, setCustomFontUrl] = useState("");
  const [customFontName, setCustomFontName] = useState("");
  const [importedFonts, setImportedFonts] = useState<
    { name: string; url: string }[]
  >([]);
  const [showSystem, setShowSystem] = useState(false);

  const systemFonts = useMemo(() => detectSystemFonts(), []);

  const allFonts = useMemo(() => {
    const list = [...BUILTIN_FONTS];
    for (const sf of systemFonts) {
      if (!list.some((f) => f.label.includes(sf))) {
        list.push({
          label: `${sf} (سیستم)`,
          value: `"${sf}", sans-serif`,
        });
      }
    }
    for (const imp of importedFonts) {
      list.push({
        label: `${imp.name} (وارد شده)`,
        value: `"${imp.name}", sans-serif`,
      });
    }
    return list;
  }, [systemFonts, importedFonts]);

  const handleImportFont = () => {
    if (!customFontUrl || !customFontName) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = customFontUrl;
    document.head.appendChild(link);
    setImportedFonts((prev) => [
      ...prev,
      { name: customFontName, url: customFontUrl },
    ]);
    onChange(`"${customFontName}", sans-serif`);
    setCustomFontUrl("");
    setCustomFontName("");
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-muted-foreground">
        نوع فونت
      </label>

      {/* Built-in + system fonts */}
      <div className="grid grid-cols-2 gap-1">
        {allFonts.map((f) => (
          <button
            key={f.value || "default"}
            onClick={() => onChange(f.value)}
            className={cn(
              "rounded-lg border px-2 py-1.5 text-[11px] transition-all cursor-pointer text-right truncate",
              value === f.value
                ? "border-primary bg-primary/5 text-primary font-medium"
                : "border-border/50 hover:border-primary/30 text-muted-foreground",
            )}
            style={{ fontFamily: f.value || undefined }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* System fonts toggle */}
      {systemFonts.length > 0 && (
        <button
          onClick={() => setShowSystem(!showSystem)}
          className="text-[10px] text-primary cursor-pointer flex items-center gap-1"
        >
          {showSystem ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
          {showSystem ? "مخفی کردن" : `${systemFonts.length} فونت سیستم شناسایی شد`}
        </button>
      )}

      {showSystem && (
        <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto">
          {systemFonts.map((f) => {
            const val = `"${f}", sans-serif`;
            return (
              <button
                key={f}
                onClick={() => onChange(val)}
                className={cn(
                  "rounded border px-1.5 py-1 text-[9px] transition-all cursor-pointer truncate",
                  value === val
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/30 text-muted-foreground hover:border-primary/30",
                )}
                style={{ fontFamily: val }}
              >
                {f}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom font import */}
      <div className="rounded-lg border border-dashed border-border/50 p-2 flex flex-col gap-1.5">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Upload className="size-3" /> وارد کردن فونت سفارشی
        </span>
        <div className="flex gap-1">
          <Input
            value={customFontName}
            onChange={(e) => setCustomFontName(e.target.value)}
            placeholder="نام فونت"
            className="h-6 text-[10px] flex-1"
          />
          <Input
            value={customFontUrl}
            onChange={(e) => setCustomFontUrl(e.target.value)}
            placeholder="Google Fonts URL"
            className="h-6 text-[10px] flex-1"
            dir="ltr"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px]"
          onClick={handleImportFont}
          disabled={!customFontUrl || !customFontName}
        >
          وارد کردن
        </Button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

export function AppearanceSettingsPanel() {
  const [settings, setSettings] = useState<AppearanceSettings>(loadSettings);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    applyToDOM(settings);
  }, []);

  const update = useCallback(
    (partial: Partial<AppearanceSettings>) => {
      const next = { ...settings, ...partial };
      setSettings(next);
      saveSettings(next);
      applyToDOM(next);
    },
    [settings],
  );

  const reset = useCallback(() => {
    setSettings({ ...DEFAULTS });
    saveSettings({ ...DEFAULTS });
    const el = document.documentElement;
    el.style.removeProperty("--background");
    el.style.removeProperty("--card");
    el.style.removeProperty("--muted");
    el.style.removeProperty("--accent");
    el.style.removeProperty("--border");
    el.style.removeProperty("--input");
    el.style.removeProperty("--foreground");
    el.style.removeProperty("--card-foreground");
    el.style.removeProperty("--muted-foreground");
    el.style.removeProperty("--popover-foreground");
    el.style.removeProperty("--primary");
    el.style.removeProperty("--ring");
    el.style.removeProperty("--chart-1");
    el.style.removeProperty("--sidebar-primary");
    el.style.removeProperty("--font-sans");
    const s = document.getElementById("nabz-appearance-override");
    if (s) s.textContent = "";
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl border-border/50 px-3 transition-all duration-300 hover:scale-105 hover:shadow-md"
        >
          <Palette className="size-3.5" />
          <span className="text-xs hidden sm:inline">ظاهر</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-96 max-h-[85vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">تنظیمات ظاهری</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={reset}
            >
              <RotateCcw className="size-3" />
              بازنشانی
            </Button>
          </div>

          {/* ─── رنگ پس‌زمینه ─── */}
          <ColorPicker
            label="رنگ پس‌زمینه"
            value={settings.bgColor}
            presets={BG_PRESETS}
            onChange={(v) => update({ bgColor: v })}
          />

          {/* شفافیت پس‌زمینه */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">شفافیت پس‌زمینه</label>
              <span className="text-[10px] text-primary font-mono">{settings.bgAlpha}%</span>
            </div>
            <Slider
              value={[settings.bgAlpha]}
              onValueChange={([v]) => update({ bgAlpha: v })}
              min={20}
              max={100}
              step={5}
            />
          </div>

          {/* ─── رنگ متن ─── */}
          <ColorPicker
            label="رنگ متن"
            value={settings.fgColor}
            presets={FG_PRESETS}
            onChange={(v) => update({ fgColor: v })}
          />

          {/* ─── رنگ اصلی (Accent) ─── */}
          <ColorPicker
            label="رنگ اصلی (دکمه‌ها و لینک‌ها)"
            value={settings.accentColor}
            presets={ACCENT_PRESETS}
            onChange={(v) => update({ accentColor: v })}
          />

          {/* ─── فونت ─── */}
          <FontPicker
            value={settings.fontFamily}
            onChange={(v) => update({ fontFamily: v })}
          />

          {/* ─── اندازه فونت ─── */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                اندازه فونت
              </label>
              <span className="text-xs text-primary font-mono">{settings.fontSize}px</span>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([v]) => update({ fontSize: v })}
              min={10}
              max={24}
              step={1}
            />
          </div>

          {/* ─── ارتفاع خط ─── */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">ارتفاع خط</label>
              <span className="text-xs text-primary font-mono">{settings.lineHeight.toFixed(1)}</span>
            </div>
            <Slider
              value={[settings.lineHeight * 10]}
              onValueChange={([v]) => update({ lineHeight: v / 10 })}
              min={10}
              max={25}
              step={1}
            />
          </div>

          {/* ─── فاصله حروف ─── */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">فاصله حروف</label>
              <span className="text-xs text-primary font-mono">{settings.letterSpacing.toFixed(1)}px</span>
            </div>
            <Slider
              value={[settings.letterSpacing * 10 + 5]}
              onValueChange={([v]) => update({ letterSpacing: (v - 5) / 10 })}
              min={0}
              max={20}
              step={1}
            />
          </div>

          {/* ─── پیش‌نمایش زنده ─── */}
          <div
            className="rounded-lg border p-3 text-xs"
            style={{
              background: settings.bgColor
                ? `${settings.bgColor}${Math.round((settings.bgAlpha / 100) * 255).toString(16).padStart(2, "0")}`
                : undefined,
              color: settings.fgColor || undefined,
              fontFamily: settings.fontFamily || undefined,
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
              letterSpacing: `${settings.letterSpacing}px`,
            }}
          >
            <p
              className="font-bold mb-1"
              style={{ color: settings.accentColor || undefined }}
            >
              پیش‌نمایش زنده
            </p>
            <p>
              فولاد مبارکه (فولاد) با رشد ۳.۵٪ به قیمت ۵,۲۳۰ ریال رسید. حجم
              معاملات ۱۲ میلیون سهم بود.
            </p>
            <p className="mt-1 text-[0.85em] opacity-70">
              متن کوچکتر برای اطلاعات جانبی
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
