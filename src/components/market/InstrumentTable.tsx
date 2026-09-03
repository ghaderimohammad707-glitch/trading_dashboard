import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  compactNumber,
  compactToman,
  faNumber,
  faPercent,
  faSigned,
} from "@/lib/format";
import type { SegmentType as Segment } from "@/lib/clientFetch";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState, useCallback, useMemo } from "react";
import { Star } from "lucide-react";
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist";

// Flexible type that accepts both Convex and client-side instruments
interface FlexInstrument {
  _id: string;
  symbol: string;
  name: string;
  segment: Segment;
  last: number;
  close: number;
  open: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  volume: number;
  value: number;
  tradeCount: number;
  status: "open" | "closed" | "allowed" | "halted";
  rawInsCode?: string;
  pe?: number;
  eps?: number;
  marketCap?: number;
  category?: string;
  optionType?: "call" | "put";
  strike?: number;
  expiry?: string;
  openInterest?: number;
  baseAsset?: string;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  unit?: string;
  yesterday?: number;
  bestBuy1?: number;
  bestBuyVol1?: number;
  bestSell1?: number;
  bestSellVol1?: number;
}

type Instrument = FlexInstrument;
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function dir(value: number) {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

function dirText(value: number) {
  return dir(value) === "up"
    ? "text-up"
    : dir(value) === "down"
      ? "text-down"
      : "text-muted-foreground";
}

function Num({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span dir="ltr" className={cn("inline-block tabular-nums-fa text-[12px] text-left", className)}>
      {children}
    </span>
  );
}

function ChangeCell({ pct }: { pct: number }) {
  const d = dir(pct);
  return (
    <Num className={cn("font-semibold", dirText(pct))}>
      {d === "up" ? "+" : d === "down" ? "-" : ""}
      {faPercent(Math.abs(pct))}
    </Num>
  );
}

function StatusDot({ status }: { status: Instrument["status"] }) {
  const color =
    status === "halted"
      ? "bg-down"
      : status === "closed"
        ? "bg-muted-foreground/40"
        : "bg-up";
  return (
    <span
      className={cn("inline-block size-1.5 rounded-full shrink-0", color)}
      title={status === "open" ? "مجاز" : status === "halted" ? "متوقف" : "بسته"}
    />
  );
}

function SymbolCell({ instrument, onToggleWatchlist, isWatched }: { instrument: Instrument; onToggleWatchlist: (e: React.MouseEvent) => void; isWatched: boolean }) {
  return (
    <div className="flex max-w-[260px] items-center gap-2">
      <button
        onClick={onToggleWatchlist}
        className={cn(
          "shrink-0 p-0.5 rounded transition-colors cursor-pointer",
          isWatched ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground/20 hover:text-muted-foreground/50"
        )}
        title={isWatched ? "حذف از دیده‌بان" : "افزودن به دیده‌بان"}
      >
        <Star className="size-3.5" fill={isWatched ? "currentColor" : "none"} />
      </button>
      <StatusDot status={instrument.status} />
      <div className="min-w-0">
        <div className="truncate font-bold text-[12px] leading-tight">{instrument.symbol}</div>
        <div className="truncate text-[10px] text-muted-foreground leading-tight max-w-[180px]">
          {instrument.name}
        </div>
      </div>
    </div>
  );
}

function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <TableHead
      className={cn(
        "text-[11px] font-semibold text-muted-foreground whitespace-nowrap px-2 py-2 sticky top-0 bg-card z-20",
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TableCell className={cn("px-2 py-1.5 text-center", className)}>
      {children}
    </TableCell>
  );
}

/* ═══════════════════════════════════════════════════════
   HEAD CELLS — column headers per segment
   ═══════════════════════════════════════════════════════ */

function headCells(segment: Segment) {
  switch (segment) {
    case "tse":
    case "ifb":
      return (
        <>
          <Th className="sticky right-0 bg-card z-30 text-right">⭐ نماد</Th>
          <Th>دیروز</Th>
          <Th>بازگشایی</Th>
          <Th>آخرین</Th>
          <Th>پایانی</Th>
          <Th>کمترین</Th>
          <Th>بیشترین</Th>
          <Th>تغییر</Th>
          <Th>حجم</Th>
          <Th>ارزش (تومان)</Th>
          <Th>تعداد</Th>
          <Th>خرید ۱</Th>
          <Th>فروش ۱</Th>
          <Th>P/E</Th>
        </>
      );
    case "fund":
      return (
        <>
          <Th className="sticky right-0 bg-card z-30 text-right">صندوق</Th>
          <Th>نوع</Th>
          <Th>دیروز</Th>
          <Th>آخرین</Th>
          <Th>تغییر</Th>
          <Th>حجم</Th>
          <Th>ارزش (تومان)</Th>
          <Th>تعداد</Th>
          <Th>P/E</Th>
        </>
      );
    case "option":
      return (
        <>
          <Th className="sticky right-0 bg-card z-30 text-right">اختیار</Th>
          <Th>نوع</Th>
          <Th>دارایی پایه</Th>
          <Th>قیمت اعمال</Th>
          <Th>سررسید</Th>
          <Th>دیروز</Th>
          <Th>آخرین</Th>
          <Th>تغییر</Th>
          <Th>حجم</Th>
          <Th>موقعیت باز</Th>
          <Th>Δ دلتا</Th>
          <Th>Γ گاما</Th>
          <Th>Θ تتا</Th>
          <Th>ν وگا</Th>
        </>
      );
    case "commodity":
      return (
        <>
          <Th className="sticky right-0 bg-card z-30 text-right">کالا / ارز</Th>
          <Th>قیمت</Th>
          <Th>تغییر</Th>
        </>
      );
  }
}

/* ═══════════════════════════════════════════════════════
   BODY CELLS — cell values per segment
   ═══════════════════════════════════════════════════════ */

/** Wrapper that passes watchlist state into SymbolCell */
function bodyCellsWithWatch(
  instrument: Instrument,
  segment: Segment,
  onToggleWatchlist: (inst: Instrument, e: React.MouseEvent) => void,
) {
  // We need to intercept the SymbolCell to add the star
  // For tse/ifb segments, the SymbolCell is in the first Td
  // We'll pass it as a prop through the existing bodyCells
  // But bodyCells is a pure function, so we handle it differently:
  // We add watchlist-aware cells inline
  const watched = isInWatchlist(instrument.symbol);

  function WatchSymbolCell() {
    return (
      <SymbolCell
        instrument={instrument}
        onToggleWatchlist={(e) => onToggleWatchlist(instrument, e)}
        isWatched={watched}
      />
    );
  }

  switch (segment) {
    case "tse":
    case "ifb":
      return (
        <>
          <Td className="sticky right-0 bg-card z-10">
            <WatchSymbolCell />
          </Td>
          <Td>
            <Num className="text-muted-foreground">{instrument.yesterday ? faNumber(instrument.yesterday) : faNumber(instrument.close)}</Num>
          </Td>
          <Td>
            <Num>{instrument.open > 0 ? faNumber(instrument.open) : "—"}</Num>
          </Td>
          <Td>
            <Num className="font-bold text-sm">{faNumber(instrument.last)}</Num>
          </Td>
          <Td>
            <Num>{faNumber(instrument.close)}</Num>
          </Td>
          <Td>
            <Num className="text-down">{faNumber(instrument.low)}</Num>
          </Td>
          <Td>
            <Num className="text-up">{faNumber(instrument.high)}</Num>
          </Td>
          <Td>
            <ChangeCell pct={instrument.changePercent} />
          </Td>
          <Td>
            <Num>{compactNumber(instrument.volume)}</Num>
          </Td>
          <Td>
            <Num>{compactToman(instrument.value)}</Num>
          </Td>
          <Td>
            <Num>{faNumber(instrument.tradeCount)}</Num>
          </Td>
          <Td>
            {instrument.bestBuy1 ? (
              <div className="flex flex-col">
                <Num className="text-up font-semibold">{faNumber(instrument.bestBuy1)}</Num>
                <Num className="text-[10px] text-muted-foreground">{compactNumber(instrument.bestBuyVol1 ?? 0)}</Num>
              </div>
            ) : (
              <Num className="text-muted-foreground">—</Num>
            )}
          </Td>
          <Td>
            {instrument.bestSell1 ? (
              <div className="flex flex-col">
                <Num className="text-down font-semibold">{faNumber(instrument.bestSell1)}</Num>
                <Num className="text-[10px] text-muted-foreground">{compactNumber(instrument.bestSellVol1 ?? 0)}</Num>
              </div>
            ) : (
              <Num className="text-muted-foreground">—</Num>
            )}
          </Td>
          <Td>
            <Num>{instrument.pe && instrument.pe > 0 ? faNumber(instrument.pe, 1) : "—"}</Num>
          </Td>
        </>
      );

    case "fund":
      return (
        <>
          <Td className="sticky right-0 bg-card z-10">
            <WatchSymbolCell />
          </Td>
          <Td>
            <Badge variant="secondary" className="font-normal text-[10px]">
              {instrument.category ?? "سهامی"}
            </Badge>
          </Td>
          <Td>
            <Num className="text-muted-foreground">{instrument.yesterday ? faNumber(instrument.yesterday) : "—"}</Num>
          </Td>
          <Td>
            <Num className="font-bold">{faNumber(instrument.last)}</Num>
          </Td>
          <Td>
            <ChangeCell pct={instrument.changePercent} />
          </Td>
          <Td>
            <Num>{compactNumber(instrument.volume)}</Num>
          </Td>
          <Td>
            <Num>{compactToman(instrument.value)}</Num>
          </Td>
          <Td>
            <Num>{faNumber(instrument.tradeCount)}</Num>
          </Td>
          <Td>
            <Num>{instrument.pe && instrument.pe > 0 ? faNumber(instrument.pe, 1) : "—"}</Num>
          </Td>
        </>
      );

    case "option": {
      const isCall = instrument.optionType === "call";
      return (
        <>
          <Td className="sticky right-0 bg-card z-10">
            <WatchSymbolCell />
          </Td>
          <Td>
            <Badge
              variant={isCall ? "default" : "outline"}
              className={cn(
                "font-normal text-[10px]",
                isCall ? "bg-up/10 text-up border-up/30" : "bg-down/10 text-down border-down/30",
              )}
            >
              {isCall ? "خرید ↑" : "فروش ↓"}
            </Badge>
          </Td>
          <Td>
            <Num className="text-muted-foreground text-[11px]">{instrument.baseAsset ?? "—"}</Num>
          </Td>
          <Td>
            <Num>{instrument.strike ? faNumber(instrument.strike) : "—"}</Num>
          </Td>
          <Td>
            <Num className="text-[11px]">{instrument.expiry ?? "—"}</Num>
          </Td>
          <Td>
            <Num className="text-muted-foreground">{instrument.yesterday ? faNumber(instrument.yesterday) : "—"}</Num>
          </Td>
          <Td>
            <Num className="font-bold">{faNumber(instrument.last)}</Num>
          </Td>
          <Td>
            <ChangeCell pct={instrument.changePercent} />
          </Td>
          <Td>
            <Num>{compactNumber(instrument.volume)}</Num>
          </Td>
          <Td>
            <Num>{instrument.openInterest ? faNumber(instrument.openInterest) : "—"}</Num>
          </Td>
          <Td>
            <Num className={cn(instrument.delta && instrument.delta > 0 ? "text-up" : instrument.delta && instrument.delta < 0 ? "text-down" : "")}>
              {instrument.delta != null ? faSigned(instrument.delta) : "—"}
            </Num>
          </Td>
          <Td>
            <Num>{instrument.gamma != null ? faSigned(instrument.gamma, 4) : "—"}</Num>
          </Td>
          <Td>
            <Num className={cn(instrument.theta && instrument.theta < 0 ? "text-down" : "")}>
              {instrument.theta != null ? faSigned(instrument.theta) : "—"}
            </Num>
          </Td>
          <Td>
            <Num>{instrument.vega != null ? faSigned(instrument.vega) : "—"}</Num>
          </Td>
        </>
      );
    }

    case "commodity":
      return (
        <>
          <Td className="sticky right-0 bg-card z-10">
            <WatchSymbolCell />
          </Td>
          <Td>
            <Num className="font-bold">{faNumber(instrument.last)}</Num>
          </Td>
          <Td>
            <ChangeCell pct={instrument.changePercent} />
          </Td>
        </>
      );
  }
}
/* ═══════════════════════════════════════════════════════
   COL SPAN per segment
   ═══════════════════════════════════════════════════════ */

function colSpan(segment: Segment): number {
  switch (segment) {
    case "tse":
    case "ifb":
      return 14;
    case "fund":
      return 9;
    case "option":
      return 14;
    case "commodity":
      return 3;
  }
}

/* ═══════════════════════════════════════════════════════
   ROW HEIGHT based on segment
   ═══════════════════════════════════════════════════════ */
const ROW_HEIGHT = 44; // Fixed height for virtualization

export function InstrumentTable({
  instruments,
  segment,
  onSelect,
}: {
  instruments: Instrument[];
  segment: Segment;
  onSelect: (instrument: Instrument) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [watchFilter, setWatchFilter] = useState<"all" | "watched">("all");
  const [watchTick, setWatchTick] = useState(0); // force re-render on toggle
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [marketTypeFilter, setMarketTypeFilter] = useState<"all" | "tse" | "ifb">("all");
  const [minVolume, setMinVolume] = useState<string>("");
  const [minChange, setMinChange] = useState<string>("");

  const handleToggleWatchlist = useCallback((instrument: Instrument, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger row click
    toggleWatchlist({
      symbol: instrument.symbol,
      name: instrument.name,
    });
    setWatchTick((t) => t + 1); // Force re-render
  }, []);

  // Extract unique industries from instruments
  const industries = useMemo(() => {
    const inds = new Set<string>();
    instruments.forEach(inst => {
      if (inst.category) inds.add(inst.category);
    });
    return Array.from(inds).sort();
  }, [instruments]);

  const displayInstruments = useMemo(() => {
    return instruments.filter((i) => {
      // Watchlist filter
      if (watchFilter === "watched" && !isInWatchlist(i.symbol)) return false;
      
      // Market type filter (TSE/IFB)
      if (marketTypeFilter !== "all" && i.segment !== marketTypeFilter) return false;
      
      // Industry filter
      if (industryFilter !== "all" && i.category !== industryFilter) return false;
      
      // Volume filter
      if (minVolume && i.volume < Number(minVolume)) return false;
      
      // Change percent filter
      if (minChange) {
        const minChg = Number(minChange);
        if (minChg > 0 && i.changePercent < minChg) return false;
        if (minChg < 0 && i.changePercent > minChg) return false;
      }
      
      return true;
    });
  }, [instruments, watchFilter, marketTypeFilter, industryFilter, minVolume, minChange]);

  const upCount = instruments.filter((i) => i.changePercent > 0).length;
  const downCount = instruments.filter((i) => i.changePercent < 0).length;
  const flatCount = instruments.filter((i) => i.changePercent === 0).length;
  const watchedCount = instruments.filter((i) => isInWatchlist(i.symbol)).length;

  // Virtual scrolling — only render visible rows
  const virtualizer = useVirtualizer({
    count: displayInstruments.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 bg-muted/20 sticky top-0 z-20">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-foreground">
            {faNumber(displayInstruments.length)} نماد
            {watchFilter === "watched" && (
              <span className="text-amber-400 ml-1">(دیده‌بان)</span>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-up">
            <span className="inline-block size-1.5 rounded-full bg-up" />
            {faNumber(upCount)}
          </span>
          <span className="inline-flex items-center gap-1 text-down">
            <span className="inline-block size-1.5 rounded-full bg-down" />
            {faNumber(downCount)}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span className="inline-block size-1.5 rounded-full bg-muted-foreground/40" />
            {faNumber(flatCount)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Market Type Filter */}
          <select
            value={marketTypeFilter}
            onChange={(e) => setMarketTypeFilter(e.target.value as any)}
            className="h-7 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">همه بازارها</option>
            <option value="tse">بورس</option>
            <option value="ifb">فرابورس</option>
          </select>
          
          {/* Industry Filter */}
          {industries.length > 0 && (
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring max-w-[150px]"
            >
              <option value="all">همه صنایع</option>
              {industries.map((ind: string) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          )}
          
          {/* Volume Filter */}
          <input
            type="number"
            placeholder="حداقل حجم"
            value={minVolume}
            onChange={(e) => setMinVolume(e.target.value)}
            className="h-7 w-24 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            dir="ltr"
          />
          
          {/* Change Filter */}
          <input
            type="number"
            placeholder="تغییر %"
            value={minChange}
            onChange={(e) => setMinChange(e.target.value)}
            className="h-7 w-20 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            dir="ltr"
          />
          
          {/* Reset Filters */}
          {(industryFilter !== "all" || marketTypeFilter !== "all" || minVolume || minChange) && (
            <button
              onClick={() => {
                setIndustryFilter("all");
                setMarketTypeFilter("all");
                setMinVolume("");
                setMinChange("");
              }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              حذف فیلترها
            </button>
          )}
          
          {watchedCount > 0 && (
            <button
              onClick={() => setWatchFilter(watchFilter === "all" ? "watched" : "all")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer",
                watchFilter === "watched"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent"
              )}
            >
              <Star className="size-3" fill={watchFilter === "watched" ? "currentColor" : "none"} />
              دیده‌بان ({watchedCount})
            </button>
          )}
        </div>
      </div>

      {/* Table with virtual scroll */}
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight: "calc(100vh - 300px)", minHeight: "400px" }}>
        <Table className="relative" dir="rtl">
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="hover:bg-transparent border-b">
              {headCells(segment)}
            </TableRow>
          </TableHeader>
          <TableBody>{displayInstruments.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={colSpan(segment)}
                  className="h-40 text-center text-sm text-muted-foreground"
                >
                  نمادی مطابق جستجو یافت نشد.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* Spacer for rows above viewport */}
                <tr style={{ height: virtualizer.getVirtualItems()[0]?.start ?? 0 }}>
                  <td colSpan={colSpan(segment)} />
                </tr>
                {/* Visible rows */}
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const instrument = displayInstruments[virtualRow.index];
                  if (!instrument) return null;
                  return (
                    <TableRow
                      key={instrument._id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/30 transition-colors",
                        isInWatchlist(instrument.symbol) && "bg-amber-500/[0.03]"
                      )}
                      onClick={() => onSelect(instrument)}
                      data-index={virtualRow.index}
                      ref={(node) => virtualizer.measureElement(node)}
                      style={{ height: ROW_HEIGHT }}
                    >
                      {bodyCellsWithWatch(instrument, segment, handleToggleWatchlist)}
                    </TableRow>
                  );
                })}
                {/* Spacer for rows below viewport */}
                {(() => {
                  const items = virtualizer.getVirtualItems();
                  const last = items[items.length - 1];
                  const totalSize = virtualizer.getTotalSize();
                  const bottomSpacer = totalSize - (last?.end ?? 0);
                  return bottomSpacer > 0 ? (
                    <tr style={{ height: bottomSpacer }}>
                      <td colSpan={colSpan(segment)} />
                    </tr>
                  ) : null;
                })()}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
