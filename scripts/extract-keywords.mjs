/**
 * extract-keywords.mjs
 * 感想テキストからkuromojiで名詞を抽出しBookKeywordテーブルに保存する。
 * 使い方: node scripts/extract-keywords.mjs
 */
import kuromoji from "kuromoji";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

config({ path: new URL("../.env", import.meta.url).pathname });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dicPath = path.join(__dirname, "../node_modules/kuromoji/dict");

// 除外するストップワード（意味を持たない一般名詞）
const STOP_WORDS = new Set([
  "こと", "もの", "ため", "よう", "これ", "それ", "あれ",
  "ここ", "そこ", "あそこ", "どこ", "なに", "何", "誰", "いつ",
  "的", "化", "性", "上", "中", "下", "系", "等", "他",
  "方", "点", "形", "面", "部", "際", "後", "前", "間",
  "自分", "人", "本", "話", "時", "感", "気", "中", "意味",
  "必要", "可能", "場合", "問題", "状況", "関係", "現在",
  "一つ", "一方", "一部", "一種", "以上", "以下", "以外",
  "さ", "み", "度", "者", "物", "事", "所",
]);

// 保持する名詞の品詞細分類
const KEEP_NOUN_SUBTYPES = new Set([
  "一般", "固有名詞", "サ変接続", "形容動詞語幹",
]);

function buildTokenizer() {
  return new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

function extractKeywords(tokenizer, text) {
  if (!text || text.trim().length === 0) return new Map();

  const tokens = tokenizer.tokenize(text);
  const freq = new Map();

  for (const token of tokens) {
    // 名詞のみ
    if (token.pos !== "名詞") continue;
    // 保持するサブタイプのみ（接尾・非自立・数・代名詞を除外）
    if (!KEEP_NOUN_SUBTYPES.has(token.pos_detail_1)) continue;

    const word = token.basic_form && token.basic_form !== "*"
      ? token.basic_form
      : token.surface_form;

    // 2文字未満・数字のみ・ストップワードは除外
    if (word.length < 2) continue;
    if (/^[0-9０-９]+$/.test(word)) continue;
    if (STOP_WORDS.has(word)) continue;

    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  return freq;
}

async function main() {
  console.log("▶ kuromojiトークナイザを構築中...");
  const tokenizer = await buildTokenizer();
  console.log("✓ 完了\n");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // readAt がある書籍を対象（感想なしでもタイトルから抽出）
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    select: { id: true, title: true, notes: true },
  });

  console.log(`対象: ${books.length} 冊\n`);

  let processed = 0;
  let skipped = 0;

  for (const book of books) {
    // タイトルを2回結合して重み付け、感想も含める
    const combined = [book.title, book.title, book.notes ?? ""].join("。");
    const freq = extractKeywords(tokenizer, combined);
    if (freq.size === 0) { skipped++; continue; }

    // upsert: 既存レコードがあれば count を上書き
    for (const [keyword, count] of freq.entries()) {
      await prisma.bookKeyword.upsert({
        where: { bookId_keyword: { bookId: book.id, keyword } },
        create: { bookId: book.id, keyword, count },
        update: { count },
      });
    }
    processed++;
    process.stdout.write(`\r  処理済: ${processed}/${books.length}`);
  }

  await prisma.$disconnect();

  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ 完了: ${processed} 冊`);
  console.log(`⚠️  スキップ（キーワードなし）: ${skipped} 冊`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
