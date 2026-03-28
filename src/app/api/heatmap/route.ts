import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

/* eslint-disable @typescript-eslint/no-explicit-any */

const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");

  if (!symbols) {
    return NextResponse.json(
      { error: "No symbols provided" },
      { status: 400 }
    );
  }

  try {
    const symbolList = symbols.split(",").map((s) => s.trim().toUpperCase());

    const results = await Promise.all(
      symbolList.map(async (symbol) => {
        const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;
        try {
          const quote: any = await yahooFinance.quote(yahooSymbol);

          // Get sector info
          let sector = "Other";
          let industry = "Other";
          try {
            const summary = await yahooFinance.quoteSummary(yahooSymbol, {
              modules: ["assetProfile"],
            });
            sector = summary?.assetProfile?.sector || "Other";
            industry = summary?.assetProfile?.industry || "Other";
          } catch {
            // sector unavailable
          }

          // Fetch 1 month of historical data for weekly/monthly calculations
          const now = new Date();
          const oneMonthAgo = new Date(now);
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const oneWeekAgo = new Date(now);
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          let weeklyChange = 0;
          let monthlyChange = 0;
          let weeklyVolume = 0;
          let monthlyVolume = 0;

          try {
            const historical = await yahooFinance.chart(yahooSymbol, {
              period1: oneMonthAgo.toISOString().split("T")[0],
              period2: now.toISOString().split("T")[0],
              interval: "1d",
            });

            if (historical?.quotes && historical.quotes.length > 0) {
              const allQuotes = historical.quotes.filter(
                (q: any) => q.close != null && q.volume != null
              );
              const currentPrice = quote.regularMarketPrice ?? 0;

              // Monthly calculations (all quotes)
              if (allQuotes.length > 0) {
                const monthStartPrice = allQuotes[0].close ?? currentPrice;
                monthlyChange =
                  monthStartPrice > 0
                    ? ((currentPrice - monthStartPrice) / monthStartPrice) * 100
                    : 0;
                monthlyVolume = allQuotes.reduce(
                  (sum: number, q: any) => sum + (q.volume ?? 0),
                  0
                );
              }

              // Weekly calculations (last ~5 trading days)
              const weekTs = oneWeekAgo.getTime();
              const weekQuotes = allQuotes.filter(
                (q: any) => new Date(q.date).getTime() >= weekTs
              );
              if (weekQuotes.length > 0) {
                const weekStartPrice = weekQuotes[0].close ?? currentPrice;
                weeklyChange =
                  weekStartPrice > 0
                    ? ((currentPrice - weekStartPrice) / weekStartPrice) * 100
                    : 0;
                weeklyVolume = weekQuotes.reduce(
                  (sum: number, q: any) => sum + (q.volume ?? 0),
                  0
                );
              }
            }
          } catch {
            // historical data unavailable
          }

          return {
            symbol: symbol.replace(".NS", "").replace(".BO", ""),
            name: quote.shortName || quote.longName || symbol,
            price: quote.regularMarketPrice ?? 0,
            change: quote.regularMarketChange ?? 0,
            changePercent: quote.regularMarketChangePercent ?? 0,
            marketCap: quote.marketCap ?? 0,
            volume: quote.regularMarketVolume ?? 0,
            sector,
            industry,
            weeklyChange: +weeklyChange.toFixed(2),
            monthlyChange: +monthlyChange.toFixed(2),
            weeklyVolume,
            monthlyVolume,
          };
        } catch {
          return {
            symbol: symbol.replace(".NS", "").replace(".BO", ""),
            name: symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            marketCap: 0,
            volume: 0,
            sector: "Other",
            industry: "Other",
            weeklyChange: 0,
            monthlyChange: 0,
            weeklyVolume: 0,
            monthlyVolume: 0,
          };
        }
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Heatmap data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}
