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
        // Add .NS suffix for NSE (Indian market) if not already present
        const yahooSymbol = symbol.includes(".") ? symbol : `${symbol}.NS`;
        try {
          const quote: any = await yahooFinance.quote(yahooSymbol);
          return {
            symbol: symbol, // Store without .NS for clean display
            name: quote.shortName || quote.longName || symbol,
            price: quote.regularMarketPrice ?? 0,
            change: quote.regularMarketChange ?? 0,
            changePercent: quote.regularMarketChangePercent ?? 0,
            marketCap: quote.marketCap ?? 0,
            pe: quote.trailingPE ?? 0,
            volume: quote.regularMarketVolume ?? 0,
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
