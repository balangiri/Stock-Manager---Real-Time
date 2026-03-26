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
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <Link href={`/stock/${stock.symbol}`} className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-gray-900">
              {stock.symbol}
            </span>
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
          </div>
          <p className="text-sm text-gray-500 truncate max-w-[180px]">
            {stock.name}
          </p>
        </Link>
        <button
          onClick={(e) => {
            e.preventDefault();
            onRemove(stock.symbol);
          }}
          className="text-gray-300 hover:text-red-500 transition-colors p-1"
          title="Remove from watchlist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Link href={`/stock/${stock.symbol}`}>
        <div className="mt-3">
          <span className="text-2xl font-semibold text-gray-900">
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
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
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
