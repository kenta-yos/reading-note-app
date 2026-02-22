// scripts/extract-disciplines.mjs
// 全書籍の学問分野をClaude Haikuで一括抽出し、DBに保存する

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const DISCIPLINES = [
  "哲学・倫理学",
  "文学・語学",
  "歴史学・考古学",
  "社会学・文化人類学",
  "心理学・認知科学",
  "経済学・経営学",
  "政治学・法学",
  "自然科学・数学",
  "情報科学・テクノロジー",
  "芸術・美学・デザイン",
  "教育学",
  "医学・健康・身体",
  "宗教学・神学",
  "環境学・エコロジー",
  "ジェンダー・セクシュアリティ研究",
  "その他・学際的",
];

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function classifyDiscipline(book) {
  const prompt = `以下の書籍を、最も適切な学問分野1つに分類してください。
分野リスト：${DISCIPLINES.join("、")}

書籍情報：
タイトル: ${book.title}
著者: ${book.author ?? "不明"}
カテゴリ: ${book.category ?? "なし"}
メモ（最初の200文字）: ${(book.notes ?? "").slice(0, 200)}

上記リストから最も適切な分野を1つだけ回答してください。リスト外の回答は禁止です。分野名のみを回答してください。`;

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0]?.text?.trim() ?? "";
  return DISCIPLINES.includes(text) ? text : "その他・学際的";
}

async function main() {
  const books = await prisma.book.findMany({
    where: { discipline: null },
    select: { id: true, title: true, author: true, category: true, notes: true },
    orderBy: { title: "asc" },
  });

  console.log(`未分類の書籍: ${books.length} 冊`);

  let done = 0;
  let errors = 0;

  for (const book of books) {
    try {
      const discipline = await classifyDiscipline(book);
      await prisma.book.update({
        where: { id: book.id },
        data: { discipline },
      });
      done++;
      console.log(`[${done}/${books.length}] ${book.title} → ${discipline}`);
    } catch (err) {
      errors++;
      console.error(`Error for "${book.title}":`, err.message);
    }
    // Rate limit対策: 300ms待機
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n完了: ${done} 冊処理、${errors} エラー`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
