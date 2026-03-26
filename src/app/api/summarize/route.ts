import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { title, description } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: "No article text provided" },
        { status: 400 }
      );
    }

    const articleText = `Title: ${title}\n\nDescription: ${description || ""}`;

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
  } catch (error) {
    console.error("Summarization error:", error);
    return NextResponse.json(
      { error: "Failed to summarize" },
      { status: 500 }
    );
  }
}
