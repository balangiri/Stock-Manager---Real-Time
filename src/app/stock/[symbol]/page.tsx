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
  ThumbsUp,
  ThumbsDown,
  Minus,
  ShieldAlert,
  Bot,
  Calendar,
} from "lucide-react";
import Link from "next/link";

const REFRESH_INTERVAL = 15000;

// ─── Price Range Meter Component ───────────────────────────────
function PriceRangeMeter({
  low,
  high,
  current,
  label,
}: {
  low: number;
  high: number;
  current: number;
  label: string;
}) {
  if (!low || !high || low >= high) return null;

  // Clamp position between 0% and 100%
  const range = high - low;
  const rawPercent = ((current - low) / range) * 100;
  const percent = Math.max(0, Math.min(100, rawPercent));

  // Color based on position — red (near low) → yellow (mid) → green (near high)
  const getGradientColor = () => {
    if (percent < 30) return "text-red-500";
    if (percent < 70) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span className={`text-xs font-bold ${getGradientColor()}`}>
          ₹{current.toFixed(2)}
        </span>
      </div>
      {/* The meter bar */}
      <div className="relative h-3 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 overflow-visible">
        {/* Pointer triangle */}
        <div
          className="absolute -top-1 transition-all duration-500"
          style={{ left: `calc(${percent}% - 10px)` }}
        >
          <div className="w-5 h-5 bg-white border-2 border-gray-800 rounded-full shadow-lg flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-800 rounded-full" />
          </div>
        </div>
      </div>
      {/* Low & High labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-red-500 font-medium">
          ₹{low.toFixed(2)}
        </span>
        <span className="text-[10px] text-green-600 font-medium">
          ₹{high.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── Sentiment Badge Component ─────────────────────────────────
function SentimentBadge({ sentiment }: { sentiment?: string }) {
  if (!sentiment) return null;

  const config = {
    positive: {
      bg: "bg-green-50 border-green-200",
      text: "text-green-700",
      icon: <ThumbsUp className="w-3 h-3" />,
      label: "Positive",
    },
    negative: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-700",
      icon: <ThumbsDown className="w-3 h-3" />,
      label: "Negative",
    },
    neutral: {
      bg: "bg-gray-50 border-gray-200",
      text: "text-gray-600",
      icon: <Minus className="w-3 h-3" />,
      label: "Neutral",
    },
  };

  const c = config[sentiment as keyof typeof config] || config.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.text}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

// ─── AI Recommendation Gauge ───────────────────────────────────
function RecommendationGauge({
  buy,
  hold,
  sell,
  reasoning,
}: {
  buy: number;
  hold: number;
  sell: number;
  reasoning: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold text-gray-900">AI Recommendation</h3>
      </div>

      {/* Horizontal stacked bar */}
      <div className="flex h-10 rounded-lg overflow-hidden mb-4 border border-gray-100">
        {buy > 0 && (
          <div
            className="bg-green-500 flex items-center justify-center transition-all duration-700"
            style={{ width: `${buy}%` }}
          >
            <span className="text-white text-xs font-bold">
              {buy >= 15 ? `Buy ${buy}%` : ""}
            </span>
          </div>
        )}
        {hold > 0 && (
          <div
            className="bg-yellow-400 flex items-center justify-center transition-all duration-700"
            style={{ width: `${hold}%` }}
          >
            <span className="text-gray-800 text-xs font-bold">
              {hold >= 15 ? `Hold ${hold}%` : ""}
            </span>
          </div>
        )}
        {sell > 0 && (
          <div
            className="bg-red-500 flex items-center justify-center transition-all duration-700"
            style={{ width: `${sell}%` }}
          >
            <span className="text-white text-xs font-bold">
              {sell >= 15 ? `Sell ${sell}%` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-green-500 rounded-sm" />
          <span className="text-xs text-gray-600">Buy {buy}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-yellow-400 rounded-sm" />
          <span className="text-xs text-gray-600">Hold {hold}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-sm" />
          <span className="text-xs text-gray-600">Sell {sell}%</span>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
        <p className="text-sm text-gray-700 leading-relaxed flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
          {reasoning}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="mt-3 flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
        <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-700 leading-relaxed">
          <strong>Disclaimer:</strong> This is an AI-powered recommendation
          based on publicly available data and news sentiment. It is NOT
          financial advice. Always do your own research or consult a certified
          financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
}

// ─── Main Stock Detail Page ────────────────────────────────────
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
  const [recommendation, setRecommendation] = useState<{
    buy: number;
    hold: number;
    sell: number;
    reasoning: string;
  } | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/stocks/${symbol}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStock(data);
      return data;
    } catch {
      setError("Failed to load stock details");
      return null;
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

  // Fetch AI recommendation
  const fetchRecommendation = useCallback(
    async (stockData: StockDetail, newsItems: NewsItem[]) => {
      setLoadingRec(true);
      try {
        const sentiments = newsItems
          .filter((n) => n.sentiment)
          .map((n) => ({ title: n.title, sentiment: n.sentiment }));

        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stock: stockData,
            newsSentiments: sentiments,
          }),
        });
        const data = await res.json();
        if (data.buy !== undefined) {
          setRecommendation(data);
        }
      } catch {
        console.error("Recommendation error");
      } finally {
        setLoadingRec(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const [stockData] = await Promise.all([fetchDetail(), fetchNews()]);
      setLoading(false);

      // Auto-analyze all news for sentiment + get recommendation
      if (stockData) {
        // We'll trigger recommendation after initial load with whatever stock data we have
        fetchRecommendation(stockData, []);
      }
    };
    init();
  }, [fetchDetail, fetchNews, fetchRecommendation]);

  // Auto-refresh price every 15s
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchDetail();
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchDetail]);

  // Summarize + Sentiment for a single news article
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
          analyzeSentiment: true,
        }),
      });
      const data = await res.json();
      const updatedNews = news.map((n, i) =>
        i === index
          ? { ...n, summary: data.summary, sentiment: data.sentiment }
          : n
      );
      setNews(updatedNews);

      // Refresh recommendation with new sentiment data
      if (stock) {
        const sentimentedNews = updatedNews.filter((n) => n.sentiment);
        if (sentimentedNews.length > 0) {
          fetchRecommendation(stock, sentimentedNews);
        }
      }
    } catch {
      console.error("Summarize error");
    } finally {
      setSummarizing(null);
    }
  };

  // Summarize ALL news at once
  const handleSummarizeAll = async () => {
    const unsummarized = news
      .map((n, i) => ({ ...n, idx: i }))
      .filter((n) => !n.summary);

    for (const item of unsummarized) {
      setSummarizing(item.idx);
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
            i === item.idx
              ? { ...n, summary: data.summary, sentiment: data.sentiment }
              : n
          )
        );
      } catch {
        console.error("Summarize error for", item.idx);
      }
    }
    setSummarizing(null);

    // Refresh recommendation after all summaries
    if (stock) {
      // Use a timeout to let state settle
      setTimeout(async () => {
        const currentNews = news.filter((n) => n.sentiment);
        fetchRecommendation(stock, currentNews);
      }, 500);
    }
  };

  const formatNumber = (num: number) => {
    if (!num) return "N/A";
    if (num >= 1e12) return `₹${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `₹${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e7) return `₹${(num / 1e7).toFixed(2)}Cr`;
    if (num >= 1e5) return `₹${(num / 1e5).toFixed(2)}L`;
    return `₹${num.toFixed(2)}`;
  };

  const formatVolume = (num: number) => {
    if (!num) return "N/A";
    if (num >= 1e7) return `${(num / 1e7).toFixed(2)}Cr`;
    if (num >= 1e5) return `${(num / 1e5).toFixed(2)}L`;
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
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
          <MetricCard
            icon={<Calendar className="w-5 h-5 text-cyan-500" />}
            label="1M Return"
            value={
              stock.month1Return != null
                ? `${stock.month1Return >= 0 ? "+" : ""}${stock.month1Return.toFixed(2)}%`
                : "N/A"
            }
            valueColor={
              stock.month1Return != null
                ? stock.month1Return >= 0
                  ? "text-green-600"
                  : "text-red-600"
                : undefined
            }
          />
          <MetricCard
            icon={<Calendar className="w-5 h-5 text-indigo-500" />}
            label="3M Return"
            value={
              stock.month3Return != null
                ? `${stock.month3Return >= 0 ? "+" : ""}${stock.month3Return.toFixed(2)}%`
                : "N/A"
            }
            valueColor={
              stock.month3Return != null
                ? stock.month3Return >= 0
                  ? "text-green-600"
                  : "text-red-600"
                : undefined
            }
          />
        </div>

        {/* Price Range Meters + Financials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Price Range Meters */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-5">
              Price Range Analysis
            </h3>

            <PriceRangeMeter
              low={stock.dayLow}
              high={stock.dayHigh}
              current={stock.price}
              label="Day Range"
            />

            <PriceRangeMeter
              low={stock.low52}
              high={stock.high52}
              current={stock.price}
              label="52-Week Range"
            />

            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
              <InfoRow
                label="Volume"
                value={formatVolume(stock.volume)}
              />
              <InfoRow
                label="Avg Volume (3M)"
                value={formatVolume(stock.avgVolume)}
              />
              <InfoRow
                label="Beta"
                value={stock.beta ? stock.beta.toFixed(2) : "N/A"}
              />
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Financials</h3>
            <div className="space-y-3">
              <InfoRow
                label="Revenue"
                value={stock.revenue ? formatNumber(stock.revenue) : "N/A"}
              />
              <InfoRow
                label="Gross Profit"
                value={stock.profit ? formatNumber(stock.profit) : "N/A"}
              />
              <InfoRow
                label="Market Cap"
                value={formatNumber(stock.marketCap)}
              />
              <InfoRow
                label="P/E Ratio"
                value={stock.pe ? stock.pe.toFixed(2) : "N/A"}
              />
              <InfoRow
                label="EPS"
                value={stock.eps ? `₹${stock.eps.toFixed(2)}` : "N/A"}
              />
              <InfoRow
                label="Dividend Yield"
                value={stock.dividend ? `${stock.dividend.toFixed(2)}%` : "N/A"}
              />
              <InfoRow
                label="52-Week High"
                value={`₹${stock.high52.toFixed(2)}`}
              />
              <InfoRow
                label="52-Week Low"
                value={`₹${stock.low52.toFixed(2)}`}
              />
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="mt-6">
          {loadingRec ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              <span className="text-sm text-gray-500">
                Generating AI recommendation...
              </span>
            </div>
          ) : recommendation ? (
            <RecommendationGauge
              buy={recommendation.buy}
              hold={recommendation.hold}
              sell={recommendation.sell}
              reasoning={recommendation.reasoning}
            />
          ) : null}
        </div>

        {/* News Section for this Stock */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-blue-500" />
              News for {stock.symbol}
            </h2>
            {news.length > 0 && news.some((n) => !n.summary) && (
              <button
                onClick={handleSummarizeAll}
                disabled={summarizing !== null}
                className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Analyze All News
              </button>
            )}
          </div>

          {news.length > 0 ? (
            <div className="space-y-4">
              {news.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      {item.symbol}
                    </span>
                    <SentimentBadge sentiment={item.sentiment} />
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
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          AI Summary + Sentiment
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
              <p className="text-gray-500">
                No news available for {stock.symbol}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Helper Components ─────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p
        className={`text-lg font-semibold ${valueColor || "text-gray-900"}`}
      >
        {value}
      </p>
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
