"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, Filter } from "lucide-react";
import { Stock } from "@/lib/types";
import StockCard from "./StockCard";

interface IndustryBucketsProps {
  stocks: Stock[];
  onRemove: (symbol: string) => void;
}

function groupByIndustry(stocks: Stock[]): Record<string, Stock[]> {
  const groups: Record<string, Stock[]> = {};
  for (const stock of stocks) {
    const key = stock.sector || stock.industry || "Other";
    if (!groups[key]) groups[key] = [];
    groups[key].push(stock);
  }
  return groups;
}

function IndustryGroup({
  industry,
  stocks,
  onRemove,
  defaultOpen,
}: {
  industry: string;
  stocks: Stock[];
  onRemove: (symbol: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const gainers = stocks.filter((s) => s.change >= 0).length;
  const losers = stocks.length - gainers;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:opacity-80"
        style={{ background: "var(--card-bg)" }}
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="w-4 h-4" style={{ color: "var(--muted)" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "var(--muted)" }} />
          )}
          <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            {industry}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: "var(--card-border)", color: "var(--muted)" }}
          >
            {stocks.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {gainers > 0 && (
            <span className="text-green-500 font-medium">▲ {gainers}</span>
          )}
          {losers > 0 && (
            <span className="text-red-500 font-medium">▼ {losers}</span>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {stocks.map((stock) => (
              <StockCard key={stock.symbol} stock={stock} onRemove={onRemove} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function IndustryBuckets({
  stocks,
  onRemove,
}: IndustryBucketsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const allIndustries = useMemo(() => {
    const set = new Set(stocks.map((s) => s.sector || s.industry || "Other"));
    return Array.from(set).sort();
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        s.symbol.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query);

      const industryKey = s.sector || s.industry || "Other";
      const matchesIndustry =
        selectedIndustries.length === 0 ||
        selectedIndustries.includes(industryKey);

      return matchesSearch && matchesIndustry;
    });
  }, [stocks, searchQuery, selectedIndustries]);

  const groups = useMemo(
    () => groupByIndustry(filteredStocks),
    [filteredStocks]
  );

  const sortedIndustries = Object.keys(groups).sort((a, b) =>
    a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)
  );

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((i) => i !== industry)
        : [...prev, industry]
    );
  };

  const hasFilters =
    searchQuery.trim() !== "" || selectedIndustries.length > 0;

  return (
    <div className="space-y-3">
      {/* Filter Bar */}
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-3 top-2.5"
              style={{ color: "var(--muted)" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by name or symbol…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              style={{
                background: "var(--input-bg)",
                borderColor: "var(--input-border)",
                color: "var(--foreground)",
              }}
            />
          </div>
          {allIndustries.length > 1 && (
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                selectedIndustries.length > 0
                  ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400"
                  : ""
              }`}
              style={
                selectedIndustries.length === 0
                  ? {
                      borderColor: "var(--input-border)",
                      color: "var(--muted)",
                      background: "var(--card-bg)",
                    }
                  : {}
              }
            >
              <Filter className="w-4 h-4" />
              <span>Industry</span>
              {selectedIndustries.length > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {selectedIndustries.length}
                </span>
              )}
            </button>
          )}
          {hasFilters && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedIndustries([]);
              }}
              className="text-xs font-medium text-blue-500 hover:text-blue-600 whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Industry filter pills */}
        {showFilters && allIndustries.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {allIndustries.map((industry) => {
              const active = selectedIndustries.includes(industry);
              return (
                <button
                  key={industry}
                  onClick={() => toggleIndustry(industry)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600"
                  }`}
                  style={
                    !active
                      ? {
                          borderColor: "var(--input-border)",
                          color: "var(--muted)",
                        }
                      : {}
                  }
                >
                  {industry}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Industry buckets */}
      {filteredStocks.length === 0 ? (
        <div
          className="rounded-xl border p-8 text-center text-sm"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--card-border)",
            color: "var(--muted)",
          }}
        >
          No stocks match your filters
        </div>
      ) : (
        <div className="space-y-3">
          {sortedIndustries.map((industry, i) => (
            <IndustryGroup
              key={industry}
              industry={industry}
              stocks={groups[industry]}
              onRemove={onRemove}
              defaultOpen={i < 3}
            />
          ))}
        </div>
      )}
    </div>
  );
}
