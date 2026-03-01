/**
 * POST /api/lab/insights
 * 読書分析SSE: 全notes → Claude Sonnet → JSON → DB保存
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getAllBooksForInsight, buildInsightPrompt } from "@/lib/lab";
import { isCreditOrRateLimitError, getAnthropicErrorMessage } from "@/lib/anthropic-error";

export const maxDuration = 120;

export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // preparing (0-10%)
        send("progress", { step: "preparing", percent: 5, message: "読書データを準備中…" });

        const { text, bookCount } = await getAllBooksForInsight();

        if (bookCount === 0) {
          send("error", { error: "分析する読書記録がありません" });
          controller.close();
          return;
        }

        send("progress", {
          step: "preparing",
          percent: 10,
          message: `${bookCount}冊のデータを準備しました`,
        });

        // analyzing (10-85%)
        send("progress", {
          step: "analyzing",
          percent: 15,
          message: "AIが読書履歴を分析中…",
        });

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const prompt = buildInsightPrompt(text, bookCount);

        const message = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });

        const responseText =
          message.content[0].type === "text" ? message.content[0].text : "";

        // JSONを抽出
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          send("error", { error: "分析結果のパースに失敗しました" });
          controller.close();
          return;
        }

        const analysis = JSON.parse(jsonMatch[0]);

        send("progress", {
          step: "saving",
          percent: 90,
          message: "結果を保存中…",
        });

        // DB保存
        const insight = await prisma.readingInsight.create({
          data: {
            analysis,
            bookCount,
          },
        });

        send("done", { id: insight.id, analysis, bookCount });
        controller.close();
      } catch (error) {
        console.error("[lab/insights] failed:", error);
        if (isCreditOrRateLimitError(error)) {
          send("error", { error: getAnthropicErrorMessage(error), creditError: true });
        } else {
          const message =
            error instanceof Error ? error.message : "不明なエラー";
          send("error", { error: `分析エラー: ${message}` });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
