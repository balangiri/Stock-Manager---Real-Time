import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

/* eslint-disable @typescript-eslint/no-explicit-any */

const yahooFinance = new YahooFinance();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;

  try {
    // Add .NS suffix for NSE (Indian market) if not already present
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

    // Calculate 1-month and 3-month returns
    const currentPrice = quote.regularMarketPrice ?? 0;
    let month1Return: number | null = null;
    let month3Return: number | null = null;

    try {
      const now = new Date();
      const oneMonthAgo = new Date(now);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const threeMonthsAgo = new Date(now);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const historical = await yahooFinance.chart(yahooSymbol, {
        period1: threeMonthsAgo.toISOString().split("T")[0],
        period2: now.toISOString().split("T")[0],
        interval: "1d",
      });

      if (historical?.quotes && historical.quotes.length > 0) {
        const quotes = historical.quotes.filter(
          (q: any) => q.close != null
        );
        if (quotes.length > 0) {
          // 3 month return — from first quote
          const threeMonthPrice = quotes[0].close;
          if (threeMonthPrice) {
            month3Return =
              ((currentPrice - threeMonthPrice) / threeMonthPrice) * 100;
          }

          // 1 month return — find quote closest to 1 month ago
          const oneMonthTs = oneMonthAgo.getTime();
          let closestIdx = 0;
          let closestDiff = Infinity;
          for (let i = 0; i < quotes.length; i++) {
            const qDate = new Date(quotes[i].date).getTime();
            const diff = Math.abs(qDate - oneMonthTs);
            if (diff < closestDiff) {
              closestDiff = diff;
              closestIdx = i;
            }
          }
          const oneMonthPrice = quotes[closestIdx].close;
          if (oneMonthPrice) {
            month1Return =
              ((currentPrice - oneMonthPrice) / oneMonthPrice) * 100;
          }
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
