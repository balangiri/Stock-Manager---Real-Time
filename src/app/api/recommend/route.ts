import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
const anthropic = new Anthropic({ apiKey });

export async function POST(request: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const { stock, newsSentiments } = await request.json();

    const prompt = `You are a stock analyst AI. Based on the following data for ${stock.symbol} (${stock.name}), give an investment recommendation.

STOCK DATA:
- Current Price: ₹${stock.price}
- Day Change: ${stock.changePercent?.toFixed(2)}%
- P/E Ratio: ${stock.pe || "N/A"}
- EPS: ₹${stock.eps || "N/A"}
- Market Cap: ₹${stock.marketCap}
- 52-Week High: ₹${stock.high52}
- 52-Week Low: ₹${stock.low52}
- Day Range: ₹${stock.dayLow} - ₹${stock.dayHigh}
- Beta: ${stock.beta || "N/A"}
- Dividend Yield: ${stock.dividend || 0}%
- 1-Month Return: ${stock.month1Return != null ? stock.month1Return.toFixed(2) + "%" : "N/A"}
- 3-Month Return: ${stock.month3Return != null ? stock.month3Return.toFixed(2) + "%" : "N/A"}
- Volume: ${stock.volume}
- Avg Volume: ${stock.avgVolume}

NEWS SENTIMENTS: ${newsSentiments && newsSentiments.length > 0 ? newsSentiments.map((n: { title: string; sentiment: string }) => `"${n.title}" (${n.sentiment})`).join(", ") : "No recent news analyzed"}

Based on technical indicators, fundamentals, and news sentiment, provide:
1. Buy percentage (0-100)
2. Hold percentage (0-100)
3. Sell percentage (0-100)
(Must total 100)
4. A brief 2-3 sentence reasoning

Respond in this exact JSON format (no markdown, no code blocks):
{"buy": 60, "hold": 25, "sell": 15, "reasoning": "your reasoning here"}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const parsed = JSON.parse(responseText.trim());
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        buy: 33,
        hold: 34,
        sell: 33,
        reasoning: "Unable to generate a clear recommendation at this time.",
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
