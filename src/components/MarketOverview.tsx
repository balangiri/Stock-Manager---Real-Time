"use client";

import { useState, useEffect, useCallback } from "react";
import { MarketIndex } from "@/lib/types";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function MarketOverview() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch("/api/market");
      const data = await res.json();
      if (Array.isArray(data)) setIndices(data);
    } catch (err) {
      console.error("Market fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarket();
    const interval = setInterval(fetchMarket, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchMarket]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (indices.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {indices.map((idx) => (
        <IndexCard key={idx.symbol} index={idx} />
      ))}
    </div>
  );
}

function IndexCard({ index }: { index: MarketIndex }) {
  const isPositive = index.change >= 0;
  const chartColor = isPositive ? "#22c55e" : "#ef4444";
  const chartGradient = isPositive ? "greenGrad" : "redGrad";

  // Format chart data for recharts
  const chartData = (index.chartData || []).map((d) => ({
    time: new Date(d.time).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: d.value,
  }));

  const minVal = chartData.length > 0
    ? Math.min(...chartData.map((d) => d.value)) * 0.999
    : 0;
  const maxVal = chartData.length > 0
    ? Math.max(...chartData.map((d) => d.value)) * 1.001
    : 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
      {/* Header */}
      <div className="p-4 pb-2 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            {index.name}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
            {index.price.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="text-right">
          <div
            className={`flex items-center gap-1 ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-bold">
              {isPositive ? "+" : ""}
              {index.change.toFixed(2)}
            </span>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
              isPositive
                ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            }`}
          >
            {isPositive ? "+" : ""}
            {index.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-32 px-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`${chartGradient}-${index.symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                hide
              />
              <YAxis domain={[minVal, maxVal]} hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(value) => [
                  Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 }),
                  index.name,
                ]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#${chartGradient}-${index.symbol})`}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center text-gray-400 dark:text-gray-500 text-xs">
          Chart data unavailable
        </div>
      )}

      {/* Footer stats */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
        <span>
          Prev Close:{" "}
          <strong>
            {(index.previousClose ?? 0).toLocaleString("en-IN", {
              maximumFractionDigits: 2,
            })}
          </strong>
        </span>
        <span>
          Day:{" "}
          <strong>
            {(index.dayLow ?? 0).toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            })}{" "}
            –{" "}
            {(index.dayHigh ?? 0).toLocaleString("en-IN", {
              maximumFractionDigits: 0,
            })}
          </strong>
        </span>
      </div>
    </div>
  );
}
