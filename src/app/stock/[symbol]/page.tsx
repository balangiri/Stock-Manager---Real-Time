"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { StockDetail, NewsItem } from "@/lib/types";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Loader2,
  DollarSign,
  BarChart3,
  Activity,
  PieChart,
  Newspaper,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

const REFRESH_INTERVAL = 15000;

export default function StockDetailPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = use(params);
  const [stock, setStock] = useState<StockDetail | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summarizing, setSummarizing] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/stocks/${symbol}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStock(data);
    } catch {
      setError("Failed to load stock details");
    }
  }, [symbol]);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch(`/api/news?symbols=${symbol}`);
      const data = await res.json();
      if (Array.isArray(data)) setNews(data);
    } catch {
      console.error("Failed to fetch news for", symbol);
    }
  }, [symbol]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchDetail(), fetchNews()]);
      setLoading(false);
    };
    init();
  }, [fetchDetail, fetchNews]);

  // Auto-refresh price every 15s
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchDetail();
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchDetail]);

  const handleSummarize = async (index: number) => {
    const item = news[index];
    setSummarizing(index);
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
    } catch {
      console.error("Summarize error");
    } finally {
      setSummarizing(null);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `₹${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `₹${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `₹${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e5) return `₹${(num / 1e5).toFixed(2)}L`;
    return `₹${num.toFixed(2)}`;
  };

  const formatVolume = (num: number) => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const timeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <p className="text-red-500 mb-4">{error || "Stock not found"}</p>
        <Link href="/" className="text-blue-600 hover:underline">
          Go back
        </Link>
      </div>
    );
  }

  const isPositive = stock.change >= 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <span className="text-xs text-gray-400">
              Auto-refreshes every 15s
            </span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {stock.symbol}
              </h1>
              <p className="text-gray-500">{stock.name}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">
                ₹{stock.price.toFixed(2)}
              </p>
              <div className="flex items-center gap-2 justify-end mt-1">
                {isPositive ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
                <span
                  className={`text-lg font-semibold ${
                    isPositive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {stock.change.toFixed(2)} ({isPositive ? "+" : ""}
                  {stock.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<DollarSign className="w-5 h-5 text-blue-500" />}
            label="Market Cap"
            value={formatNumber(stock.marketCap)}
          />
          <MetricCard
            icon={<BarChart3 className="w-5 h-5 text-purple-500" />}
            label="P/E Ratio"
            value={stock.pe ? stock.pe.toFixed(2) : "N/A"}
          />
          <MetricCard
            icon={<Activity className="w-5 h-5 text-green-500" />}
            label="EPS"
            value={stock.eps ? `₹${stock.eps.toFixed(2)}` : "N/A"}
          />
          <MetricCard
            icon={<PieChart className="w-5 h-5 text-orange-500" />}
            label="Dividend Yield"
            value={stock.dividend ? `${stock.dividend.toFixed(2)}%` : "N/A"}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Price Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Price Info</h3>
            <div className="space-y-3">
              <InfoRow label="52-Week High" value={`₹${stock.high52.toFixed(2)}`} />
              <InfoRow label="52-Week Low" value={`₹${stock.low52.toFixed(2)}`} />
              <InfoRow label="Volume" value={formatVolume(stock.volume)} />
              <InfoRow label="Avg Volume (3M)" value={formatVolume(stock.avgVolume)} />
              <InfoRow label="Beta" value={stock.beta ? stock.beta.toFixed(2) : "N/A"} />
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Financials</h3>
            <div className="space-y-3">
              <InfoRow label="Revenue" value={stock.revenue ? formatNumber(stock.revenue) : "N/A"} />
              <InfoRow label="Gross Profit" value={stock.profit ? formatNumber(stock.profit) : "N/A"} />
              <InfoRow label="Market Cap" value={formatNumber(stock.marketCap)} />
              <InfoRow label="P/E Ratio" value={stock.pe ? stock.pe.toFixed(2) : "N/A"} />
              <InfoRow label="EPS" value={stock.eps ? `₹${stock.eps.toFixed(2)}` : "N/A"} />
            </div>
          </div>
        </div>

        {/* News Section for this Stock */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Newspaper className="w-5 h-5 text-blue-500" />
            News for {stock.symbol}
          </h2>
          {news.length > 0 ? (
            <div className="space-y-4">
              {news.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      {item.symbol}
                    </span>
                    <span className="text-xs text-gray-400">
                      {item.source} · {timeAgo(item.publishedAt)}
                    </span>
                  </div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors flex items-start gap-1"
                  >
                    {item.title}
                    <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0 text-gray-400" />
                  </a>

                  {item.summary ? (
                    <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
                      <p className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                        {item.summary}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSummarize(index)}
                      disabled={summarizing === index}
                      className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      {summarizing === index ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Summarizing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          AI Summary
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No news available for {stock.symbol}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
