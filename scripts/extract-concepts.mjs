/**
 * extract-concepts.mjs
 * Claude APIを使って書籍タイトル＋感想から
 * 「吸収した概念・価値観・規範」を抽出し BookKeyword に保存する。
 *
 * 使い方: node scripts/extract-concepts.mjs
 * ※ 既存の BookKeyword レコードをすべて削除して入れ替える
 */
import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: new URL("../.env", import.meta.url).pathname });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(title, notes) {
  const notesSection = notes?.trim()
    ? `\n感想：\n${notes.trim()}`
    : "";
  return `書籍「${title}」を読んだ記録です。${notesSection}

この読者が吸収・内面化した「知的概念・価値観・規範・思想的立場」を最大8個、JSON配列で返してください。

抽出ルール：
- 「著者」「入門」「解説」「序章」など書籍の構造を指す言葉は除く
- 人名・地名などの固有名詞は除く（思想の名称はOK：例「フェミニズム」「功利主義」）
- 抽象的な概念・価値観・規範を優先（例：「能力主義批判」「ケアの倫理」「身体の政治性」「再分配正義」）
- 2〜15文字の簡潔な日本語表現
- タイトルだけで感想がない場合は、書籍名から推察できる主要概念を抽出してよい

返答はJSON配列のみ。説明文不要。
例：["概念1", "概念2", "概念3"]`;
}

async function extractConcepts(title, notes) {
  const prompt = buildPrompt(title, notes);
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  // JSON配列を抽出
  const match = text.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string" && s.trim().length > 0) : [];
  } catch {
    return [];
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: { id: true, title: true, notes: true },
    orderBy: { readAt: "asc" },
  });

  console.log(`対象: ${books.length} 冊\n`);
  console.log("既存のキーワードデータを削除中...");
  await prisma.bookKeyword.deleteMany({});
  console.log("削除完了。AI抽出を開始します。\n");

  let success = 0;
  let failed = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    process.stdout.write(`\r  処理中: ${i + 1}/${books.length}  「${book.title.slice(0, 20)}」`);

    try {
      const concepts = await extractConcepts(book.title, book.notes);
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
        success++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
      console.error(`\n  ❌ エラー (${book.title}):`, err.message);
    }

    // レートリミット対策（100ms 間隔）
    await new Promise((r) => setTimeout(r, 100));
  }

  await prisma.$disconnect();

  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ 完了: ${success} 冊`);
  if (failed > 0) console.log(`❌ 失敗: ${failed} 冊`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch(console.error);
