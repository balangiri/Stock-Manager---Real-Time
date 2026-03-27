import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

/* eslint-disable @typescript-eslint/no-explicit-any */

const yahooFinance = new YahooFinance();

export async function GET() {
  try {
    const indices = [
      { symbol: "^NSEI", name: "NIFTY 50" },
      { symbol: "^BSESN", name: "SENSEX" },
    ];

    const results = await Promise.all(
      indices.map(async ({ symbol, name }) => {
        try {
          const quote: any = await yahooFinance.quote(symbol);

          // Get 5-day intraday chart for sparkline
          const now = new Date();
          const fiveDaysAgo = new Date(now);
          fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

          let chartData: { time: string; value: number }[] = [];
          try {
            const chart = await yahooFinance.chart(symbol, {
              period1: fiveDaysAgo.toISOString().split("T")[0],
              period2: now.toISOString().split("T")[0],
              interval: "1h",
            });

            if (chart?.quotes) {
              chartData = chart.quotes
                .filter((q: any) => q.close != null)
                .map((q: any) => ({
                  time: new Date(q.date).toISOString(),
                  value: q.close,
                }));
            }
          } catch {
            // chart may fail, that's ok
          }

          return {
            symbol,
            name,
            price: quote.regularMarketPrice ?? 0,
            change: quote.regularMarketChange ?? 0,
            changePercent: quote.regularMarketChangePercent ?? 0,
            dayHigh: quote.regularMarketDayHigh ?? 0,
            dayLow: quote.regularMarketDayLow ?? 0,
            previousClose: quote.regularMarketPreviousClose ?? 0,
            chartData,
          };
        } catch (e) {
          console.error(`Failed to fetch ${name}:`, e);
          return {
            symbol,
            name,
            price: 0,
            change: 0,
            changePercent: 0,
            dayHigh: 0,
            dayLow: 0,
            previousClose: 0,
            chartData: [],
          };
        }
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Market overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
