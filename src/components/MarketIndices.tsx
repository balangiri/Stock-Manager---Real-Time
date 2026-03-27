"use client";

import { useEffect, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react";
import { MarketIndex } from "@/lib/types";
import Sparkline from "./Sparkline";

const REFRESH_INTERVAL = 30000; // 30 seconds

function IndexCard({ index }: { index: MarketIndex }) {
  const isPositive = index.change >= 0;

  const formatPrice = (n: number) =>
    n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  return (
    <div className="flex-1 min-w-0 rounded-2xl border p-5 transition-shadow hover:shadow-md"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--muted)" }}
          >
            {index.name}
          </p>
          <p className="text-3xl font-bold mt-1 tabular-nums"
            style={{ color: "var(--foreground)" }}
          >
            {formatPrice(index.price)}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={`flex items-center gap-1 text-sm font-semibold ${
                isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {isPositive ? "+" : ""}
              {index.change.toFixed(2)}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isPositive
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {index.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 self-center">
          <Sparkline
            data={index.sparkline}
            width={130}
            height={52}
            className="opacity-90"
          />
        </div>
      </div>
      <p className="text-xs mt-3"
        style={{ color: "var(--muted)" }}
      >
        30-day performance
      </p>
    </div>
  );
}

export default function MarketIndices() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIndices = useCallback(async () => {
    try {
      const res = await fetch("/api/indices");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (Array.isArray(data)) {
        setIndices(data);
        setError(null);
      }
    } catch {
      setError("Unable to load market indices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndices();
    const id = setInterval(fetchIndices, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchIndices]);

  if (loading) {
    return (
      <div className="flex gap-4 mb-6">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex-1 rounded-2xl border p-5 animate-pulse"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
          >
            <div className="h-3 rounded w-16 mb-3"
              style={{ background: "var(--card-border)" }}
            />
            <div className="h-8 rounded w-32 mb-2"
              style={{ background: "var(--card-border)" }}
            />
            <div className="h-3 rounded w-24"
              style={{ background: "var(--card-border)" }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl border p-4 mb-6 text-sm"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
          color: "var(--muted)",
        }}
      >
        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
        {error}
        <button
          onClick={fetchIndices}
          className="ml-auto text-xs text-blue-500 hover:text-blue-600 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (indices.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border p-4 mb-6"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          Loading market data…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {indices.map((index) => (
        <IndexCard key={index.symbol} index={index} />
      ))}
    </div>
  );
}
