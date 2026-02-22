/**
 * POST /api/vocab-refresh
 * 既存の全書籍を正規語彙で再抽出する（バックグラウンド処理）。
 * 処理に時間がかかるためSSEではなくジョブIDを返す実装は省略し、
 * Vercelのタイムアウト上限内で同期処理できる件数をバッチ処理する。
 *
 * Note: Vercelのサーバーレス関数はmax 60秒のため、未処理の本のみを
 * 最大40冊ずつ処理する。複数回呼び出すことで全冊処理できる。
 */
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { API_ERROR_SENTINEL, NO_CONCEPTS_SENTINEL } from "@/lib/keyword-extractor";
import vocabulary from "@/lib/concept-vocabulary.json";

const VOCAB_STR = (vocabulary as string[]).join("、");
const BATCH_PER_CALL = 30;
const DELAY_MS = 1200;

function buildPrompt(title: string, notes: string | null): string {
  const notesSection = notes?.trim() ? `\n感想：\n${notes.trim()}` : "";
  return `書籍「${title}」を読んだ記録です。${notesSection}

以下の語彙リストから、この読者が吸収・内面化した概念を最大8個選んでください。
リストにまったく存在しない重要な概念がある場合のみ、最大2個まで追加可能（2〜15文字の日本語）。

語彙リスト：${VOCAB_STR}

返答はJSON配列のみ。例：["概念1", "概念2"]`;
}

export async function POST() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // 未処理（センチネルあり or キーワードなし）の本を取得
  const pending = await prisma.book.findMany({
    where: {
      readAt: { not: null },
      NOT: {
        keywords: { some: { keyword: { not: API_ERROR_SENTINEL } } },
      },
    },
    select: { id: true, title: true, notes: true },
    take: BATCH_PER_CALL,
  });

  // 全件処理済みかを確認
  const totalPending = await prisma.book.count({
    where: {
      readAt: { not: null },
      NOT: {
        keywords: { some: { keyword: { not: API_ERROR_SENTINEL } } },
      },
    },
  });

  if (pending.length === 0) {
    return NextResponse.json({ done: true, processed: 0, remaining: 0 });
  }

  let processed = 0;
  let errors = 0;

  for (const book of pending) {
    if (processed > 0) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: buildPrompt(book.title, book.notes) }],
      });
      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const match = text.match(/\[[\s\S]*?\]/);
      const concepts = match
        ? (JSON.parse(match[0]) as unknown[]).filter(
            (s): s is string => typeof s === "string" && s.trim().length > 0
          )
        : [];

      if (concepts.length > 0) {
        await prisma.bookKeyword.deleteMany({ where: { bookId: book.id } });
        await Promise.all(
          concepts.map((keyword) =>
            prisma.bookKeyword.upsert({
              where: { bookId_keyword: { bookId: book.id, keyword } },
              create: { bookId: book.id, keyword, count: 1 },
              update: { count: 1 },
            })
          )
        );
        processed++;
      } else {
        // API成功だが語彙リストに一致する概念がなかった → 再試行ループを防ぐ
        await prisma.bookKeyword.deleteMany({
          where: { bookId: book.id, keyword: API_ERROR_SENTINEL },
        });
        await prisma.bookKeyword.upsert({
          where: { bookId_keyword: { bookId: book.id, keyword: NO_CONCEPTS_SENTINEL } },
          create: { bookId: book.id, keyword: NO_CONCEPTS_SENTINEL, count: 0 },
          update: { count: 0 },
        });
        processed++;
      }
    } catch {
      errors++;
      await prisma.bookKeyword.upsert({
        where: {
          bookId_keyword: { bookId: book.id, keyword: API_ERROR_SENTINEL },
        },
        create: { bookId: book.id, keyword: API_ERROR_SENTINEL, count: 0 },
        update: { count: 0 },
      });
    }
  }

  return NextResponse.json({
    done: totalPending - pending.length <= 0,
    processed,
    errors,
    remaining: Math.max(0, totalPending - pending.length),
  });
}
