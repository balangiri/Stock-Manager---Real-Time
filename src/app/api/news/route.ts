import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
  const companyName = request.nextUrl.searchParams.get("name");
  const apiKey = process.env.NEWS_API_KEY;

  if (!symbols) {
    return NextResponse.json({ error: "No symbols provided" }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "NEWS_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const symbolList = symbols.split(",").map((s) => s.trim().toUpperCase());

    // Build a precise query using both symbol and company name
    // For single stock pages, we get the company name for better matching
    const queryParts: string[] = [];
    for (const sym of symbolList) {
      // Clean symbol (remove .NS, .BO suffixes)
      const cleanSym = sym.replace(".NS", "").replace(".BO", "");
      queryParts.push(`"${cleanSym}"`);
    }

    // If company name is provided, add it for better relevance
    if (companyName) {
      // Extract key part of the company name (remove Ltd, Limited, etc.)
      const cleanName = companyName
        .replace(/\b(Ltd|Limited|Corp|Corporation|Inc|Industries|Pvt)\b\.?/gi, "")
        .trim();
      if (cleanName.length > 2) {
        queryParts.push(`"${cleanName}"`);
      }
    }

    const query = queryParts.join(" OR ");

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      query
    )}&language=en&sortBy=relevancy&pageSize=30&apiKey=${apiKey}`;

    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();

    if (data.status !== "ok") {
      return NextResponse.json(
        { error: data.message || "News API error" },
        { status: 500 }
      );
    }

    // Strict filtering: only include articles that actually mention the stock
    const cleanSymbols = symbolList.map((s) =>
      s.replace(".NS", "").replace(".BO", "")
    );
    const companyKeywords = companyName
      ? companyName
          .replace(/\b(Ltd|Limited|Corp|Corporation|Inc|Industries|Pvt)\b\.?/gi, "")
          .trim()
          .split(/\s+/)
          .filter((w: string) => w.length > 2)
      : [];

    const articles = (data.articles || [])
      .filter(
        (article: {
          title: string;
          description: string;
        }) => {
          const text = `${article.title || ""} ${article.description || ""}`.toLowerCase();

          // Must mention at least one symbol OR 2+ company name keywords
          const mentionsSymbol = cleanSymbols.some((s) =>
            text.includes(s.toLowerCase())
          );
          const nameMatches = companyKeywords.filter((kw: string) =>
            text.includes(kw.toLowerCase())
          ).length;

          return mentionsSymbol || nameMatches >= 2;
        }
      )
      .map(
        (article: {
          title: string;
          description: string;
          url: string;
          source: { name: string };
          publishedAt: string;
        }) => {
          const text = `${article.title || ""} ${article.description || ""}`.toLowerCase();
          const matchedSymbol =
            cleanSymbols.find((s) => text.includes(s.toLowerCase())) ||
            cleanSymbols[0];

          return {
            title: article.title,
            description: article.description || "",
            url: article.url,
            source: article.source?.name || "Unknown",
            publishedAt: article.publishedAt,
            symbol: matchedSymbol,
          };
        }
      );

    return NextResponse.json(articles);
  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}
