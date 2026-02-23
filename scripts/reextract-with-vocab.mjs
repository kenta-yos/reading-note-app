/**
 * reextract-with-vocab.mjs
 * Step 1: 全書籍を見てClaude Opusで正規語彙リストを生成 → concept-vocabulary.json に保存
 * Step 2: 全書籍を語彙リストに基づいてClaude Haikuで再抽出 → BookKeyword を再構築
 *
 * 使い方: node scripts/reextract-with-vocab.mjs
 * 注意: 全 BookKeyword を削除して入れ替えます
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: new URL("../.env", import.meta.url).pathname });

const __dirname = dirname(fileURLToPath(import.meta.url));
const VOCAB_PATH = join(__dirname, "../src/lib/concept-vocabulary.json");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SENTINEL = "__api_error__";
const BATCH_SIZE = 10;

// ── Step 1: 正規語彙リストを生成 ─────────────────────────────
async function generateVocabulary(books) {
  console.log(`\n[Step 1] Generating canonical vocabulary from ${books.length} books...`);

  const bookSummaries = books
    .map((b) => {
      const notes = b.notes?.trim() ? `（感想: ${b.notes.trim().slice(0, 80)}）` : "";
      return `・${b.title}${b.category ? ` [${b.category}]` : ""}${notes}`;
    })
    .join("\n");

  const prompt = `以下は読者が読んだ${books.length}冊の書籍リストです。

${bookSummaries}

---

この読者の知的関心を代表する「概念・価値観・思想的立場」の正規語彙リストを作成してください。

要件：
- 60〜90個
- 同じ領域の概念は1つの代表表現に統一（例：「クィア理論」「クィア研究」「クィアスタディーズ」→「クィア理論」）
- 学術的・一般的に認知された標準的な日本語表現
- この読者の書籍リストに実際に関連する概念のみ
- 抽象的な価値観・思想的立場を含む（例：「フェミニズム」「能力主義批判」「ケアの倫理」）
- 「著者」「入門」「解説」など書籍構造を指す語は除く
- 人名・地名は除く（思想の名称はOK）

出力: JSON配列のみ（説明文不要）
["概念1", "概念2", ...]`;

  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\[[\s\S]*\])/);
  if (!match) throw new Error("Vocabulary response did not contain JSON:\n" + text.slice(0, 500));

  const vocabulary = JSON.parse(match[1]);
  if (!Array.isArray(vocabulary)) throw new Error("Vocabulary is not an array");

  console.log(`Generated ${vocabulary.length} canonical concepts.`);
  return vocabulary;
}

// ── Step 2: 1冊分の概念抽出 ──────────────────────────────────
async function extractForBook(book, vocabulary) {
  const notesSection = book.notes?.trim() ? `\n感想：\n${book.notes.trim()}` : "";
  const vocabStr = vocabulary.join("、");

  const prompt = `書籍「${book.title}」を読んだ記録です。${notesSection}

以下の語彙リストから、この読者が吸収・内面化した概念を最大8個選んでください。
リストにまったく存在しない重要な概念がある場合のみ、最大2個まで追加可能です（その場合も2〜15文字の簡潔な日本語で）。

語彙リスト：${vocabStr}

返答はJSON配列のみ（説明文不要）。
例：["概念1", "概念2", "概念3"]`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
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

// ── メイン ────────────────────────────────────────────────────
async function main() {
  // 対象書籍を取得（readAt がある本のみ）
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: { id: true, title: true, notes: true, category: true },
    orderBy: { readAt: "asc" },
  });
  console.log(`Target books: ${books.length}`);

  // Step 1: 語彙生成
  const vocabulary = await generateVocabulary(books);

  // vocabulary を src/lib/concept-vocabulary.json に保存（next.js で参照できるように）
  writeFileSync(VOCAB_PATH, JSON.stringify(vocabulary, null, 2), "utf8");
  console.log(`Saved vocabulary to ${VOCAB_PATH}`);

  // Step 2: 全BookKeywordを削除
  const deleted = await prisma.bookKeyword.deleteMany({});
  console.log(`\n[Step 2] Deleted ${deleted.count} existing BookKeyword records.`);
  console.log(`Re-extracting ${books.length} books in batches of ${BATCH_SIZE}...`);

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (book) => {
        try {
          const concepts = await extractForBook(book, vocabulary);
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
          } else {
            // 空の結果はセンチネルで記録
            await prisma.bookKeyword.upsert({
              where: { bookId_keyword: { bookId: book.id, keyword: SENTINEL } },
              create: { bookId: book.id, keyword: SENTINEL, count: 0 },
              update: { count: 0 },
            });
          }
          processed++;
        } catch (err) {
          console.error(`  Error: ${book.title} - ${err.message}`);
          errors++;
          await prisma.bookKeyword.upsert({
            where: { bookId_keyword: { bookId: book.id, keyword: SENTINEL } },
            create: { bookId: book.id, keyword: SENTINEL, count: 0 },
            update: { count: 0 },
          });
        }
      })
    );

    console.log(`  ${Math.min(i + BATCH_SIZE, books.length)} / ${books.length} done...`);
    // rate limit対策
    if (i + BATCH_SIZE < books.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\nDone. processed=${processed}, errors=${errors}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
