"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { HeatmapStock, WatchlistItem } from "@/lib/types";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowLeft,
  Loader2,
  BarChart3,
  Settings2,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────
type SizeBy = "marketCap" | "volume" | "weeklyVolume" | "monthlyVolume";
type ColorBy = "changePercent" | "weeklyChange" | "monthlyChange" | "yearlyChange";
type GroupBy = "none" | "sector" | "industry";

const SIZE_OPTIONS: { value: SizeBy; label: string }[] = [
  { value: "marketCap", label: "Market Cap" },
  { value: "volume", label: "Volume (1D)" },
  { value: "weeklyVolume", label: "Volume (1W)" },
  { value: "monthlyVolume", label: "Volume (1M)" },
];

const COLOR_OPTIONS: { value: ColorBy; label: string }[] = [
  { value: "changePercent", label: "Daily %" },
  { value: "weeklyChange", label: "Weekly %" },
  { value: "monthlyChange", label: "Monthly %" },
  { value: "yearlyChange", label: "52 Week %" },
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "sector", label: "Sector" },
  { value: "industry", label: "Industry" },
];

// ─── Color Scale Ranges ────────────────────────────────────────
const COLOR_SCALES: Record<ColorBy, number> = {
  changePercent: 8,
  weeklyChange: 8,
  monthlyChange: 15,
  yearlyChange: 50,
};

// ─── Color Utilities ───────────────────────────────────────────
function getHeatColor(value: number, scale: number = 8): string {
  const clamped = Math.max(-scale, Math.min(scale, value));
  const intensity = Math.abs(clamped) / scale;

  if (value > 0) {
    const r = Math.round(20 + (1 - intensity) * 30);
    const g = Math.round(80 + intensity * 100);
    const b = Math.round(20 + (1 - intensity) * 30);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (value < 0) {
    const r = Math.round(80 + intensity * 120);
    const g = Math.round(20 + (1 - intensity) * 30);
    const b = Math.round(20 + (1 - intensity) * 20);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return "rgb(60, 60, 70)";
}

function getTextColor(value: number, scale: number = 8): string {
  const intensity = Math.min(Math.abs(value) / scale, 1);
  return intensity > 0.3 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)";
}

// ─── Treemap Layout (Squarified) ───────────────────────────────
interface TreemapRect {
  stock: HeatmapStock;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GroupedTreemap {
  group: string;
  rects: TreemapRect[];
  x: number;
  y: number;
  w: number;
  h: number;
}

function squarify(
  items: { stock: HeatmapStock; value: number }[],
  x: number,
  y: number,
  w: number,
  h: number
): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ stock: items[0].stock, x, y, w, h }];
  }

  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) {
    // Equal distribution
    const perItem = 1 / items.length;
    return items.map((item, idx) => ({
      stock: item.stock,
      x: x + (w * idx * perItem),
      y,
      w: w * perItem,
      h,
    }));
  }

  // Sort descending
  const sorted = [...items].sort((a, b) => b.value - a.value);

  // Simple slice-and-dice with aspect ratio optimization
  const result: TreemapRect[] = [];
  layoutStrip(sorted, total, x, y, w, h, result);
  return result;
}

function layoutStrip(
  items: { stock: HeatmapStock; value: number }[],
  total: number,
  x: number,
  y: number,
  w: number,
  h: number,
  result: TreemapRect[]
) {
  if (items.length === 0) return;
  if (items.length === 1) {
    result.push({ stock: items[0].stock, x, y, w, h });
    return;
  }

  const isWide = w >= h;

  // Find best split point
  let bestAspect = Infinity;
  let bestSplit = 1;

  for (let i = 1; i < items.length; i++) {
    const leftSum = items.slice(0, i).reduce((s, it) => s + it.value, 0);
    const ratio = total > 0 ? leftSum / total : i / items.length;

    if (isWide) {
      const stripW = w * ratio;
      const worst = worstAspect(items.slice(0, i), leftSum, stripW, h);
      if (worst < bestAspect) {
        bestAspect = worst;
        bestSplit = i;
      }
    } else {
      const stripH = h * ratio;
      const worst = worstAspect(items.slice(0, i), leftSum, w, stripH);
      if (worst < bestAspect) {
        bestAspect = worst;
        bestSplit = i;
      }
    }
  }

  const leftItems = items.slice(0, bestSplit);
  const rightItems = items.slice(bestSplit);
  const leftSum = leftItems.reduce((s, it) => s + it.value, 0);
  const rightSum = rightItems.reduce((s, it) => s + it.value, 0);
  const ratio = total > 0 ? leftSum / total : 0.5;

  if (isWide) {
    const leftW = w * ratio;
    layoutColumn(leftItems, leftSum, x, y, leftW, h, result);
    layoutStrip(rightItems, rightSum, x + leftW, y, w - leftW, h, result);
  } else {
    const leftH = h * ratio;
    layoutRow(leftItems, leftSum, x, y, w, leftH, result);
    layoutStrip(rightItems, rightSum, x, y + leftH, w, h - leftH, result);
  }
}

