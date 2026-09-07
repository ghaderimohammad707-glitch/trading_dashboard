/**
 * VirtualTable — high-performance table for 3000+ rows
 * Uses @tanstack/react-virtual for windowed rendering
 */
import { useRef, useState, useMemo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  width?: number;
  align?: "left" | "center" | "right";
  render?: (item: T, index: number) => React.ReactNode;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowKey: (item: T) => string;
  onRowClick?: (item: T) => void;
  rowHeight?: number;
  headerHeight?: number;
  maxHeight?: number;
  className?: string;
  emptyMessage?: string;
}

export function VirtualTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  rowHeight = 44,
  headerHeight = 40,
  maxHeight = 600,
  className,
  emptyMessage = "داده‌ای یافت نشد",
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 20,
  });

  const visibleItems = virtualizer.getVirtualItems();

  const totalWidth = useMemo(
    () => columns.reduce((acc, col) => acc + (col.width ?? 120), 0),
    [columns],
  );

  const handleRowClick = useCallback(
    (item: T) => {
      onRowClick?.(item);
    },
    [onRowClick],
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border/30 bg-card/40 py-16 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Header */}
      <div
        className="flex items-center rounded-lg border border-border/30 bg-muted/40 text-xs font-medium text-muted-foreground"
        style={{ height: headerHeight, minWidth: totalWidth }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            className={cn(
              "flex items-center px-3 shrink-0 truncate",
              col.align === "right" && "justify-end",
              col.align === "center" && "justify-center",
            )}
            style={{ width: col.width ?? 120 }}
          >
            {col.header}
          </div>
        ))}
      </div>

      {/* Scrollable body */}
      <div
        ref={parentRef}
        className="overflow-auto rounded-lg border border-border/30 scrollbar-thin"
        style={{ maxHeight }}
      >
        <div
          style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}
        >
          {visibleItems.map((virtualRow) => {
            const item = data[virtualRow.index];
            const rowKeyVal = rowKey(item);
            const isHovered = hoveredRow === virtualRow.index;

            return (
              <div
                key={rowKeyVal}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={cn(
                  "absolute left-0 right-0 flex items-center border-b border-border/20 text-xs transition-colors",
                  isHovered ? "bg-muted/60" : "bg-card/40",
                  onRowClick && "cursor-pointer",
                )}
                style={{
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onMouseEnter={() => setHoveredRow(virtualRow.index)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => handleRowClick(item)}
              >
                {columns.map((col) => {
                  const value = (item as Record<string, unknown>)[col.key];
                  return (
                    <div
                      key={col.key}
                      className={cn(
                        "flex items-center px-3 shrink-0 truncate",
                        col.align === "right" && "justify-end",
                        col.align === "center" && "justify-center",
                      )}
                      style={{ width: col.width ?? 120 }}
                    >
                      {col.render
                        ? col.render(item, virtualRow.index)
                        : value != null
                          ? String(value)
                          : "—"}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer info */}
      <div className="flex items-center justify-between px-2 text-[10px] text-muted-foreground">
        <span>{data.length.toLocaleString("fa-IR")} ردیف</span>
        <span>
          نمایش {Math.min(visibleItems.length, data.length)} از{" "}
          {data.length.toLocaleString("fa-IR")}
        </span>
      </div>
    </div>
  );
}
