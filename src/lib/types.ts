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
  sector?: string;
  technicals?: {
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema20: number | null;
    ema50: number | null;
    rsi: number | null;
    rsiSignal: string;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    macdTrend: string;
    bollingerUpper: number | null;
    bollingerMiddle: number | null;
    bollingerLower: number | null;
    bollingerPosition: string;
    volatility: number | null;
    dailyReturn: number | null;
    trend: string;
    riskLevel: string;
  };
}

export interface HeatmapStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  sector: string;
  industry: string;
  weeklyChange: number;
  monthlyChange: number;
  yearlyChange: number;
  weeklyVolume: number;
  monthlyVolume: number;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  dayHigh?: number;
  dayLow?: number;
  previousClose?: number;
  chartData?: { time: string; value: number }[];
  sparkline?: number[];
}
