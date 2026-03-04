/**
 * Consolidated /api/lab/* routes
 * - POST /api/lab/insights
 * - POST /api/lab/translate-paper
 * - POST /api/lab/recommend
 * - POST /api/lab/recommend/search
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { isCreditOrRateLimitError, getAnthropicErrorMessage } from "@/lib/anthropic-error";
import {
  getAllBooksForInsight,
  buildInsightPrompt,
  getBookMetadataForRecommend,
  buildQueryGenerationPrompt,
  buildSelectionPrompt,
  buildTranslationPrompt,
  buildNaturalSearchQueryPrompt,
  buildNaturalSearchQueryWithAnswersPrompt,
} from "@/lib/lab";
import { searchNdlByKeywords, type NdlSearchQuery } from "@/lib/ndl-search";
import { searchPapersMultiple, type ScholarPaper } from "@/lib/semantic-scholar";
import { safeJsonParse } from "@/lib/json-repair";

export const maxDuration = 300;

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

function sseResponse(handler: (send: (event: string, data: unknown) => void, controller: ReadableStreamDefaultController) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      await handler(send, controller);
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}

// ── /api/lab/insights ──
async function handleInsights() {
  return sseResponse(async (send, controller) => {
    try {
      send("progress", { step: "preparing", percent: 5, message: "読書データを準備中…" });
      const { text, bookCount } = await getAllBooksForInsight();
      if (bookCount === 0) { send("error", { error: "分析する読書記録がありません" }); controller.close(); return; }
      send("progress", { step: "preparing", percent: 10, message: `${bookCount}冊のデータを準備しました` });
      send("progress", { step: "analyzing", percent: 15, message: "AIが読書履歴を分析中…" });

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const prompt = buildInsightPrompt(text, bookCount);
      const message = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages: [{ role: "user", content: prompt }] });
      const responseText = message.content[0].type === "text" ? message.content[0].text : "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { send("error", { error: "分析結果のパースに失敗しました" }); controller.close(); return; }
      const analysis = JSON.parse(jsonMatch[0]);

      send("progress", { step: "saving", percent: 90, message: "結果を保存中…" });
      const insight = await prisma.readingInsight.create({ data: { analysis, bookCount } });
      send("done", { id: insight.id, analysis, bookCount });
      controller.close();
    } catch (error) {
      console.error("[lab/insights] failed:", error);
      if (isCreditOrRateLimitError(error)) { send("error", { error: getAnthropicErrorMessage(error), creditError: true }); }
      else { send("error", { error: `分析エラー: ${error instanceof Error ? error.message : "不明なエラー"}` }); }
      controller.close();
    }
  });
}

// ── /api/lab/translate-paper ──
async function handleTranslatePaper(req: Request) {
  const { pdfUrl } = (await req.json()) as { pdfUrl?: string };
  if (!pdfUrl) return Response.json({ error: "pdfUrl is required" }, { status: 400 });

  const MAX_PAGES = 100;
  const MAX_PDF_SIZE = 50 * 1024 * 1024;

  return sseResponse(async (send, controller) => {
    try {
      send("progress", { step: "fetching_pdf", percent: 5, message: "PDFを取得中…" });
      const pdfRes = await fetch(pdfUrl, { signal: AbortSignal.timeout(30000), headers: { "User-Agent": "ScholarGraph/1.0 (academic-reading-assistant)" } });
      if (!pdfRes.ok) { send("error", { error: `PDF取得に失敗しました (${pdfRes.status})` }); controller.close(); return; }
      const contentLength = pdfRes.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > MAX_PDF_SIZE) { send("error", { error: "PDFが大きすぎます（50MB上限）" }); controller.close(); return; }

      send("progress", { step: "fetching_pdf", percent: 15, message: "PDFをダウンロード中…" });
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
      send("progress", { step: "fetching_pdf", percent: 20, message: "PDFを取得しました" });
      send("progress", { step: "extracting_text", percent: 25, message: "テキストを抽出中…" });

      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
      const textResult = await parser.getText();
      await parser.destroy();
      const numPages = textResult.total;
      const extractedText = textResult.text ?? "";

      if (numPages > MAX_PAGES) { send("error", { error: `PDFが大きすぎます（${numPages}ページ、上限${MAX_PAGES}ページ）` }); controller.close(); return; }
      if (!extractedText || extractedText.trim().length < 100) { send("error", { error: "PDFからテキストを抽出できませんでした（画像ベースのPDFの可能性があります）" }); controller.close(); return; }

      send("progress", { step: "extracting_text", percent: 40, message: `${numPages}ページからテキストを抽出しました` });
      send("progress", { step: "translating", percent: 45, message: "翻訳を開始します…" });

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const fullText = extractedText.trim();
      const CHUNK_SIZE = 4000;
      const chunks: string[] = [];
      for (let i = 0; i < fullText.length; i += CHUNK_SIZE) chunks.push(fullText.slice(i, i + CHUNK_SIZE));

      let translatedText = "";
      for (let i = 0; i < chunks.length; i++) {
        const percent = Math.round(45 + (i / chunks.length) * 50);
        send("progress", { step: "translating", percent, message: `翻訳中… (${i + 1}/${chunks.length})` });
        const msg = await client.messages.create({
          model: "claude-haiku-4-5-20251001", max_tokens: 8192,
          messages: [{ role: "user", content: `以下の英語の学術論文テキストを日本語に翻訳してください。学術的で自然な日本語にしてください。\n段落構成は維持してください。数式や図表の参照はそのままにしてください。\n\nテキスト:\n${chunks[i]}\n\n翻訳（日本語テキストのみを返してください）:` }],
        });
        const chunkTranslation = msg.content[0].type === "text" ? msg.content[0].text : "";
        translatedText += chunkTranslation + "\n\n";
        send("chunk", { index: i, total: chunks.length, text: chunkTranslation });
      }

      send("progress", { step: "done", percent: 100, message: "翻訳が完了しました" });
      send("done", { fullText: translatedText.trim(), pageCount: numPages, charCount: fullText.length });
      controller.close();
    } catch (error) {
      console.error("[translate-paper] failed:", error);
      if (isCreditOrRateLimitError(error)) { send("error", { error: getAnthropicErrorMessage(error), creditError: true }); }
      else { send("error", { error: `翻訳エラー: ${error instanceof Error ? error.message : "不明なエラー"}` }); }
      controller.close();
    }
  });
}

// ── shared: recommend selection + translation ──
async function selectAndTranslate(
  send: (event: string, data: unknown) => void,
  controller: ReadableStreamDefaultController,
  client: Anthropic,
  ndlResults: Awaited<ReturnType<typeof searchNdlByKeywords>>,
  scholarResults: (ScholarPaper & { searchIntent: string })[],
  titleList: string[],
  searchType: string,
  userQuery?: string
) {
  send("progress", { step: "selecting", percent: 50, message: "AIがおすすめを選定中…" });

  const ndlCandidatesJson = JSON.stringify(ndlResults.map((r) => ({ title: r.title, authors: r.authors.join("、"), publisher: r.publisher, year: r.year, isbn: r.isbn })), null, 2);
  const scholarCandidatesJson = JSON.stringify(scholarResults.map((r) => ({ title: r.title, authors: r.authors.join(", "), year: r.year, abstract: r.abstract?.slice(0, 200), url: r.url, citations: r.citationCount, openAccessPdfUrl: r.openAccessPdfUrl })), null, 2);

  const selectionMessage = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages: [{ role: "user", content: buildSelectionPrompt(ndlCandidatesJson, scholarCandidatesJson, titleList) }] });
  const selectionText = selectionMessage.content[0].type === "text" ? selectionMessage.content[0].text : "";
  const recommendations = safeJsonParse<Recommendation[]>(selectionText, /\[[\s\S]*\]/);
  if (!recommendations) { send("error", { error: "選定に失敗しました" }); controller.close(); return; }

  const scholarByUrl = new Map<string, ScholarPaper & { searchIntent: string }>();
  for (const r of scholarResults) scholarByUrl.set(r.url, r);
  for (const rec of recommendations) {
    if (rec.type === "paper" && rec.url) {
      const match = scholarByUrl.get(rec.url);
      if (match?.openAccessPdfUrl) rec.openAccessPdfUrl = match.openAccessPdfUrl;
    }
  }

  const englishItems = recommendations.filter((r) => r.type === "paper");
  if (englishItems.length > 0) {
    send("progress", { step: "translating", percent: 87, message: "英語論文を翻訳中…" });
    const translationMessage = await client.messages.create({ model: "claude-haiku-4-5-20251001", max_tokens: 2048, messages: [{ role: "user", content: buildTranslationPrompt(englishItems.map((r) => ({ title: r.title, reason: r.reason }))) }] });
    const translationText = translationMessage.content[0].type === "text" ? translationMessage.content[0].text : "";
    const translations = safeJsonParse<{ title_ja: string; reason_ja: string }[]>(translationText, /\[[\s\S]*\]/);
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

  send("progress", { step: "saving", percent: 95, message: "結果を保存中…" });
  const session = await prisma.recommendSession.create({ data: { recommendations, searchType, ...(userQuery ? { userQuery } : {}) } });
  send("done", { id: session.id, recommendations });
  controller.close();
}

// ── /api/lab/recommend ──
async function handleRecommend() {
  return sseResponse(async (send, controller) => {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      send("progress", { step: "preparing", percent: 3, message: "読書データを準備中…" });
      const { metadataText, titleList, bookCount } = await getBookMetadataForRecommend();
      if (bookCount === 0) { send("error", { error: "読書記録がありません" }); controller.close(); return; }

      send("progress", { step: "generating_queries", percent: 8, message: "検索クエリを生成中…" });
      const queryMessage = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 2048, messages: [{ role: "user", content: buildQueryGenerationPrompt(metadataText, bookCount) }] });
      const queryText = queryMessage.content[0].type === "text" ? queryMessage.content[0].text : "";
      const queries = safeJsonParse<{ ndlQueries: NdlSearchQuery[]; scholarQueries: { query: string; description: string }[] }>(queryText, /\{[\s\S]*\}/);
      if (!queries) { send("error", { error: "クエリ生成に失敗しました" }); controller.close(); return; }

      send("progress", { step: "generating_queries", percent: 15, message: `NDL ${queries.ndlQueries.length}件 + Scholar ${queries.scholarQueries.length}件のクエリを生成しました` });
      send("progress", { step: "searching_ndl", percent: 20, message: "NDLで書籍を検索中…" });

      const ndlQueriesWithIntent = queries.ndlQueries.map((q) => ({ ...q, intent: q.intent || "" }));
      const scholarQueriesWithIntent = queries.scholarQueries.map((q) => ({ ...q, intent: "" }));
      const [ndlResults, scholarResults] = await Promise.all([
        searchNdlByKeywords(ndlQueriesWithIntent),
        (async () => { send("progress", { step: "searching_scholar", percent: 30, message: "Semantic Scholarで論文を検索中…" }); return searchPapersMultiple(scholarQueriesWithIntent); })(),
      ]);

      send("progress", { step: "searching_scholar", percent: 45, message: `NDL ${ndlResults.length}件 + Scholar ${scholarResults.length}件の候補が見つかりました` });
      if (ndlResults.length === 0 && scholarResults.length === 0) { send("error", { error: "候補が見つかりませんでした" }); controller.close(); return; }

      await selectAndTranslate(send, controller, client, ndlResults, scholarResults, titleList, "auto");
    } catch (error) {
      console.error("[lab/recommend] failed:", error);
      if (isCreditOrRateLimitError(error)) { send("error", { error: getAnthropicErrorMessage(error), creditError: true }); }
      else { send("error", { error: `推薦エラー: ${error instanceof Error ? error.message : "不明なエラー"}` }); }
      controller.close();
    }
  });
}

// ── /api/lab/recommend/search ──
async function handleRecommendSearch(req: Request) {
  const body = (await req.json()) as { userQuery: string; answers?: { questionId: string; question: string; answer: string }[] };
  const { userQuery, answers } = body;
  if (!userQuery?.trim()) return Response.json({ error: "検索クエリを入力してください" }, { status: 400 });

  return sseResponse(async (send, controller) => {
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      send("progress", { step: "preparing", percent: 3, message: "読書データを準備中…" });
      const { metadataText, titleList, bookCount } = await getBookMetadataForRecommend();
      if (bookCount === 0) { send("error", { error: "読書記録がありません" }); controller.close(); return; }

      send("progress", { step: "generating_queries", percent: 8, message: "検索意図を分析中…" });
      const queryPrompt = answers && answers.length > 0
        ? buildNaturalSearchQueryWithAnswersPrompt(userQuery, answers, metadataText, bookCount)
        : buildNaturalSearchQueryPrompt(userQuery, metadataText, bookCount);
      const queryMessage = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 2048, messages: [{ role: "user", content: queryPrompt }] });
      const queryText = queryMessage.content[0].type === "text" ? queryMessage.content[0].text : "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = safeJsonParse<any>(queryText, /\{[\s\S]*\}/);
      if (!parsed) { send("error", { error: "クエリ分析に失敗しました" }); controller.close(); return; }

      if (parsed.action === "clarify" && !answers) { send("clarify", { questions: parsed.questions }); controller.close(); return; }

      const queries = { ndlQueries: parsed.ndlQueries as NdlSearchQuery[], scholarQueries: parsed.scholarQueries as { query: string; description: string }[] };
      send("progress", { step: "generating_queries", percent: 15, message: `NDL ${queries.ndlQueries.length}件 + Scholar ${queries.scholarQueries.length}件のクエリを生成しました` });
      send("progress", { step: "searching_ndl", percent: 20, message: "NDLで書籍を検索中…" });

      const ndlQueriesWithIntent = queries.ndlQueries.map((q) => ({ ...q, intent: q.intent || "" }));
      const scholarQueriesWithIntent = queries.scholarQueries.map((q) => ({ ...q, intent: "" }));
      const [ndlResults, scholarResults] = await Promise.all([
        searchNdlByKeywords(ndlQueriesWithIntent),
        (async () => { send("progress", { step: "searching_scholar", percent: 30, message: "Semantic Scholarで論文を検索中…" }); return searchPapersMultiple(scholarQueriesWithIntent); })(),
      ]);

      send("progress", { step: "searching_scholar", percent: 45, message: `NDL ${ndlResults.length}件 + Scholar ${scholarResults.length}件の候補が見つかりました` });
      if (ndlResults.length === 0 && scholarResults.length === 0) { send("error", { error: "候補が見つかりませんでした" }); controller.close(); return; }

      await selectAndTranslate(send, controller, client, ndlResults, scholarResults, titleList, "search", userQuery);
    } catch (error) {
      console.error("[lab/recommend/search] failed:", error);
      if (isCreditOrRateLimitError(error)) { send("error", { error: getAnthropicErrorMessage(error), creditError: true }); }
      else { send("error", { error: `検索エラー: ${error instanceof Error ? error.message : "不明なエラー"}` }); }
      controller.close();
    }
  });
}

// ── Routing ──
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");

  if (path === "insights") return handleInsights();
  if (path === "translate-paper") return handleTranslatePaper(req);
  if (path === "recommend") return handleRecommend();
  if (path === "recommend/search") return handleRecommendSearch(req);

  return Response.json({ error: "Not found" }, { status: 404 });
}
