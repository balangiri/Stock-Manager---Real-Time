import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;

const anthropic = new Anthropic({
  apiKey: apiKey,
});

export async function POST(request: NextRequest) {
  try {
    if (!apiKey) {
      console.error("No Claude API key found. Set CLAUDE_API_KEY or ANTHROPIC_API_KEY.");
      return NextResponse.json(
        { error: "API key not configured", summary: "AI summary unavailable — API key not set." },
        { status: 500 }
      );
    }

    const { title, description, analyzeSentiment } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "No article text provided" },
        { status: 400 }
      );
    }

    const articleText = `Title: ${title}\n\nDescription: ${description || ""}`;

    if (analyzeSentiment) {
      // Summarize + Sentiment analysis in one call
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 250,
        messages: [
          {
            role: "user",
            content: `Analyze this stock news article. Do two things:
1. Summarize it in exactly 60-80 words. Be crisp, factual, highlight the key takeaway for investors. Single paragraph, no bullet points.
2. Classify the sentiment for investors as exactly one of: "positive", "negative", or "neutral"

Respond in this exact JSON format (no markdown, no code blocks):
{"summary": "your summary here", "sentiment": "positive"}

Article:
${articleText}`,
          },
        ],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";

      try {
        const parsed = JSON.parse(responseText.trim());
        return NextResponse.json({
          summary: parsed.summary || "Summary unavailable",
          sentiment: parsed.sentiment || "neutral",
        });
      } catch {
        return NextResponse.json({
          summary: responseText,
          sentiment: "neutral",
        });
      }
    } else {
      // Just summarize
      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: `Summarize this stock news article in exactly 60-80 words. Be crisp, factual, and highlight the key takeaway for investors. Do not use bullet points. Write in a single paragraph.

${articleText}`,
          },
        ],
      });

      const summary =
        message.content[0].type === "text"
          ? message.content[0].text
          : "Summary unavailable";

      return NextResponse.json({ summary });
    }
  } catch (error) {
    console.error("Summarization error:", error);
    return NextResponse.json(
      { error: "Failed to summarize", summary: "AI summary temporarily unavailable." },
      { status: 500 }
    );
  }
}
