/**
 * reextract-wider.mjs
 * 既存の concept-vocabulary.json を維持しつつ、
 * 1冊あたりの抽出上限を 8→12 に広げて全書籍を再抽出する。
 *
 * - BookKeyword を全削除してから再構築
 * - 順次処理 + 400ms 間隔でレート制限を回避
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: new URL("../.env", import.meta.url).pathname });

const __dirname = dirname(fileURLToPath(import.meta.url));
const vocabulary = JSON.parse(
  readFileSync(join(__dirname, "../src/lib/concept-vocabulary.json"), "utf8")
);
const VOCAB_STR = vocabulary.join("、");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SENTINEL = "__api_error__";

async function extractForBook(book) {
  const notesSection = book.notes?.trim() ? `\n感想：\n${book.notes.trim()}` : "";
  const prompt = `書籍「${book.title}」を読んだ記録です。${notesSection}

以下の語彙リストから、この書籍が実際に扱っている概念を選んでください。
・確信が持てる概念だけを選んでください（1〜5個が目安）
・タイトルや感想に直接関係しない概念は選ばないでください
・無理に多く選ぶ必要はありません
・リストにまったく存在しない重要な概念がある場合のみ、1〜2個まで追加可能（2〜15文字の日本語）

語彙リスト：${VOCAB_STR}

返答はJSON配列のみ（説明文不要）。
例：["概念1", "概念2", "概念3"]`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 384,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed)
      ? parsed.filter((s) => typeof s === "string" && s.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

async function main() {
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: { id: true, title: true, notes: true },
    orderBy: { readAt: "asc" },
  });
  console.log(`対象書籍: ${books.length} 冊`);
  console.log(`使用語彙: ${vocabulary.length} 語`);

  // 全 BookKeyword を削除
  const deleted = await prisma.bookKeyword.deleteMany({});
  console.log(`削除: ${deleted.count} 件の BookKeyword\n再抽出開始...\n`);

  let done = 0;
  let errors = 0;

  for (const book of books) {
    try {
      const concepts = await extractForBook(book);
      if (concepts.length > 0) {
        await Promise.all(
          concepts.map((keyword) =>
            prisma.bookKeyword.upsert({
              where: { bookId_keyword: { bookId: book.id, keyword } },
              create: { bookId: book.id, keyword, count: 1 },
              update: { count: 1 },
            })
          )
        );
        done++;
        console.log(`[${done + errors}/${books.length}] ${book.title} → ${concepts.length}概念`);
      } else {
        await prisma.bookKeyword.upsert({
          where: { bookId_keyword: { bookId: book.id, keyword: SENTINEL } },
          create: { bookId: book.id, keyword: SENTINEL, count: 0 },
          update: { count: 0 },
        });
        errors++;
        console.log(`[${done + errors}/${books.length}] ${book.title} → (空)`);
      }
    } catch (err) {
      errors++;
      console.error(`[${done + errors}/${books.length}] Error: ${book.title} - ${err.message}`);
      await prisma.bookKeyword.upsert({
        where: { bookId_keyword: { bookId: book.id, keyword: SENTINEL } },
        create: { bookId: book.id, keyword: SENTINEL, count: 0 },
        update: { count: 0 },
      }).catch(() => {});
    }

    // レート制限対策: 400ms 待機
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\n完了: ${done} 冊成功、${errors} 件エラー`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