function layoutColumn(
  items: { stock: HeatmapStock; value: number }[],
  total: number,
  x: number,
  y: number,
  w: number,
  h: number,
  result: TreemapRect[]
) {
  let cy = y;
  for (const item of items) {
    const ratio = total > 0 ? item.value / total : 1 / items.length;
    const itemH = h * ratio;
    result.push({ stock: item.stock, x, y: cy, w, h: itemH });
    cy += itemH;
  }
}

function layoutRow(
  items: { stock: HeatmapStock; value: number }[],
  total: number,
  x: number,
  y: number,
  w: number,
  h: number,
  result: TreemapRect[]
) {
  let cx = x;
  for (const item of items) {
    const ratio = total > 0 ? item.value / total : 1 / items.length;
    const itemW = w * ratio;
    result.push({ stock: item.stock, x: cx, y, w: itemW, h });
    cx += itemW;
  }
}

function worstAspect(
  items: { stock: HeatmapStock; value: number }[],
  total: number,
  w: number,
  h: number
): number {
  let worst = 0;
  let offset = 0;
  for (const item of items) {
    const ratio = total > 0 ? item.value / total : 1 / items.length;
    const iw = w;
    const ih = h * ratio;
    const aspect = iw > ih ? iw / ih : ih / iw;
    if (aspect > worst) worst = aspect;
    offset += ih;
  }
  return worst;
}

