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
    const yahooSymbol = symbol.toUpperCase().includes(".") ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;

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

    const detail = {
      symbol: symbol.toUpperCase().replace(".NS", "").replace(".BO", ""),
      name: quote.shortName || quote.longName || symbol,
      price: quote.regularMarketPrice ?? 0,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      marketCap: quote.marketCap ?? 0,
      pe: quote.trailingPE ?? summary?.trailingPE ?? 0,
      eps: keyStats?.trailingEps ?? 0,
      high52: quote.fiftyTwoWeekHigh ?? 0,
      low52: quote.fiftyTwoWeekLow ?? 0,
      volume: quote.regularMarketVolume ?? 0,
      avgVolume: quote.averageDailyVolume3Month ?? 0,
      dividend: summary?.dividendYield
        ? summary.dividendYield * 100
        : 0,
      beta: keyStats?.beta ?? 0,
      revenue: financials?.totalRevenue ?? 0,
      profit: financials?.grossProfits ?? 0,
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
