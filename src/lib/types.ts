export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  pe?: number;
  volume?: number;
  industry?: string;
  sector?: string;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  created_at: string;
  user_id: string;
}

export interface AuthUser {
  id: string;
  email: string;
  /** Future freemium: plan tier, defaults to "free" */
  plan?: "free" | "pro";
}

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  symbol: string;
  summary?: string;
  sentiment?: "positive" | "negative" | "neutral";
}

export interface StockDetail {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  pe: number;
  eps: number;
  high52: number;
  low52: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  avgVolume: number;
  dividend: number;
  beta: number;
  revenue: number;
  profit: number;
  month1Return?: number;
  month3Return?: number;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  sparkline: number[];
}
