import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

/* eslint-disable @typescript-eslint/no-explicit-any */

const yahooFinance = new YahooFinance();

const INDICES = [
  { symbol: "^NSEI", name: "NIFTY 50" },
  { symbol: "^BSESN", name: "SENSEX" },
];

export async function GET() {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await Promise.all(
      INDICES.map(async ({ symbol, name }) => {
        try {
          const quote: any = await yahooFinance.quote(symbol);

          // Fetch 30-day sparkline data
          let sparkline: number[] = [];
          try {
            const historical = await yahooFinance.chart(symbol, {
              period1: thirtyDaysAgo.toISOString().split("T")[0],
              period2: now.toISOString().split("T")[0],
              interval: "1d",
            });
            if (historical?.quotes) {
              sparkline = historical.quotes
                .filter((q: any) => q.close != null)
                .map((q: any) => q.close as number);
            }
          } catch {
            // Sparkline data not critical
          }

          return {
            symbol,
            name,
            price: quote.regularMarketPrice ?? 0,
            change: quote.regularMarketChange ?? 0,
            changePercent: quote.regularMarketChangePercent ?? 0,
            sparkline,
          };
        } catch {
          return {
            symbol,
            name,
            price: 0,
            change: 0,
            changePercent: 0,
            sparkline: [],
          };
        }
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Indices fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch index data" },
      { status: 500 }
    );
  }
}
