/**
 * retry-failed.mjs
 * センチネル（__api_error__）が残っている本のみ再処理する。
 * 直列処理 + 1.5秒ウェイトでレート制限を回避。
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: new URL("../.env", import.meta.url).pathname });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SENTINEL = "__api_error__";
const VOCAB_PATH = join(dirname(fileURLToPath(import.meta.url)), "../src/lib/concept-vocabulary.json");
const vocabulary = JSON.parse(readFileSync(VOCAB_PATH, "utf8"));
const vocabStr = vocabulary.join("、");

async function main() {
  const failedBooks = await prisma.book.findMany({
    where: {
      readAt: { not: null },
      keywords: { some: { keyword: SENTINEL } },
    },
    select: { id: true, title: true, notes: true },
  });
  console.log(`Retrying ${failedBooks.length} books (sequential, 1.5s delay)...`);

  let ok = 0, err = 0;
  for (const book of failedBooks) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const notesSection = book.notes?.trim() ? `\n感想：\n${book.notes.trim()}` : "";
      const prompt = `書籍「${book.title}」を読んだ記録です。${notesSection}

以下の語彙リストから、この読者が吸収・内面化した概念を最大8個選んでください。リストにまったく存在しない重要な概念がある場合のみ、最大2個まで追加可能（2〜15文字の日本語）。

語彙リスト：${vocabStr}

返答はJSON配列のみ。例：["概念1", "概念2"]`;

      const message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      });
      const text = message.content[0].type === "text" ? message.content[0].text : "";
      const match = text.match(/\[[\s\S]*?\]/);
      const concepts = match
        ? JSON.parse(match[0]).filter((s) => typeof s === "string" && s.trim())
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
        ok++;
      }
    } catch (e) {
      console.error(`  Error: ${book.title} - ${String(e.message).slice(0, 80)}`);
      err++;
    }
    if ((ok + err) % 20 === 0) console.log(`  ${ok + err} / ${failedBooks.length}...`);
  }
  console.log(`\nDone: ok=${ok}, err=${err}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
