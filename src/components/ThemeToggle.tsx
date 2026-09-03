import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Palette } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const colorThemes = [
  { value: "", label: "بنفش (پیش‌فرض)", color: "oklch(0.72 0.16 262)" },
  { value: "emerald", label: "زمردی", color: "oklch(0.72 0.16 165)" },
  { value: "sunset", label: "غروب", color: "oklch(0.72 0.18 30)" },
  { value: "midnight", label: "نیمه‌شب", color: "oklch(0.7 0.14 240)" },
  { value: "neon-green", label: "سبز نئون", color: "oklch(0.78 0.19 155)" },
  { value: "neon-orange", label: "نارنجی نئون", color: "oklch(0.78 0.18 50)" },
] as const;

export function ThemeToggle() {
  const [activeColor, setActiveColor] = useState("");

  // Load saved color on mount and always keep dark mode
  useEffect(() => {
    const saved = localStorage.getItem("color-theme") || "";
    setActiveColor(saved);
    if (saved) {
      document.documentElement.setAttribute("data-theme", saved);
    }
    // Always ensure dark mode is active — never allow light
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

  // MutationObserver: if something removes 'dark' class, re-add it
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (!document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const setColorTheme = useCallback((color: string) => {
    setActiveColor(color);
    localStorage.setItem("color-theme", color);
    if (color) {
      document.documentElement.setAttribute("data-theme", color);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    // Always keep dark
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl border-border/50 px-3 transition-all duration-300 hover:scale-105 hover:shadow-md"
        >
          <Palette className="size-3.5" />
          <span className="text-xs hidden sm:inline">تم</span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs">رنگ تم</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {colorThemes.map((ct) => (
          <DropdownMenuItem
            key={ct.value || "default"}
            onClick={() => setColorTheme(ct.value)}
            className="cursor-pointer gap-2 text-sm"
          >
            <span
              className="size-4 rounded-full border border-border/50 shadow-sm"
              style={{ background: ct.color }}
            />
            <span>{ct.label}</span>
            {activeColor === ct.value && (
              <Check className="ms-auto size-3.5" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
