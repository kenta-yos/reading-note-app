/**
 * POST /api/lab/recommend
 * おすすめSSE: クエリ生成 → NDL+Scholar検索 → AI選定 → 翻訳 → DB保存
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { isCreditOrRateLimitError, getAnthropicErrorMessage } from "@/lib/anthropic-error";
import {
  getBookMetadataForRecommend,
  buildQueryGenerationPrompt,
  buildSelectionPrompt,
  buildTranslationPrompt,
} from "@/lib/lab";
import {
  searchNdlByKeywords,
  type NdlSearchQuery,
} from "@/lib/ndl-search";
import { searchPapersMultiple } from "@/lib/semantic-scholar";

export const maxDuration = 120;

type Recommendation = {
  type: "book" | "paper";
  intent: "deepen" | "broaden";
  title: string;
  titleJa?: string;
  author: string;
  publisher?: string;
  year: string;
  isbn?: string;
  url?: string;
  reason: string;
  reasonJa?: string;
};

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
        const client = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Step 0: preparing (0-5%)
        send("progress", {
          step: "preparing",
          percent: 3,
          message: "読書データを準備中…",
        });

        const { metadataText, titleList, bookCount } =
          await getBookMetadataForRecommend();

        if (bookCount === 0) {
          send("error", { error: "読書記録がありません" });
          controller.close();
          return;
        }

        // Step 1: generating_queries (5-15%)
        send("progress", {
          step: "generating_queries",
          percent: 8,
          message: "検索クエリを生成中…",
        });

        const queryPrompt = buildQueryGenerationPrompt(
          metadataText,
          bookCount
        );
        const queryMessage = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [{ role: "user", content: queryPrompt }],
        });

        const queryText =
          queryMessage.content[0].type === "text"
            ? queryMessage.content[0].text
            : "";
        const queryMatch = queryText.match(/\{[\s\S]*\}/);
        if (!queryMatch) {
          send("error", { error: "クエリ生成に失敗しました" });
          controller.close();
          return;
        }

        const queries = JSON.parse(queryMatch[0]) as {
          ndlQueries: NdlSearchQuery[];
          scholarQueries: { query: string; intent: string; description: string }[];
        };

        send("progress", {
          step: "generating_queries",
          percent: 15,
          message: `NDL ${queries.ndlQueries.length}件 + Scholar ${queries.scholarQueries.length}件のクエリを生成しました`,
        });

        // Step 2: searching (15-45%) - NDL + Scholar 並列
        send("progress", {
          step: "searching_ndl",
          percent: 20,
          message: "NDLで書籍を検索中…",
        });

        const [ndlResults, scholarResults] = await Promise.all([
          searchNdlByKeywords(queries.ndlQueries),
          (async () => {
            send("progress", {
              step: "searching_scholar",
              percent: 30,
              message: "Semantic Scholarで論文を検索中…",
            });
            return searchPapersMultiple(queries.scholarQueries);
          })(),
        ]);

        send("progress", {
          step: "searching_scholar",
          percent: 45,
          message: `NDL ${ndlResults.length}件 + Scholar ${scholarResults.length}件の候補が見つかりました`,
        });

        if (ndlResults.length === 0 && scholarResults.length === 0) {
          send("error", { error: "候補が見つかりませんでした" });
          controller.close();
          return;
        }

        // Step 3: selecting (45-85%)
        send("progress", {
          step: "selecting",
          percent: 50,
          message: "AIがおすすめを選定中…",
        });

        const ndlCandidatesJson = JSON.stringify(
          ndlResults.map((r) => ({
            title: r.title,
            authors: r.authors.join("、"),
            publisher: r.publisher,
            year: r.year,
            isbn: r.isbn,
            intent: r.searchIntent,
          })),
          null,
          2
        );

        const scholarCandidatesJson = JSON.stringify(
          scholarResults.map((r) => ({
            title: r.title,
            authors: r.authors.join(", "),
            year: r.year,
            abstract: r.abstract?.slice(0, 200),
            url: r.url,
            citations: r.citationCount,
            intent: r.searchIntent,
          })),
          null,
          2
        );

        const selectionPrompt = buildSelectionPrompt(
          ndlCandidatesJson,
          scholarCandidatesJson,
          titleList
        );

        const selectionMessage = await client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{ role: "user", content: selectionPrompt }],
        });

        const selectionText =
          selectionMessage.content[0].type === "text"
            ? selectionMessage.content[0].text
            : "";
        const selectionMatch = selectionText.match(/\[[\s\S]*\]/);
        if (!selectionMatch) {
          send("error", { error: "選定に失敗しました" });
          controller.close();
          return;
        }

        const recommendations: Recommendation[] = JSON.parse(
          selectionMatch[0]
        );

        // Step 4: translating (85-92%)
        const englishItems = recommendations.filter(
          (r) => r.type === "paper"
        );

        if (englishItems.length > 0) {
          send("progress", {
            step: "translating",
            percent: 87,
            message: "英語論文を翻訳中…",
          });

          const translationPrompt = buildTranslationPrompt(
            englishItems.map((r) => ({
              title: r.title,
              reason: r.reason,
            }))
          );

          const translationMessage = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2048,
            messages: [
              { role: "user", content: translationPrompt },
            ],
          });

          const translationText =
            translationMessage.content[0].type === "text"
              ? translationMessage.content[0].text
              : "";
          const translationMatch = translationText.match(/\[[\s\S]*\]/);
          if (translationMatch) {
            const translations = JSON.parse(translationMatch[0]) as {
              title_ja: string;
              reason_ja: string;
            }[];
            let ti = 0;
            for (const rec of recommendations) {
              if (rec.type === "paper" && ti < translations.length) {
                rec.titleJa = translations[ti].title_ja;
                rec.reasonJa = translations[ti].reason_ja;
                ti++;
              }
            }
          }
        }

        // Step 5: saving (92-98%)
        send("progress", {
          step: "saving",
          percent: 95,
          message: "結果を保存中…",
        });

        const session = await prisma.recommendSession.create({
          data: {
            recommendations,
          },
        });

        send("done", { id: session.id, recommendations });
        controller.close();
      } catch (error) {
        console.error("[lab/recommend] failed:", error);
        if (isCreditOrRateLimitError(error)) {
          send("error", { error: getAnthropicErrorMessage(error), creditError: true });
        } else {
          const message =
            error instanceof Error ? error.message : "不明なエラー";
          send("error", { error: `推薦エラー: ${message}` });
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
