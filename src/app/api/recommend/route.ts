import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
const anthropic = new Anthropic({ apiKey });

/* eslint-disable @typescript-eslint/no-explicit-any */

function extractJSON(text: string): string {
  // Try to extract JSON from markdown code blocks or raw text
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // Try to find JSON object directly
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0].trim();

  return text.trim();
}

// Compute a deterministic recommendation based on actual data
// This serves as both a fallback and a sanity-check baseline
function computeDataDrivenRecommendation(stock: any) {
  const t = stock.technicals || {};
  let buyScore = 50;
  let sellScore = 25;
  let holdScore = 25;
  const signals: string[] = [];

  // RSI signals
  if (t.rsi != null) {
    if (t.rsi > 70) {
      sellScore += 15;
      buyScore -= 10;
      signals.push(`RSI at ${t.rsi} indicates overbought conditions`);
    } else if (t.rsi < 30) {
      buyScore += 15;
      sellScore -= 10;
      signals.push(`RSI at ${t.rsi} indicates oversold conditions (potential bounce)`);
    } else if (t.rsi > 55) {
      buyScore += 5;
      signals.push(`RSI at ${t.rsi} shows moderate bullish momentum`);
    } else if (t.rsi < 45) {
      sellScore += 5;
      signals.push(`RSI at ${t.rsi} shows weakening momentum`);
    }
  }

  // MACD signals
  if (t.macdHistogram != null) {
    if (t.macdHistogram > 0) {
      buyScore += 10;
      signals.push("MACD histogram positive (bullish momentum)");
    } else {
      sellScore += 10;
      signals.push("MACD histogram negative (bearish momentum)");
    }
  }

  // Trend (Golden/Death cross)
  if (t.trend === "Bullish") {
    buyScore += 10;
    signals.push("Golden cross detected (SMA50 > SMA200)");
  } else if (t.trend === "Bearish") {
    sellScore += 10;
    signals.push("Death cross detected (SMA50 < SMA200)");
  }

  // Volatility/Risk
  if (t.volatility != null && t.volatility > 35) {
    holdScore += 10;
    buyScore -= 5;
    signals.push(`High volatility at ${t.volatility}% warrants caution`);
  }

  // Returns momentum
  if (stock.month1Return != null && stock.month3Return != null) {
    if (stock.month1Return > 5 && stock.month3Return > 10) {
      buyScore += 10;
      signals.push("Strong positive momentum in recent returns");
    } else if (stock.month1Return < -5 && stock.month3Return < -10) {
      sellScore += 10;
      signals.push("Declining returns signal bearish trend");
    }
  }

  // Price vs 52-week range
  if (stock.high52 && stock.low52 && stock.price) {
    const range = stock.high52 - stock.low52;
    const position = range > 0 ? (stock.price - stock.low52) / range : 0.5;
    if (position > 0.9) {
      sellScore += 5;
      holdScore += 5;
      signals.push("Price near 52-week high");
    } else if (position < 0.3) {
      buyScore += 10;
      signals.push("Price near 52-week low — potential value opportunity");
    }
  }

  // Bollinger position
  if (t.bollingerPosition) {
    if (t.bollingerPosition.includes("Overbought")) {
      sellScore += 5;
    } else if (t.bollingerPosition.includes("Oversold")) {
      buyScore += 5;
    }
  }

  // Normalize to 100
  const total = buyScore + holdScore + sellScore;
  const buy = Math.round((buyScore / total) * 100);
  const hold = Math.round((holdScore / total) * 100);
  const sell = 100 - buy - hold;

  // Determine signal
  let signal = "Hold";
  if (buy >= 55) signal = buy >= 70 ? "Strong Buy" : "Buy";
  else if (sell >= 55) signal = sell >= 70 ? "Strong Sell" : "Sell";

  const confidence = Math.max(buy, hold, sell);
  const riskLevel = t.riskLevel || "Medium";

  const technicalSignal = t.trend === "Bullish" ? "Bullish" : t.trend === "Bearish" ? "Bearish" : "Neutral";

  return {
    buy,
    hold,
    sell,
    signal,
    confidence,
    riskLevel,
    technicalSignal,
    sentimentSignal: "Neutral",
    reasoning: signals.slice(0, 3).join(". ") + ".",
  };
}

