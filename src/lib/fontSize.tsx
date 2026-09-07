/**
 * سیستم تنظیم اندازه فونت — کلی و بخشی
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface FontSizeState {
  base: number;
  sections: Record<string, number>;
}

interface FontSizeContextType {
  base: number;
  setBase: (v: number) => void;
  getSection: (section: string) => number;
  setSection: (section: string, value: number) => void;
  resetAll: () => void;
}

const FontSizeContext = createContext<FontSizeContextType | null>(null);

const STORAGE_KEY = "nabz_font_size";
const DEFAULT_BASE = 14;

function loadFromStorage(): FontSizeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { base: DEFAULT_BASE, sections: {} };
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FontSizeState>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.documentElement.style.fontSize = `${state.base}px`;
  }, [state]);

  const setBase = useCallback((v: number) => setState((s) => ({ ...s, base: Math.max(10, Math.min(22, v)) })), []);
  const getSection = useCallback((section: string) => state.sections[section] ?? 1, [state.sections]);
  const setSection = useCallback((section: string, value: number) =>
    setState((s) => ({ ...s, sections: { ...s.sections, [section]: Math.max(0.6, Math.min(1.8, value)) } })), []);
  const resetAll = useCallback(() => setState({ base: DEFAULT_BASE, sections: {} }), []);

  return (
    <FontSizeContext.Provider value={{ base: state.base, setBase, getSection, setSection, resetAll }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext);
  if (!ctx) return { base: DEFAULT_BASE, setBase: () => {}, getSection: () => 1, setSection: () => {}, resetAll: () => {} };
  return ctx;
}

/** Returns a font size style object for a section */
export function sectionStyle(section: string, baseSize: string = "text-sm"): React.CSSProperties {
  // This is a simple passthrough - components should use useFontSize() directly
  return {};
}
