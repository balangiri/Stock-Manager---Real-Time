"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { Stock } from "@/lib/types";
import StockCard from "./StockCard";

interface IndustryBucketsProps {
  stocks: Stock[];
  onRemove: (symbol: string) => void;
}

function getIndustryKey(stock: Stock): string {
  return stock.sector || stock.industry || "Other";
}

function groupByIndustry(stocks: Stock[]): Record<string, Stock[]> {
  const groups: Record<string, Stock[]> = {};
  for (const stock of stocks) {
    const key = getIndustryKey(stock);
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
        aria-expanded={open}
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

const ALL_INDUSTRIES = "All";

export default function IndustryBuckets({
  stocks,
  onRemove,
}: IndustryBucketsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>(ALL_INDUSTRIES);

  // Pre-compute industry groups from ALL stocks upfront — independent of search or filter
  const allGroups = useMemo(() => groupByIndustry(stocks), [stocks]);

  // Derive stable list of industry names from pre-computed groups
  const allIndustries = useMemo(() => {
    return Object.keys(allGroups).sort((a, b) =>
      a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)
    );
  }, [allGroups]);

  // Filter within pre-computed groups: apply industry selection + search independently
  const visibleGroups = useMemo(() => {
    const industriesToShow =
      selectedIndustry === ALL_INDUSTRIES
        ? allIndustries
        : allIndustries.filter((i) => i === selectedIndustry);

    const result: Record<string, Stock[]> = {};
    for (const industry of industriesToShow) {
      const group = allGroups[industry];
      if (!group) continue;
      const query = searchQuery.trim().toLowerCase();
      const filtered = query
        ? group.filter(
            (s) =>
              s.symbol.toLowerCase().includes(query) ||
              s.name.toLowerCase().includes(query)
          )
        : group;
      if (filtered.length > 0) result[industry] = filtered;
    }
    return result;
  }, [allGroups, allIndustries, selectedIndustry, searchQuery]);

  const sortedVisibleIndustries = useMemo(
    () =>
      Object.keys(visibleGroups).sort((a, b) =>
        a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)
      ),
    [visibleGroups]
  );

  const hasActiveFilter =
    searchQuery.trim() !== "" || selectedIndustry !== ALL_INDUSTRIES;

  const totalVisible = Object.values(visibleGroups).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

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
        {/* Search + clear row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="w-4 h-4 absolute left-3 top-2.5"
              style={{ color: "var(--muted)" }}
              aria-hidden="true"
            />
            <label htmlFor="industry-search" className="sr-only">
              Search stocks by name or symbol
            </label>
            <input
              id="industry-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or symbol…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              style={{
                background: "var(--input-bg)",
                borderColor: "var(--input-border)",
                color: "var(--foreground)",
              }}
            />
          </div>
          {hasActiveFilter && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedIndustry(ALL_INDUSTRIES);
              }}
              aria-label="Clear all filters"
              className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600 whitespace-nowrap"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>

        {/* Industry filter chips — always visible, derived from pre-computed groups */}
        {allIndustries.length > 1 && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by industry"
          >
            {/* "All" chip */}
            <button
              onClick={() => setSelectedIndustry(ALL_INDUSTRIES)}
              aria-pressed={selectedIndustry === ALL_INDUSTRIES}
              aria-label={`Show all industries, ${stocks.length} stocks`}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedIndustry === ALL_INDUSTRIES
                  ? "bg-blue-600 text-white border-blue-600"
                  : "hover:border-blue-400 hover:text-blue-600"
              }`}
              style={
                selectedIndustry !== ALL_INDUSTRIES
                  ? { borderColor: "var(--input-border)", color: "var(--muted)" }
                  : {}
              }
            >
              All
              <span className="ml-1 opacity-70">({stocks.length})</span>
            </button>

            {/* Per-industry chips */}
            {allIndustries.map((industry) => {
              const active = selectedIndustry === industry;
              const count = allGroups[industry]?.length ?? 0;
              return (
                <button
                  key={industry}
                  onClick={() => setSelectedIndustry(industry)}
                  aria-pressed={active}
                  aria-label={`Filter to ${industry}, ${count} stocks`}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "hover:border-blue-400 hover:text-blue-600"
                  }`}
                  style={
                    !active
                      ? { borderColor: "var(--input-border)", color: "var(--muted)" }
                      : {}
                  }
                >
                  {industry}
                  <span className="ml-1 opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Industry buckets */}
      {totalVisible === 0 ? (
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
          {sortedVisibleIndustries.map((industry, i) => (
            <IndustryGroup
              key={industry}
              industry={industry}
              stocks={visibleGroups[industry]}
              onRemove={onRemove}
              defaultOpen={i < 3}
            />
          ))}
        </div>
      )}
    </div>
  );
}
