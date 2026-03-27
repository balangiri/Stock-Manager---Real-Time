"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Stock, NewsItem, WatchlistItem } from "@/lib/types";
import StockCard from "@/components/StockCard";
import WatchlistPanel from "@/components/WatchlistPanel";
import NewsFeed from "@/components/NewsFeed";
import MarketIndices from "@/components/MarketIndices";
import IndustryBuckets from "@/components/IndustryBuckets";
import ThemeToggle from "@/components/ThemeToggle";
import { BarChart3, RefreshCw, Loader2, LayoutGrid, List } from "lucide-react";

const REFRESH_INTERVAL = 15000; // 15 seconds

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"industry" | "list">("industry");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch watchlist from Supabase
  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      if (Array.isArray(data)) setWatchlist(data);
    } catch (err) {
      console.error("Failed to fetch watchlist:", err);
    }
  }, []);

  // Fetch stock prices for all watchlist items
  const fetchStocks = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) {
      setStocks([]);
      return;
    }
    try {
      const res = await fetch(`/api/stocks?symbols=${symbols.join(",")}`);
      const data = await res.json();
      if (Array.isArray(data)) setStocks(data);
    } catch (err) {
      console.error("Failed to fetch stocks:", err);
    }
  }, []);

  // Fetch news for watchlist stocks
  const fetchNews = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) {
      setNews([]);
      return;
    }
    try {
      const res = await fetch(`/api/news?symbols=${symbols.join(",")}`);
      const data = await res.json();
      if (Array.isArray(data)) setNews(data);
    } catch (err) {
      console.error("Failed to fetch news:", err);
    }
  }, []);

  // Load everything on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchWatchlist();
      setLoading(false);
    };
    init();
  }, [fetchWatchlist]);

  // When watchlist changes, fetch stocks + news
  useEffect(() => {
    if (watchlist.length > 0) {
      const symbols = watchlist.map((w) => w.symbol);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchStocks(symbols);
      fetchNews(symbols);
    } else {
      setStocks([]);
      setNews([]);
    }
  }, [watchlist, fetchStocks, fetchNews]);

  // Auto-refresh stock prices every 15 seconds
  useEffect(() => {
    if (watchlist.length === 0) return;

    intervalRef.current = setInterval(() => {
      const symbols = watchlist.map((w) => w.symbol);
      fetchStocks(symbols);
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [watchlist, fetchStocks]);

  // Add stock to watchlist
  const handleAddStock = async (symbol: string, name: string) => {
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, name }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add");
    }

    await fetchWatchlist();
  };

  // Remove stock from watchlist
  const handleRemoveStock = async (symbol: string) => {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol }),
    });
    await fetchWatchlist();
  };

  // Summarize a news article with sentiment
  const handleSummarize = async (index: number) => {
    const item = news[index];
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          analyzeSentiment: true,
        }),
      });
      const data = await res.json();

      setNews((prev) =>
        prev.map((n, i) =>
          i === index
            ? { ...n, summary: data.summary, sentiment: data.sentiment }
            : n
        )
      );
    } catch (err) {
      console.error("Summarize error:", err);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    const symbols = watchlist.map((w) => w.symbol);
    await Promise.all([fetchStocks(symbols), fetchNews(symbols)]);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header
        className="border-b sticky top-0 z-10"
        style={{
          background: "var(--header-bg)",
          borderColor: "var(--header-border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1
                className="text-xl font-bold"
                style={{ color: "var(--foreground)" }}
              >
                Stock Intel
              </h1>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                AI-powered stock intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className="text-xs hidden sm:inline"
              style={{ color: "var(--muted)" }}
            >
              Auto-refreshes every 15s
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-50"
              style={{
                color: "var(--muted)",
                borderColor: "var(--card-border)",
                background: "var(--card-bg)",
              }}
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Market Indices Section */}
        <MarketIndices />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Watchlist */}
          <div className="lg:col-span-2 space-y-4">
            <WatchlistPanel onAdd={handleAddStock} />

            {stocks.length > 0 && (
              <>
                {/* View mode toggle */}
                <div className="flex items-center justify-between">
                  <h2
                    className="text-base font-semibold"
                    style={{ color: "var(--foreground)" }}
                  >
                    My Watchlist
                    <span
                      className="ml-2 text-xs font-normal"
                      style={{ color: "var(--muted)" }}
                    >
                      ({stocks.length} stocks)
                    </span>
                  </h2>
                  <div
                    className="flex items-center rounded-lg border p-0.5 gap-0.5"
                    style={{
                      borderColor: "var(--card-border)",
                      background: "var(--card-bg)",
                    }}
                  >
                    <button
                      onClick={() => setViewMode("industry")}
                      title="Industry view"
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        viewMode === "industry"
                          ? "bg-blue-600 text-white"
                          : ""
                      }`}
                      style={
                        viewMode !== "industry"
                          ? { color: "var(--muted)" }
                          : {}
                      }
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">By Industry</span>
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      title="List view"
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        viewMode === "list" ? "bg-blue-600 text-white" : ""
                      }`}
                      style={
                        viewMode !== "list" ? { color: "var(--muted)" } : {}
                      }
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">All</span>
                    </button>
                  </div>
                </div>

                {viewMode === "industry" ? (
                  <IndustryBuckets
                    stocks={stocks}
                    onRemove={handleRemoveStock}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {stocks.map((stock) => (
                      <StockCard
                        key={stock.symbol}
                        stock={stock}
                        onRemove={handleRemoveStock}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {stocks.length === 0 && (
              <div
                className="rounded-xl border p-12 text-center"
                style={{
                  background: "var(--card-bg)",
                  borderColor: "var(--card-border)",
                }}
              >
                <BarChart3
                  className="w-16 h-16 mx-auto mb-4"
                  style={{ color: "var(--card-border)" }}
                />
                <h3
                  className="text-lg font-medium mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  Your watchlist is empty
                </h3>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Add stocks like RELIANCE, TCS, or INFY to get started
                </p>
              </div>
            )}
          </div>

          {/* Right Column: News */}
          <div>
            <NewsFeed news={news} onSummarize={handleSummarize} />
          </div>
        </div>
      </main>
    </div>
  );
}
