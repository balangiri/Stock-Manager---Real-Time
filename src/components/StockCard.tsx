"use client";

import { Stock } from "@/lib/types";
import { TrendingUp, TrendingDown, X } from "lucide-react";
import Link from "next/link";

interface StockCardProps {
  stock: Stock;
  onRemove: (symbol: string) => void;
}

export default function StockCard({ stock, onRemove }: StockCardProps) {
  const isPositive = stock.change >= 0;

  return (
    <div
      className="rounded-xl border p-4 hover:shadow-md transition-shadow"
      style={{
        background: "var(--card-bg)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="flex items-start justify-between">
        <Link href={`/stock/${stock.symbol}`} className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className="font-bold text-lg"
              style={{ color: "var(--foreground)" }}
            >
              {stock.symbol}
            </span>
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          <p
            className="text-sm truncate max-w-[180px]"
            style={{ color: "var(--muted)" }}
          >
            {stock.name}
          </p>
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            onRemove(stock.symbol);
          }}
          className="text-gray-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors p-1"
          title="Remove from watchlist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Link href={`/stock/${stock.symbol}`}>
        <div className="mt-3">
          <span
            className="text-2xl font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            ₹{stock.price.toFixed(2)}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-sm font-medium ${
                isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {isPositive ? "+" : ""}
              {stock.change.toFixed(2)}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isPositive
                  ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {isPositive ? "+" : ""}
              {stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
