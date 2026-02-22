/**
 * keyword-extractor.ts
 * Claude APIを使って書籍タイトル＋感想から
 * 「吸収した概念・価値観・規範」を抽出するサーバー専用モジュール。
 * concept-vocabulary.json の正規語彙リストを優先使用。
 */
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";
import vocabulary from "./concept-vocabulary.json";

// API失敗時にDBに保存するセンチネル値（無限ループ防止用）
export const API_ERROR_SENTINEL = "__api_error__";

const VOCAB_STR = (vocabulary as string[]).join("、");

function buildPrompt(title: string, notes: string | null): string {
  const notesSection = notes?.trim() ? `\n感想：\n${notes.trim()}` : "";
  return `書籍「${title}」を読んだ記録です。${notesSection}

以下の語彙リストから、この書籍が実際に扱っている概念を選んでください。
・確信が持てる概念だけを選んでください（1〜5個が目安）
・タイトルや感想に直接関係しない概念は選ばないでください
・無理に多く選ぶ必要はありません
・リストにまったく存在しない重要な概念がある場合のみ、1〜2個まで追加可能（2〜15文字の日本語）

語彙リスト：${VOCAB_STR}

返答はJSON配列のみ。説明文不要。
例：["概念1", "概念2", "概念3"]`;
}

async function extractConceptsFromAPI(
  title: string,
  notes: string | null
): Promise<string[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: buildPrompt(title, notes) }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

/**
 * 未処理の書籍に対してAIで概念を抽出しDBに保存する。
 * - 成功: 実キーワードを保存。既存のセンチネルがあれば削除。
 * - 失敗: __api_error__ センチネルを保存。次回再試行できるようにする。
 * @returns hasError - 1冊でもAPIエラーがあれば true
 */
export async function extractAndStoreKeywords(
  books: { id: string; title: string; notes: string | null }[]
): Promise<{ hasError: boolean }> {
  if (books.length === 0) return { hasError: false };

  let hasError = false;

  for (const book of books) {
    try {
      const concepts = await extractConceptsFromAPI(book.title, book.notes);

      if (concepts.length > 0) {
        // 成功: センチネルを削除し、実キーワードを保存
        await prisma.bookKeyword.deleteMany({
          where: { bookId: book.id, keyword: API_ERROR_SENTINEL },
        });
        await Promise.all(
          concepts.map((keyword) =>
            prisma.bookKeyword.upsert({
              where: { bookId_keyword: { bookId: book.id, keyword } },
              create: { bookId: book.id, keyword, count: 1 },
              update: { count: 1 },
            })
          )
        );
      }
    } catch {
      // 失敗: センチネルを保存して次回再試行できるようにする
      hasError = true;
      await prisma.bookKeyword.upsert({
        where: { bookId_keyword: { bookId: book.id, keyword: API_ERROR_SENTINEL } },
        create: { bookId: book.id, keyword: API_ERROR_SENTINEL, count: 0 },
        update: { count: 0 },
      });
    }
  }

  return { hasError };
}
