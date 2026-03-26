export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  pe?: number;
  volume?: number;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  created_at: string;
}

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  symbol: string;
  summary?: string;
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
  volume: number;
  avgVolume: number;
  dividend: number;
  beta: number;
  revenue: number;
  profit: number;
}
