import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

/* eslint-disable @typescript-eslint/no-explicit-any */

const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");

  if (!symbols) {
    return NextResponse.json({ error: "No symbols provided" }, { status: 400 });
  }

  try {
    const symbolList = symbols.split(",").map((s) => s.trim().toUpperCase());

    const quotes = await Promise.all(
      symbolList.map(async (symbol) => {
        const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;
        try {
          const quote: any = await yahooFinance.quote(yahooSymbol);

          // Try to get sector info
          let sector = "Other";
          try {
            const summary = await yahooFinance.quoteSummary(yahooSymbol, {
              modules: ["assetProfile"],
            });
            sector = summary?.assetProfile?.sector || "Other";
          } catch {
            // sector unavailable
          }

          return {
            symbol,
            name: quote.shortName || quote.longName || symbol,
            price: quote.regularMarketPrice ?? 0,
            change: quote.regularMarketChange ?? 0,
            changePercent: quote.regularMarketChangePercent ?? 0,
            marketCap: quote.marketCap ?? 0,
            pe: quote.trailingPE ?? 0,
            volume: quote.regularMarketVolume ?? 0,
            industry: (quote as any).industry ?? null,
            sector,
          };
        } catch {
          return {
            symbol,
            name: symbol,
            price: 0,
            change: 0,
            changePercent: 0,
            marketCap: 0,
            pe: 0,
            volume: 0,
            industry: null,
            sector: "Other",
          };
        }
      })
    );

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Stock fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}
