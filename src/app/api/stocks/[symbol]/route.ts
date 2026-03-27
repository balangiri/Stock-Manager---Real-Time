import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

/* eslint-disable @typescript-eslint/no-explicit-any */

const yahooFinance = new YahooFinance();

// ─── Technical Indicator Calculations ──────────────────────────

function calcSMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

function calcRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calcMACD(closes: number[]): {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
} {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  if (ema12 == null || ema26 == null)
    return { macd: null, signal: null, histogram: null };
  const macd = ema12 - ema26;

  // Approximate signal line (9-period EMA of MACD)
  // For simplicity, use current MACD as a rough signal
  const macdValues: number[] = [];
  for (let i = 26; i <= closes.length; i++) {
    const e12 = calcEMA(closes.slice(0, i), 12);
    const e26 = calcEMA(closes.slice(0, i), 26);
    if (e12 != null && e26 != null) macdValues.push(e12 - e26);
  }
  const signal = macdValues.length >= 9 ? calcEMA(macdValues, 9) : null;
  const histogram = signal != null ? macd - signal : null;
  return { macd, signal, histogram };
}

function calcBollingerBands(
  closes: number[],
  period: number = 20
): {
  upper: number | null;
  middle: number | null;
  lower: number | null;
} {
  if (closes.length < period)
    return { upper: null, middle: null, lower: null };
  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance =
    slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: mean + 2 * stdDev,
    middle: mean,
    lower: mean - 2 * stdDev,
  };
}

