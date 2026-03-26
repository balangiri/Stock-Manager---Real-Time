import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

/* eslint-disable @typescript-eslint/no-explicit-any */

const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  try {
    const results: any = await yahooFinance.search(query, {
      quotesCount: 8,
      newsCount: 0,
    });

    const stocks = (results.quotes || [])
      .filter(
        (q: any) =>
          q.exchange === "NSI" || q.exchange === "NSE" || q.exchange === "BSE"
      )
      .map((q: any) => ({
        symbol: q.symbol?.replace(".NS", "").replace(".BO", "") || "",
        name: q.shortname || q.longname || q.symbol || "",
        exchange: q.exchange || "",
      }));

    return NextResponse.json(stocks);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json([]);
  }
}
