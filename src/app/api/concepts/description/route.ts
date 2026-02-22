import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const concept = searchParams.get("concept");
  if (!concept) return NextResponse.json({ error: "concept required" }, { status: 400 });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `「${concept}」という概念・用語を、2〜3文で簡潔に説明してください。学術的な概念の場合は分野と定義を含め、一般読者が理解できる言葉で書いてください。余計な前置きは不要です。`,
        },
      ],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
    return NextResponse.json({ description: text || null });
  } catch (err) {
    console.error("[description]", err);
    return NextResponse.json({ description: null }, { status: 500 });
  }
}
