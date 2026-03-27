import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
const anthropic = new Anthropic({ apiKey });

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const { stock, newsSentiments } = await request.json();
    const t = stock.technicals || {};

    // Count sentiment distribution
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    if (newsSentiments && newsSentiments.length > 0) {
      newsSentiments.forEach((n: any) => {
        const s = n.sentiment as keyof typeof sentimentCounts;
        if (sentimentCounts[s] !== undefined) sentimentCounts[s]++;
      });
    }
    const totalSentiment =
      sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral;
    const sentimentScore =
      totalSentiment > 0
        ? ((sentimentCounts.positive * 100 +
            sentimentCounts.neutral * 50 +
            sentimentCounts.negative * 0) /
            totalSentiment)
        : null;

    const prompt = `You are an expert stock analyst AI that synthesizes three types of analysis (inspired by professional quant systems) to generate investment recommendations. Analyze the following data for ${stock.symbol} (${stock.name}) on the Indian NSE market.

═══════════════════════════════════════
MODULE 1: FUNDAMENTAL ANALYSIS
═══════════════════════════════════════
- Current Price: ₹${stock.price}
- Day Change: ${stock.changePercent?.toFixed(2)}%
- Market Cap: ₹${stock.marketCap}
- P/E Ratio: ${stock.pe || "N/A"}
- EPS: ₹${stock.eps || "N/A"}
- 52-Week High: ₹${stock.high52} | 52-Week Low: ₹${stock.low52}
- Day Range: ₹${stock.dayLow} - ₹${stock.dayHigh}
- Beta: ${stock.beta || "N/A"}
- Dividend Yield: ${stock.dividend || 0}%
- 1-Month Return: ${stock.month1Return != null ? stock.month1Return.toFixed(2) + "%" : "N/A"}
- 3-Month Return: ${stock.month3Return != null ? stock.month3Return.toFixed(2) + "%" : "N/A"}
- Volume: ${stock.volume} | Avg Volume (3M): ${stock.avgVolume}
- Revenue: ₹${stock.revenue} | Gross Profit: ₹${stock.profit}

═══════════════════════════════════════
MODULE 2: TECHNICAL ANALYSIS
═══════════════════════════════════════
Moving Averages:
- SMA20: ${t.sma20 ?? "N/A"} | SMA50: ${t.sma50 ?? "N/A"} | SMA200: ${t.sma200 ?? "N/A"}
- EMA20: ${t.ema20 ?? "N/A"} | EMA50: ${t.ema50 ?? "N/A"}
- MA Trend: ${t.trend ?? "N/A"} (SMA50 vs SMA200 crossover)

Momentum Indicators:
- RSI (14): ${t.rsi ?? "N/A"} → Signal: ${t.rsiSignal ?? "N/A"}
- MACD: ${t.macd ?? "N/A"} | Signal Line: ${t.macdSignal ?? "N/A"} | Histogram: ${t.macdHistogram ?? "N/A"}
- MACD Trend: ${t.macdTrend ?? "N/A"}

Volatility:
- Bollinger Upper: ${t.bollingerUpper ?? "N/A"} | Middle: ${t.bollingerMiddle ?? "N/A"} | Lower: ${t.bollingerLower ?? "N/A"}
- Price Position: ${t.bollingerPosition ?? "N/A"}
- Annualized Volatility: ${t.volatility != null ? t.volatility + "%" : "N/A"}
- Daily Return: ${t.dailyReturn != null ? t.dailyReturn + "%" : "N/A"}

Risk Assessment:
- Risk Level: ${t.riskLevel ?? "N/A"} (based on volatility quantiles)

═══════════════════════════════════════
MODULE 3: SENTIMENT ANALYSIS
═══════════════════════════════════════
${totalSentiment > 0 ? `- Analyzed ${totalSentiment} news articles
- Positive: ${sentimentCounts.positive} | Neutral: ${sentimentCounts.neutral} | Negative: ${sentimentCounts.negative}
- Sentiment Score: ${sentimentScore?.toFixed(1)}/100
- Headlines: ${newsSentiments.slice(0, 5).map((n: any) => `"${n.title}" (${n.sentiment})`).join("; ")}` : "No news articles analyzed yet. Base recommendation on fundamentals and technicals only."}

═══════════════════════════════════════
RECOMMENDATION RULES (follow these strictly)
═══════════════════════════════════════
Apply these rules from the Enigma quantitative framework:

1. SENTIMENT SCORING:
   - Score ≤40 → Strong Sell signal
   - Score 41-45 → Sell signal
   - Score 45-48 → Weak Sell
   - Score 48-52 → Neutral
   - Score 52-55 → Weak Buy
   - Score 55-60 → Buy signal
   - Score >60 → Strong Buy signal

2. TECHNICAL SIGNALS:
   - RSI >70 = Overbought (bearish), RSI <30 = Oversold (bullish)
   - MACD histogram positive = Bullish momentum
   - SMA50 > SMA200 = Golden cross (bullish), opposite = Death cross
   - Price near Bollinger lower = potential bounce, near upper = potential reversal

3. RISK ADJUSTMENT:
   - High volatility (>35%) → reduce Buy confidence, increase Hold
   - Low beta (<0.8) → more stable, slight boost to Buy for conservative investors
   - High beta (>1.3) → riskier, increase Hold/Sell weighting

4. FUNDAMENTAL CHECK:
   - Low P/E relative to industry = undervalued → boost Buy
   - Strong EPS growth + positive returns → boost Buy
   - Declining returns (negative 1M and 3M) → boost Sell

Synthesize ALL three modules. Weight them: Technical (40%), Sentiment (30%), Fundamental (30%).

Respond in this exact JSON format (no markdown, no code blocks, no extra text):
{"buy": 60, "hold": 25, "sell": 15, "signal": "Buy", "confidence": 72, "riskLevel": "Medium", "technicalSignal": "Bullish", "sentimentSignal": "Buy", "reasoning": "2-3 sentence analysis combining all three modules. Mention specific indicator values that drove the recommendation."}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const parsed = JSON.parse(responseText.trim());
      // Ensure percentages total 100
      const total = (parsed.buy || 0) + (parsed.hold || 0) + (parsed.sell || 0);
      if (total > 0 && total !== 100) {
        const factor = 100 / total;
        parsed.buy = Math.round((parsed.buy || 0) * factor);
        parsed.hold = Math.round((parsed.hold || 0) * factor);
        parsed.sell = 100 - parsed.buy - parsed.hold;
      }
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        buy: 33,
        hold: 34,
        sell: 33,
        signal: "Hold",
        confidence: 50,
        riskLevel: "Medium",
        technicalSignal: "Neutral",
        sentimentSignal: "Neutral",
        reasoning:
          "Unable to generate a clear recommendation at this time. Please analyze news for better results.",
      });
    }
  } catch (error) {
    console.error("Recommendation error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}
