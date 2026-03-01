/**
 * POST /api/lab/translate-paper
 * SSE: PDF取得 → テキスト抽出 → Claude翻訳（チャンク送信）
 */
import Anthropic from "@anthropic-ai/sdk";
import { isCreditOrRateLimitError, getAnthropicErrorMessage } from "@/lib/anthropic-error";

export const maxDuration = 300;

const MAX_PAGES = 100;
const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: Request) {
  const { pdfUrl } = (await req.json()) as { pdfUrl?: string };

  if (!pdfUrl) {
    return Response.json({ error: "pdfUrl is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // Step 1: Fetch PDF (0-20%)
        send("progress", {
          step: "fetching_pdf",
          percent: 5,
          message: "PDFを取得中…",
        });

        const pdfRes = await fetch(pdfUrl, {
          signal: AbortSignal.timeout(30000),
          headers: {
            "User-Agent": "ScholarGraph/1.0 (academic-reading-assistant)",
          },
        });

        if (!pdfRes.ok) {
          send("error", { error: `PDF取得に失敗しました (${pdfRes.status})` });
          controller.close();
          return;
        }

        const contentLength = pdfRes.headers.get("content-length");
        if (contentLength && parseInt(contentLength) > MAX_PDF_SIZE) {
          send("error", { error: "PDFが大きすぎます（50MB上限）" });
          controller.close();
          return;
        }

        send("progress", {
          step: "fetching_pdf",
          percent: 15,
          message: "PDFをダウンロード中…",
        });

        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());

        send("progress", {
          step: "fetching_pdf",
          percent: 20,
          message: "PDFを取得しました",
        });

        // Step 2: Extract text (20-40%)
        send("progress", {
          step: "extracting_text",
          percent: 25,
          message: "テキストを抽出中…",
        });

        // Dynamic import for pdf-parse (v3+ class-based API)
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
        const textResult = await parser.getText();
        await parser.destroy();
        const numPages = textResult.total;
        const extractedText = textResult.text ?? "";

        if (numPages > MAX_PAGES) {
          send("error", {
            error: `PDFが大きすぎます（${numPages}ページ、上限${MAX_PAGES}ページ）`,
          });
          controller.close();
          return;
        }

        if (!extractedText || extractedText.trim().length < 100) {
          send("error", {
            error:
              "PDFからテキストを抽出できませんでした（画像ベースのPDFの可能性があります）",
          });
          controller.close();
          return;
        }

        send("progress", {
          step: "extracting_text",
          percent: 40,
          message: `${numPages}ページからテキストを抽出しました`,
        });

        // Step 3: Translate with Claude (40-95%)
        send("progress", {
          step: "translating",
          percent: 45,
          message: "翻訳を開始します…",
        });

        const client = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // Split text into chunks (~4000 chars each) for progressive translation
        const fullText = extractedText.trim();
        const CHUNK_SIZE = 4000;
        const chunks: string[] = [];
        for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
          chunks.push(fullText.slice(i, i + CHUNK_SIZE));
        }

        let translatedText = "";
        for (let i = 0; i < chunks.length; i++) {
          const percent = Math.round(45 + (i / chunks.length) * 50);
          send("progress", {
            step: "translating",
            percent,
            message: `翻訳中… (${i + 1}/${chunks.length})`,
          });

          const msg = await client.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 8192,
            messages: [
              {
                role: "user",
                content: `以下の英語の学術論文テキストを日本語に翻訳してください。学術的で自然な日本語にしてください。
段落構成は維持してください。数式や図表の参照はそのままにしてください。

テキスト:
${chunks[i]}

翻訳（日本語テキストのみを返してください）:`,
              },
            ],
          });

          const chunkTranslation =
            msg.content[0].type === "text" ? msg.content[0].text : "";
          translatedText += chunkTranslation + "\n\n";

          send("chunk", {
            index: i,
            total: chunks.length,
            text: chunkTranslation,
          });
        }

        // Done
        send("progress", {
          step: "done",
          percent: 100,
          message: "翻訳が完了しました",
        });

        send("done", {
          fullText: translatedText.trim(),
          pageCount: numPages,
          charCount: fullText.length,
        });

        controller.close();
      } catch (error) {
        console.error("[translate-paper] failed:", error);
        if (isCreditOrRateLimitError(error)) {
          send("error", {
            error: getAnthropicErrorMessage(error),
            creditError: true,
          });
        } else {
          const message =
            error instanceof Error ? error.message : "不明なエラー";
          send("error", { error: `翻訳エラー: ${message}` });
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
