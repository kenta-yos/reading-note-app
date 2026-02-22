/**
 * extract-raw-concepts.mjs
 * 語彙リストに縛られず、310冊から概念を自由抽出する（フェーズ①）
 * 結果を scripts/raw-concepts.json に保存する。
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: new URL("../.env", import.meta.url).pathname });

const __dirname = dirname(fileURLToPath(import.meta.url));
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function extractFree(book) {
  const notesSection = book.notes?.trim() ? `\n感想：\n${book.notes.trim()}` : "";
  const prompt = `書籍「${book.title}」を読んだ記録です。${notesSection}

この書籍が実際に扱っている学術的・思想的概念を3〜5個挙げてください。
・確信が持てるものだけを選んでください
・語彙リストは使わず、最も適切な表現で書いてください（2〜20文字の日本語）
・無理に多く挙げる必要はありません

返答はJSON配列のみ（説明文不要）。
例：["概念1", "概念2", "概念3"]`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
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
  console.log(`対象書籍: ${books.length} 冊\n`);

  // { bookId, title, concepts[] }[]
  const results = [];

  for (const book of books) {
    try {
      const concepts = await extractFree(book);
      results.push({ bookId: book.id, title: book.title, concepts });
      console.log(`[${results.length}/${books.length}] ${book.title} → [${concepts.join(", ")}]`);
    } catch (err) {
      results.push({ bookId: book.id, title: book.title, concepts: [] });
      console.error(`[${results.length}/${books.length}] Error: ${book.title} - ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  const outPath = join(__dirname, "raw-concepts.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");

  const allConcepts = results.flatMap((r) => r.concepts);
  console.log(`\n完了: ${results.length} 冊処理`);
  console.log(`総概念数（重複あり）: ${allConcepts.length}`);
  console.log(`ユニーク概念数（表記ゆれあり）: ${new Set(allConcepts).size}`);
  console.log(`保存先: ${outPath}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
