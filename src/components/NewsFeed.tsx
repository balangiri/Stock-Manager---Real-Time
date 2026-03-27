"use client";

import { useState } from "react";
import { NewsItem } from "@/lib/types";
import {
  Newspaper,
  Sparkles,
  Loader2,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from "lucide-react";

interface NewsFeedProps {
  news: NewsItem[];
  onSummarize: (index: number) => Promise<void>;
}

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

export default function NewsFeed({ news, onSummarize }: NewsFeedProps) {
  const [summarizing, setSummarizing] = useState<number | null>(null);

  const handleSummarize = async (index: number) => {
    setSummarizing(index);
    try {
      await onSummarize(index);
    } finally {
      setSummarizing(null);
    }
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

  if (news.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">
          Add stocks to your watchlist to see news
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <Newspaper className="w-5 h-5 text-blue-500" />
        Latest News
      </h2>
      {news.map((item, index) => (
        <div
          key={`${item.url}-${index}`}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex-1">
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
                    AI Summary
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