function calcVolatility(closes: number[], period: number = 21): number | null {
  if (closes.length < period + 1) return null;
  const returns: number[] = [];
  for (let i = closes.length - period; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    returns.length;
  // Annualized volatility
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

// ─── Main Route ────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  try {
    const yahooSymbol = symbol.toUpperCase().includes(".")
      ? symbol.toUpperCase()
      : `${symbol.toUpperCase()}.NS`;

    const quote: any = await yahooFinance.quote(yahooSymbol);

    let summaryData: any = null;
    try {
      summaryData = await yahooFinance.quoteSummary(yahooSymbol, {
        modules: ["defaultKeyStatistics", "financialData", "summaryDetail"],
      });
    } catch {
      // quoteSummary may not be available for all symbols
    }

    const financials = summaryData?.financialData;
    const keyStats = summaryData?.defaultKeyStatistics;
    const summary = summaryData?.summaryDetail;

    const currentPrice = quote.regularMarketPrice ?? 0;
    let month1Return: number | null = null;
    let month3Return: number | null = null;

    // Fetch 1 year of historical data for technical indicators
    let technicals: any = null;
    try {
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const historical = await yahooFinance.chart(yahooSymbol, {
        period1: oneYearAgo.toISOString().split("T")[0],
        period2: now.toISOString().split("T")[0],
        interval: "1d",
      });

      if (historical?.quotes && historical.quotes.length > 0) {
        const allQuotes = historical.quotes.filter(
          (q: any) => q.close != null
        );
        const closes = allQuotes.map((q: any) => q.close as number);

        if (closes.length > 0) {
          // Returns calculation
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

          // 3 month return
          const threeMonthTs = threeMonthsAgo.getTime();
          let closest3Idx = 0;
          let closest3Diff = Infinity;
          for (let i = 0; i < allQuotes.length; i++) {
            const diff = Math.abs(
              new Date(allQuotes[i].date).getTime() - threeMonthTs
            );
            if (diff < closest3Diff) {
              closest3Diff = diff;
              closest3Idx = i;
            }
          }
          const threeMonthPrice = allQuotes[closest3Idx].close;
          if (threeMonthPrice) {
            month3Return =
              ((currentPrice - threeMonthPrice) / threeMonthPrice) * 100;
          }

          // 1 month return
          const oneMonthTs = oneMonthAgo.getTime();
          let closest1Idx = 0;
          let closest1Diff = Infinity;
          for (let i = 0; i < allQuotes.length; i++) {
            const diff = Math.abs(
              new Date(allQuotes[i].date).getTime() - oneMonthTs
            );
            if (diff < closest1Diff) {
              closest1Diff = diff;
              closest1Idx = i;
            }
          }
          const oneMonthPrice = allQuotes[closest1Idx].close;
          if (oneMonthPrice) {
            month1Return =
              ((currentPrice - oneMonthPrice) / oneMonthPrice) * 100;
          }

          // Calculate all technical indicators
          const sma20 = calcSMA(closes, 20);
          const sma50 = calcSMA(closes, 50);
          const sma200 = calcSMA(closes, 200);
          const ema20 = calcEMA(closes, 20);
          const ema50 = calcEMA(closes, 50);
          const rsi = calcRSI(closes, 14);
          const macd = calcMACD(closes);
          const bollinger = calcBollingerBands(closes, 20);
          const volatility = calcVolatility(closes, 21);

          // Daily return
          const dailyReturn =
            closes.length >= 2
              ? ((closes[closes.length - 1] - closes[closes.length - 2]) /
                  closes[closes.length - 2]) *
                100
              : null;

          // Trend detection
          const trend =
            sma50 != null && sma200 != null
              ? sma50 > sma200
                ? "Bullish"
                : "Bearish"
              : "Neutral";

          // Risk level based on volatility (matching Enigma's approach)
          let riskLevel = "Medium";
          if (volatility != null) {
            if (volatility > 35) riskLevel = "High";
            else if (volatility < 20) riskLevel = "Low";
          }

          // RSI interpretation
          let rsiSignal = "Neutral";
          if (rsi != null) {
            if (rsi > 70) rsiSignal = "Overbought";
            else if (rsi < 30) rsiSignal = "Oversold";
          }

          // MACD interpretation
          let macdSignal = "Neutral";
          if (macd.histogram != null) {
            if (macd.histogram > 0) macdSignal = "Bullish";
            else macdSignal = "Bearish";
          }

          // Bollinger position
          let bollingerPosition = "Middle";
          if (bollinger.upper != null && bollinger.lower != null) {
            if (currentPrice > bollinger.upper) bollingerPosition = "Above Upper (Overbought)";
            else if (currentPrice < bollinger.lower) bollingerPosition = "Below Lower (Oversold)";
            else if (currentPrice > (bollinger.middle ?? 0))
              bollingerPosition = "Upper Half";
            else bollingerPosition = "Lower Half";
          }

          technicals = {
            sma20: sma20 ? +sma20.toFixed(2) : null,
            sma50: sma50 ? +sma50.toFixed(2) : null,
            sma200: sma200 ? +sma200.toFixed(2) : null,
            ema20: ema20 ? +ema20.toFixed(2) : null,
            ema50: ema50 ? +ema50.toFixed(2) : null,
            rsi: rsi ? +rsi.toFixed(2) : null,
            rsiSignal,
            macd: macd.macd ? +macd.macd.toFixed(2) : null,
            macdSignal: macd.signal ? +macd.signal.toFixed(2) : null,
            macdHistogram: macd.histogram ? +macd.histogram.toFixed(2) : null,
            macdTrend: macdSignal,
            bollingerUpper: bollinger.upper ? +bollinger.upper.toFixed(2) : null,
            bollingerMiddle: bollinger.middle ? +bollinger.middle.toFixed(2) : null,
            bollingerLower: bollinger.lower ? +bollinger.lower.toFixed(2) : null,
            bollingerPosition,
            volatility: volatility ? +volatility.toFixed(2) : null,
            dailyReturn: dailyReturn ? +dailyReturn.toFixed(4) : null,
            trend,
            riskLevel,
          };
        }
      }
    } catch (e) {
      console.error("Historical data error:", e);
    }

    const detail = {
      symbol: symbol.toUpperCase().replace(".NS", "").replace(".BO", ""),
      name: quote.shortName || quote.longName || symbol,
      price: currentPrice,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      marketCap: quote.marketCap ?? 0,
      pe: quote.trailingPE ?? summary?.trailingPE ?? 0,
      eps: keyStats?.trailingEps ?? 0,
      high52: quote.fiftyTwoWeekHigh ?? 0,
      low52: quote.fiftyTwoWeekLow ?? 0,
      dayHigh: quote.regularMarketDayHigh ?? 0,
      dayLow: quote.regularMarketDayLow ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      avgVolume: quote.averageDailyVolume3Month ?? 0,
      dividend: summary?.dividendYield ? summary.dividendYield * 100 : 0,
      beta: keyStats?.beta ?? 0,
      revenue: financials?.totalRevenue ?? 0,
      profit: financials?.grossProfits ?? 0,
      month1Return,
      month3Return,
      technicals,
    };

    return NextResponse.json(detail);
  } catch (error) {
    console.error("Stock detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock details" },
      { status: 500 }
    );
  }
}
