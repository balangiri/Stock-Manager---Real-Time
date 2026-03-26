"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Stock, NewsItem, WatchlistItem } from "@/lib/types";
import StockCard from "@/components/StockCard";
import WatchlistPanel from "@/components/WatchlistPanel";
import NewsFeed from "@/components/NewsFeed";
import { BarChart3, RefreshCw, Loader2, Search } from "lucide-react";

const REFRESH_INTERVAL = 15000; // 15 seconds

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
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

  // Summarize a news article
  const handleSummarize = async (index: number) => {
    const item = news[index];
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
        }),
      });
      const data = await res.json();

      setNews((prev) =>
        prev.map((n, i) => (i === index ? { ...n, summary: data.summary } : n))
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

  // Filter stocks by search query
  const filteredStocks = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(filterQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Stock Intel</h1>
              <p className="text-xs text-gray-500">
                AI-powered stock intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Auto-refreshes every 15s
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-blue-600 border border-gray-300 rounded-lg hover:border-blue-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Watchlist */}
          <div className="lg:col-span-2 space-y-4">
            <WatchlistPanel onAdd={handleAddStock} />

            {/* Search/Filter bar for existing watchlist */}
            {stocks.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter watchlist by name or symbol..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                />
              </div>
            )}

            {stocks.length > 0 ? (
              filteredStocks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredStocks.map((stock) => (
                    <StockCard
                      key={stock.symbol}
                      stock={stock}
                      onRemove={handleRemoveStock}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500">
                    No stocks match &quot;{filterQuery}&quot;
                  </p>
                </div>
              )
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">
                  Your watchlist is empty
                </h3>
                <p className="text-sm text-gray-500">
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
