import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getNextReadData, buildNextReadPrompt } from "@/lib/lab";
import { safeJsonParse } from "@/lib/json-repair";
import {
  isCreditOrRateLimitError,
  getAnthropicErrorMessage,
} from "@/lib/anthropic-error";

export const maxDuration = 30;

type NextReadItem = {
  bookId: string;
  title: string;
  reason: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userQuery = body.query?.trim();

    if (!userQuery) {
      return NextResponse.json(
        { error: "気分・興味を入力してください" },
        { status: 400 }
      );
    }

    const { candidateText, candidateCount, trendText, readCount } =
      await getNextReadData();

    if (candidateCount === 0) {
      return NextResponse.json(
        { error: "「読みたい」「積読」に登録された本がありません" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = buildNextReadPrompt(
      userQuery,
      candidateText,
      candidateCount,
      trendText,
      readCount
    );

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const items = safeJsonParse<NextReadItem[]>(responseText, /\[[\s\S]*\]/);
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "推薦結果のパースに失敗しました" },
        { status: 500 }
      );
    }

    // candidateText から有効な ID を抽出してバリデーション
    const validIds = new Set(
      [...candidateText.matchAll(/\[ID: ([^\]]+)\]/g)].map((m) => m[1])
    );
    const validated = items.filter((item) => validIds.has(item.bookId));

    return NextResponse.json({ recommendations: validated });
  } catch (error) {
    console.error("[books/next-read] failed:", error);
    if (isCreditOrRateLimitError(error)) {
      return NextResponse.json(
        { error: getAnthropicErrorMessage(error), creditError: true },
        { status: 503 }
      );
    }
    const msg = error instanceof Error ? error.message : "不明なエラー";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
