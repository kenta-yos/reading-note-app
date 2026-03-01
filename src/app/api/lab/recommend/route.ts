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
import { searchPapersMultiple, type ScholarPaper } from "@/lib/semantic-scholar";
import { safeJsonParse } from "@/lib/json-repair";

export const maxDuration = 120;

type Recommendation = {
  type: "book" | "paper";
  title: string;
  titleJa?: string;
  author: string;
  publisher?: string;
  year: string;
  isbn?: string;
  url?: string;
  openAccessPdfUrl?: string;
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
        const queries = safeJsonParse<{
          ndlQueries: NdlSearchQuery[];
          scholarQueries: { query: string; description: string }[];
        }>(queryText, /\{[\s\S]*\}/);
        if (!queries) {
          send("error", { error: "クエリ生成に失敗しました" });
          controller.close();
          return;
        }

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

        // NDL queries don't need intent anymore - fill with empty string for compat
        const ndlQueriesWithIntent = queries.ndlQueries.map((q) => ({
          ...q,
          intent: q.intent || "",
        }));
        const scholarQueriesWithIntent = queries.scholarQueries.map((q) => ({
          ...q,
          intent: "",
        }));

        const [ndlResults, scholarResults] = await Promise.all([
          searchNdlByKeywords(ndlQueriesWithIntent),
          (async () => {
            send("progress", {
              step: "searching_scholar",
              percent: 30,
              message: "Semantic Scholarで論文を検索中…",
            });
            return searchPapersMultiple(scholarQueriesWithIntent);
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
            openAccessPdfUrl: r.openAccessPdfUrl,
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
        const recommendations = safeJsonParse<Recommendation[]>(
          selectionText,
          /\[[\s\S]*\]/
        );
        if (!recommendations) {
          send("error", { error: "選定に失敗しました" });
          controller.close();
          return;
        }

        // Attach openAccessPdfUrl from Scholar results to paper recommendations
        const scholarByUrl = new Map<string, ScholarPaper & { searchIntent: string }>();
        for (const r of scholarResults) {
          scholarByUrl.set(r.url, r);
        }
        for (const rec of recommendations) {
          if (rec.type === "paper" && rec.url) {
            const match = scholarByUrl.get(rec.url);
            if (match?.openAccessPdfUrl) {
              rec.openAccessPdfUrl = match.openAccessPdfUrl;
            }
          }
        }

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
          const translations = safeJsonParse<{
              title_ja: string;
              reason_ja: string;
            }[]>(translationText, /\[[\s\S]*\]/);
          if (translations) {
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
            searchType: "auto",
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
