/**
 * Advanced Charts Components - Interactive visualizations using Recharts & ApexCharts
 * Includes: Heatmap, Pie Chart, Bar Chart, Area Chart for professional data visualization
 * 
 * ✅ Real data only - no mock data
 */

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { Instrument } from "@/lib/clientFetch";

// ─── Types ───
interface IndustryDistributionProps {
  instruments: Instrument[];
}

interface SectorPerformanceProps {
  instruments: Instrument[];
}

interface PriceDistributionProps {
  instruments: Instrument[];
}

interface MarketDepthProps {
  buyVolume: number;
  sellVolume: number;
  buyCount: number;
  sellCount: number;
}

// ─── Color Palettes ───
const COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#10b981", // emerald
  "#f97316", // orange
  "#6366f1", // indigo
];

const POSITIVE_COLOR = "#22c55e";
const NEGATIVE_COLOR = "#ef4444";

// ─── Industry Distribution (Pie Chart) ───
export function IndustryDistribution({ instruments }: IndustryDistributionProps) {
  const data = useMemo(() => {
    const industryMap = new Map<string, number>();
    
    instruments.forEach(inst => {
      const industry = inst.category || inst.segment || "سایر";
      const currentCount = industryMap.get(industry) || 0;
      industryMap.set(industry, currentCount + 1);
    });

    return Array.from(industryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 industries
  }, [instruments]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        داده‌ای برای نمایش وجود ندارد
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value} نماد`, "تعداد"]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Sector Performance (Bar Chart) ───
export function SectorPerformance({ instruments }: SectorPerformanceProps) {
  const data = useMemo(() => {
    const sectorMap = new Map<string, { totalChange: number; count: number }>();
    
    instruments.forEach(inst => {
      const sector = inst.category || inst.segment || "سایر";
      const current = sectorMap.get(sector) || { totalChange: 0, count: 0 };
      sectorMap.set(sector, {
        totalChange: current.totalChange + inst.changePercent,
        count: current.count + 1,
      });
    });

    return Array.from(sectorMap.entries())
      .map(([name, { totalChange, count }]) => ({
        name,
        avgChange: (totalChange / count).toFixed(2),
        count,
      }))
      .sort((a, b) => parseFloat(b.avgChange) - parseFloat(a.avgChange))
      .slice(0, 10); // Top 10 sectors
  }, [instruments]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        داده‌ای برای نمایش وجود ندارد
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" domain={["auto", "auto"]} hide />
          <YAxis 
            type="category" 
            dataKey="name" 
            width={80}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: string, name: string) => {
              if (name === "avgChange") return [`${value}%`, "میانگین تغییر"];
              return [value, "تعداد نمادها"];
            }}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="avgChange" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={parseFloat(entry.avgChange) >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Price Distribution (Area Chart) ───
export function PriceDistribution({ instruments }: PriceDistributionProps) {
  const data = useMemo(() => {
    const priceRanges = [
      { range: "۰-۵۰۰", min: 0, max: 500, count: 0 },
      { range: "۵۰۰-۱۰۰۰", min: 500, max: 1000, count: 0 },
      { range: "۱۰۰۰-۲۰۰۰", min: 1000, max: 2000, count: 0 },
      { range: "۲۰۰۰-۵۰۰۰", min: 2000, max: 5000, count: 0 },
      { range: "۵۰۰۰-۱۰۰۰۰", min: 5000, max: 10000, count: 0 },
      { range: "+۱۰۰۰۰", min: 10000, max: Infinity, count: 0 },
    ];

    instruments.forEach(inst => {
      const price = inst.last;
      const range = priceRanges.find(r => price >= r.min && price < r.max);
      if (range) range.count++;
    });

    return priceRanges.map(r => ({
      range: r.range,
      count: r.count,
      cumulative: 0, // Will be calculated below
    })).map((item, idx, arr) => ({
      ...item,
      cumulative: arr.slice(0, idx + 1).reduce((sum, i) => sum + i.count, 0),
    }));
  }, [instruments]);

  if (data.every(d => d.count === 0)) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        داده‌ای برای نمایش وجود ندارد
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="range" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value.toLocaleString("fa-IR")}`,
              name === "count" ? "تعداد" : "تجمعی"
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="#3b82f6" 
            fill="#3b82f6" 
            fillOpacity={0.3}
            name="تعداد"
          />
          <Area 
            type="monotone" 
            dataKey="cumulative" 
            stroke="#22c55e" 
            fill="#22c55e" 
            fillOpacity={0.3}
            name="تجمعی"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Market Depth (Bid/Ask Bar Chart) ───
export function MarketDepth({ buyVolume, sellVolume, buyCount, sellCount }: MarketDepthProps) {
  const data = useMemo(() => [
    {
      name: "خریدار",
      volume: buyVolume,
      count: buyCount,
      color: POSITIVE_COLOR,
    },
    {
      name: "فروشنده",
      volume: sellVolume,
      count: sellCount,
      color: NEGATIVE_COLOR,
    },
  ], [buyVolume, sellVolume, buyCount, sellCount]);

  if (buyVolume === 0 && sellVolume === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        داده‌ای برای نمایش وجود ندارد
      </div>
    );
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} hide />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value.toLocaleString("fa-IR")}`,
              name === "volume" ? "حجم" : "تعداد"
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Bar yAxisId="left" dataKey="volume" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Heatmap Component (CSS Grid-based) ───
interface HeatmapCell {
  symbol: string;
  changePercent: number;
  value?: number;
}

interface HeatmapProps {
  data: HeatmapCell[];
  columns?: number;
}

export function Heatmap({ data, columns = 5 }: HeatmapProps) {
  const getColor = (changePercent: number): string => {
    const intensity = Math.min(Math.abs(changePercent) / 5, 1); // Normalize to 0-1
    
    if (changePercent >= 0) {
      // Green gradient
      const greenValue = Math.round(34 + (255 - 34) * (1 - intensity));
      return `rgb(34, ${greenValue}, 34)`;
    } else {
      // Red gradient
      const redValue = Math.round(239 + (255 - 239) * (1 - intensity));
      return `rgb(${redValue}, 68, 68)`;
    }
  };

  const getTextColor = (changePercent: number): string => {
    return Math.abs(changePercent) > 3 ? "#ffffff" : "#000000";
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        داده‌ای برای نمایش وجود ندارد
      </div>
    );
  }

  return (
    <div 
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {data.map((cell, idx) => (
        <div
          key={idx}
          className="aspect-square flex flex-col items-center justify-center rounded-md p-2 transition-all hover:scale-105 cursor-pointer"
          style={{
            backgroundColor: getColor(cell.changePercent),
            color: getTextColor(cell.changePercent),
          }}
          title={`${cell.symbol}: ${cell.changePercent.toFixed(2)}%`}
        >
          <span className="text-[10px] font-bold truncate w-full text-center">
            {cell.symbol}
          </span>
          <span className="text-[9px] font-semibold">
            {cell.changePercent >= 0 ? "+" : ""}{cell.changePercent.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}
