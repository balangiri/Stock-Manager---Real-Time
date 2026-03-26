import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const symbols = request.nextUrl.searchParams.get("symbols");
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
    const symbolList = symbols.split(",").map((s) => s.trim());

    // Build query: search for Indian stock symbols and company context
    const query = symbolList.map((s) => `"${s}" stock NSE India`).join(" OR ");

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(
      query
    )}&language=en&sortBy=publishedAt&pageSize=30&apiKey=${apiKey}`;

    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
    const data = await res.json();

    if (data.status !== "ok") {
      return NextResponse.json(
        { error: data.message || "News API error" },
        { status: 500 }
      );
    }

    const articles = (data.articles || []).map(
      (article: {
        title: string;
        description: string;
        url: string;
        source: { name: string };
        publishedAt: string;
      }) => {
        // Try to match article to a symbol
        const matchedSymbol =
          symbolList.find(
            (s) =>
              article.title?.toLowerCase().includes(s.toLowerCase()) ||
              article.description?.toLowerCase().includes(s.toLowerCase())
          ) || symbolList[0];

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