export async function POST(request: NextRequest) {
  try {
    const { stock, newsSentiments } = await request.json();

    if (!apiKey) {
      // Return data-driven recommendation even without API key
      return NextResponse.json(computeDataDrivenRecommendation(stock));
    }

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

    const prompt = `You are an expert stock analyst AI. Analyze ${stock.symbol} (${stock.name}) on the Indian NSE market and give a UNIQUE recommendation based on the SPECIFIC data below. Different stocks MUST get different recommendations.

FUNDAMENTALS:
- Price: ₹${stock.price} | Day Change: ${stock.changePercent?.toFixed(2)}%
- Market Cap: ₹${stock.marketCap} | P/E: ${stock.pe || "N/A"} | EPS: ₹${stock.eps || "N/A"}
- 52W High: ₹${stock.high52} | 52W Low: ₹${stock.low52}
- Beta: ${stock.beta || "N/A"} | Dividend: ${stock.dividend || 0}%
- 1M Return: ${stock.month1Return != null ? stock.month1Return.toFixed(2) + "%" : "N/A"}
- 3M Return: ${stock.month3Return != null ? stock.month3Return.toFixed(2) + "%" : "N/A"}
- Volume: ${stock.volume} | Avg Vol: ${stock.avgVolume}

TECHNICALS:
- SMA20: ${t.sma20 ?? "N/A"} | SMA50: ${t.sma50 ?? "N/A"} | SMA200: ${t.sma200 ?? "N/A"}
- EMA20: ${t.ema20 ?? "N/A"} | EMA50: ${t.ema50 ?? "N/A"}
- Trend: ${t.trend ?? "N/A"} (SMA50 vs SMA200)
- RSI(14): ${t.rsi ?? "N/A"} (${t.rsiSignal ?? "N/A"})
- MACD: ${t.macd ?? "N/A"} | Signal: ${t.macdSignal ?? "N/A"} | Histogram: ${t.macdHistogram ?? "N/A"} (${t.macdTrend ?? "N/A"})
- Bollinger: Upper ${t.bollingerUpper ?? "N/A"} | Mid ${t.bollingerMiddle ?? "N/A"} | Lower ${t.bollingerLower ?? "N/A"} (${t.bollingerPosition ?? "N/A"})
- Volatility: ${t.volatility != null ? t.volatility + "%" : "N/A"} | Risk: ${t.riskLevel ?? "N/A"}

SENTIMENT (${totalSentiment} articles):
${totalSentiment > 0 ? `Score: ${sentimentScore?.toFixed(1)}/100 | +${sentimentCounts.positive} =${sentimentCounts.neutral} -${sentimentCounts.negative}
Headlines: ${newsSentiments.slice(0, 5).map((n: any) => `"${n.title}" (${n.sentiment})`).join("; ")}` : "No news analyzed. Weight technicals and fundamentals more heavily."}

RULES:
- RSI >70 = overbought (bearish). RSI <30 = oversold (bullish).
- MACD histogram >0 = bullish momentum. <0 = bearish.
- SMA50 > SMA200 = golden cross (bullish). SMA50 < SMA200 = death cross (bearish).
- High volatility (>35%) = increase Hold weight.
- Negative 1M+3M returns = increase Sell. Positive = increase Buy.
- Buy+Hold+Sell MUST equal exactly 100.

IMPORTANT: Your buy/hold/sell percentages must reflect THIS stock's actual indicators above. A stock with RSI 75 should NOT get the same recommendation as one with RSI 30.

Reply with ONLY this JSON (no markdown, no backticks, no extra text):
{"buy": 60, "hold": 25, "sell": 15, "signal": "Buy", "confidence": 72, "riskLevel": "Medium", "technicalSignal": "Bullish", "sentimentSignal": "Neutral", "reasoning": "Specific 2-3 sentence analysis mentioning actual values like RSI, MACD, returns for ${stock.symbol}."}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const jsonStr = extractJSON(responseText);
      const parsed = JSON.parse(jsonStr);

      // Ensure percentages total 100
      const total = (parsed.buy || 0) + (parsed.hold || 0) + (parsed.sell || 0);
      if (total > 0 && total !== 100) {
        const factor = 100 / total;
        parsed.buy = Math.round((parsed.buy || 0) * factor);
        parsed.hold = Math.round((parsed.hold || 0) * factor);
        parsed.sell = 100 - parsed.buy - parsed.hold;
      }
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText, parseError);
      // Fall back to data-driven recommendation instead of static values
      return NextResponse.json(computeDataDrivenRecommendation(stock));
    }
  } catch (error) {
    console.error("Recommendation error:", error);
    // Even on API failure, return a data-driven recommendation
    try {
      const body = await request.clone().json();
      return NextResponse.json(computeDataDrivenRecommendation(body.stock));
    } catch {
      return NextResponse.json(
        { error: "Failed to generate recommendation" },
        { status: 500 }
      );
    }
  }
}
