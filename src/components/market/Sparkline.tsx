import { useId } from "react";

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** تولید سری زمانی قطعی برای اسپارک‌لاین بر اساس نماد */
export function sparklineValues(seed: string, trend: number, points = 24): number[] {
  const rand = mulberry32(hashSeed(seed));
  const values: number[] = [];
  let v = 50;
  const drift = Math.max(-0.5, Math.min(0.5, trend * 6));
  for (let i = 0; i < points; i++) {
    v += (rand() - 0.48) * 9 + drift;
    values.push(v);
  }
  return values;
}

export function Sparkline({
  values,
  className,
  strokeWidth = 1.75,
  fill = true,
}: {
  values: number[];
  className?: string;
  strokeWidth?: number;
  fill?: boolean;
}) {
  const gradientId = useId().replace(/[:]/g, "");
  const w = 120;
  const h = 36;
  const pad = 3;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");

  const area = `${line} L${points[points.length - 1][0].toFixed(2)},${h} L${points[0][0].toFixed(2)},${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