// ─── Treemap Tile Component ────────────────────────────────────
function TreemapTile({
  rect,
  colorBy,
  containerW,
  containerH,
}: {
  rect: TreemapRect;
  colorBy: ColorBy;
  containerW: number;
  containerH: number;
}) {
  const colorValue = rect.stock[colorBy];
  const scale = COLOR_SCALES[colorBy];
  const bgColor = getHeatColor(colorValue, scale);
  const txtColor = getTextColor(colorValue, scale);

  const pxW = rect.w * containerW;
  const pxH = rect.h * containerH;

  // Determine what text to show based on tile size
  const showSymbol = pxW > 40 && pxH > 25;
  const showPrice = pxW > 60 && pxH > 45;
  const showChange = pxW > 50 && pxH > 60;

  // Font size scales with tile size
  const symbolSize = Math.min(Math.max(pxW / 8, 10), 18);
  const detailSize = Math.min(Math.max(pxW / 12, 8), 13);

  return (
    <Link
      href={`/stock/${rect.stock.symbol}`}
      className="absolute border border-black/20 overflow-hidden transition-all duration-200 hover:brightness-125 hover:z-10 hover:border-white/40 cursor-pointer"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
        backgroundColor: bgColor,
      }}
    >
      <div className="w-full h-full flex flex-col items-center justify-center p-1 select-none">
        {showSymbol && (
          <span
            className="font-bold leading-tight text-center"
            style={{ color: txtColor, fontSize: `${symbolSize}px` }}
          >
            {rect.stock.symbol}
          </span>
        )}
        {showPrice && (
          <span
            className="leading-tight opacity-80"
            style={{ color: txtColor, fontSize: `${detailSize}px` }}
          >
            ₹{rect.stock.price.toFixed(0)}
          </span>
        )}
        {showChange && (
          <span
            className="leading-tight font-semibold"
            style={{ color: txtColor, fontSize: `${detailSize}px` }}
          >
            {colorValue >= 0 ? "+" : ""}
            {colorValue.toFixed(2)}%
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Main Heatmap Page ─────────────────────────────────────────
export default function HeatmapPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stocks, setStocks] = useState<HeatmapStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [sizeBy, setSizeBy] = useState<SizeBy>("marketCap");
  const [colorBy, setColorBy] = useState<ColorBy>("changePercent");
  const [groupBy, setGroupBy] = useState<GroupBy>("sector");
  const [hoveredStock, setHoveredStock] = useState<HeatmapStock | null>(null);
  const [controlsOpen, setControlsOpen] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  // Fetch watchlist then heatmap data
  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      // Get watchlist
      const wlRes = await fetch("/api/watchlist", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const watchlist: WatchlistItem[] = await wlRes.json();

      if (!Array.isArray(watchlist) || watchlist.length === 0) {
        setStocks([]);
        setLoading(false);
        return;
      }

      const symbols = watchlist.map((w) => w.symbol).join(",");
      const hmRes = await fetch(`/api/heatmap?symbols=${symbols}`);
      const data = await hmRes.json();
      if (Array.isArray(data)) setStocks(data);
    } catch (err) {
      console.error("Heatmap fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (user && session) fetchData();
  }, [user, session, fetchData]);

  // Build treemap layout
  const treemapData = useMemo(() => {
    if (stocks.length === 0) return { groups: [] as GroupedTreemap[] };

    const getSizeValue = (s: HeatmapStock) => {
      const v = s[sizeBy] ?? 0;
      return Math.max(v, 0.01); // avoid zero-size
    };

    if (groupBy === "none") {
      const items = stocks.map((s) => ({ stock: s, value: getSizeValue(s) }));
      const rects = squarify(items, 0, 0, 1, 1);
      return {
        groups: [{ group: "", rects, x: 0, y: 0, w: 1, h: 1 }],
      };
    }

    // Group stocks
    const groupMap = new Map<string, HeatmapStock[]>();
    for (const s of stocks) {
      const key = groupBy === "sector" ? s.sector : s.industry;
      const group = key || "Other";
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push(s);
    }

    // Sort groups by total size value
    const groupEntries = [...groupMap.entries()]
      .map(([name, groupStocks]) => ({
        name,
        stocks: groupStocks,
        totalValue: groupStocks.reduce((s, st) => s + getSizeValue(st), 0),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const totalAll = groupEntries.reduce((s, g) => s + g.totalValue, 0);

    // Layout groups as horizontal strips
    const groups: GroupedTreemap[] = [];
    let yOffset = 0;

    for (const entry of groupEntries) {
      const ratio = totalAll > 0 ? entry.totalValue / totalAll : 1 / groupEntries.length;
      const groupH = ratio;
      const items = entry.stocks.map((s) => ({
        stock: s,
        value: getSizeValue(s),
      }));
      const rects = squarify(items, 0, 0, 1, 1);

      // Remap rects to group's area
      const remapped = rects.map((r) => ({
        ...r,
        x: r.x,
        y: yOffset + r.y * groupH,
        w: r.w,
        h: r.h * groupH,
      }));

      groups.push({
        group: entry.name,
        rects: remapped,
        x: 0,
        y: yOffset,
        w: 1,
        h: groupH,
      });

      yOffset += groupH;
    }

    return { groups };
  }, [stocks, sizeBy, groupBy]);

  // Container dimensions for text sizing
  const containerW = 1200;
  const containerH = 700;

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="border-b sticky top-0 z-20"
        style={{ background: "var(--header-bg)", borderColor: "var(--header-border)" }}
      >
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm hover:text-blue-600 transition-colors"
              style={{ color: "var(--muted)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <div className="h-5 w-px" style={{ background: "var(--card-border)" }} />
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h1 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                Stock Heatmap
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                {stocks.length} stocks
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setControlsOpen(!controlsOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                controlsOpen ? "bg-blue-600 text-white border-blue-600" : ""
              }`}
              style={
                !controlsOpen
                  ? { color: "var(--muted)", borderColor: "var(--card-border)", background: "var(--card-bg)" }
                  : {}
              }
            >
              <Settings2 className="w-3.5 h-3.5" />
              Controls
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      {controlsOpen && (
        <div
          className="border-b px-4 py-3"
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
        >
          <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-6">
            {/* Size By */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Size by
              </span>
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
                {SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSizeBy(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      sizeBy === opt.value
                        ? "bg-blue-600 text-white"
                        : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    }`}
                    style={
                      sizeBy !== opt.value
                        ? { color: "var(--foreground)", background: "var(--background)" }
                        : {}
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color By */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Color by
              </span>
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setColorBy(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      colorBy === opt.value
                        ? "bg-blue-600 text-white"
                        : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    }`}
                    style={
                      colorBy !== opt.value
                        ? { color: "var(--foreground)", background: "var(--background)" }
                        : {}
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Group By */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                Group by
              </span>
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--card-border)" }}>
                {GROUP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setGroupBy(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      groupBy === opt.value
                        ? "bg-blue-600 text-white"
                        : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    }`}
                    style={
                      groupBy !== opt.value
                        ? { color: "var(--foreground)", background: "var(--background)" }
                        : {}
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Legend */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>-{COLOR_SCALES[colorBy]}%</span>
              <div className="flex h-3 rounded overflow-hidden">
                {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((v) => {
                  const scale = COLOR_SCALES[colorBy];
                  const scaledV = (v / 4) * scale;
                  return (
                    <div
                      key={v}
                      className="w-5 h-3"
                      style={{ backgroundColor: getHeatColor(scaledV, scale) }}
                    />
                  );
                })}
              </div>
              <span className="text-[10px]" style={{ color: "var(--muted)" }}>+{COLOR_SCALES[colorBy]}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip info bar */}
      <div
        className="border-b px-4 py-1.5 min-h-[36px] flex items-center"
        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
      >
        {hoveredStock ? (
          <div className="max-w-[1600px] mx-auto flex items-center gap-4 text-xs w-full">
            <span className="font-bold" style={{ color: "var(--foreground)" }}>
              {hoveredStock.symbol}
            </span>
            <span style={{ color: "var(--muted)" }}>{hoveredStock.name}</span>
            <span style={{ color: "var(--foreground)" }}>₹{hoveredStock.price.toFixed(2)}</span>
            <span className={hoveredStock.changePercent >= 0 ? "text-green-500" : "text-red-500"}>
              {hoveredStock.changePercent >= 0 ? "+" : ""}{hoveredStock.changePercent.toFixed(2)}% today
            </span>
            <span className={hoveredStock.weeklyChange >= 0 ? "text-green-500" : "text-red-500"}>
              {hoveredStock.weeklyChange >= 0 ? "+" : ""}{hoveredStock.weeklyChange.toFixed(2)}% week
            </span>
            <span className={hoveredStock.monthlyChange >= 0 ? "text-green-500" : "text-red-500"}>
              {hoveredStock.monthlyChange >= 0 ? "+" : ""}{hoveredStock.monthlyChange.toFixed(2)}% month
            </span>
            <span className={hoveredStock.yearlyChange >= 0 ? "text-green-500" : "text-red-500"}>
              {hoveredStock.yearlyChange >= 0 ? "+" : ""}{hoveredStock.yearlyChange.toFixed(2)}% 52W
            </span>
            <span style={{ color: "var(--muted)" }}>
              MCap: ₹{hoveredStock.marketCap >= 1e12 ? (hoveredStock.marketCap / 1e12).toFixed(2) + "T" : hoveredStock.marketCap >= 1e9 ? (hoveredStock.marketCap / 1e9).toFixed(2) + "B" : (hoveredStock.marketCap / 1e7).toFixed(2) + "Cr"}
            </span>
            <span style={{ color: "var(--muted)" }}>{hoveredStock.sector}</span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Hover over a stock for details. Click to view full analysis.
          </span>
        )}
      </div>

      {/* Heatmap */}
      <main className="px-4 py-4">
        <div className="max-w-[1600px] mx-auto">
          {loading ? (
            <div
              className="rounded-xl border flex items-center justify-center"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                height: `${containerH}px`,
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  Loading heatmap data...
                </span>
              </div>
            </div>
          ) : stocks.length === 0 ? (
            <div
              className="rounded-xl border flex flex-col items-center justify-center p-12"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--card-border)",
                height: `${containerH}px`,
              }}
            >
              <BarChart3 className="w-16 h-16 mb-4" style={{ color: "var(--card-border)" }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: "var(--foreground)" }}>
                No stocks in your watchlist
              </h3>
              <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
                Add stocks to your watchlist on the Dashboard to see them here
              </p>
              <Link
                href="/"
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div
              className="rounded-xl border overflow-hidden relative"
              style={{
                borderColor: "var(--card-border)",
                height: `${containerH}px`,
              }}
            >
              {/* Group labels */}
              {groupBy !== "none" &&
                treemapData.groups.map((g) => (
                  <div
                    key={g.group}
                    className="absolute z-10 pointer-events-none"
                    style={{
                      left: `${g.x * 100}%`,
                      top: `${g.y * 100}%`,
                      width: `${g.w * 100}%`,
                      height: `${g.h * 100}%`,
                    }}
                  >
                    {/* Group label at top-left */}
                    {g.h * containerH > 30 && (
                      <div className="absolute top-0 left-0 z-20 px-2 py-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 drop-shadow-lg">
                          {g.group}
                        </span>
                      </div>
                    )}
                    {/* Group border */}
                    <div
                      className="absolute inset-0 border-2 border-black/40 pointer-events-none"
                      style={{ borderRadius: "1px" }}
                    />
                  </div>
                ))}

              {/* Stock tiles */}
              {treemapData.groups.flatMap((g) =>
                g.rects.map((rect) => (
                  <div
                    key={rect.stock.symbol}
                    onMouseEnter={() => setHoveredStock(rect.stock)}
                    onMouseLeave={() => setHoveredStock(null)}
                  >
                    <TreemapTile
                      rect={rect}
                      colorBy={colorBy}
                      containerW={containerW}
                      containerH={containerH}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
