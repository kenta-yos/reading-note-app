/**
 * normalize-concepts.mjs
 * DBの全概念をClaudeに渡して類似概念を正規名に統一する。
 * 実行: node scripts/normalize-concepts.mjs
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "dotenv";

config({ path: new URL("../.env", import.meta.url).pathname });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SENTINEL = "__api_error__";

async function main() {
  // 1. 複数の本に登場する概念のみ取得（1冊のみは正規化対象外）
  const allRows = await prisma.bookKeyword.groupBy({
    by: ["keyword"],
    where: { keyword: { not: SENTINEL } },
    _count: { bookId: true },
    having: { bookId: { _count: { gte: 2 } } },
    orderBy: { _count: { bookId: "desc" } },
  });
  const conceptList = allRows.map((r) => r.keyword).sort();
  console.log(`Found ${conceptList.length} concepts appearing in ≥2 books`);

  if (conceptList.length === 0) {
    console.log("No concepts to normalize.");
    return;
  }

  // 2. Claudeで正規化マッピングを生成
  const prompt = `以下は書籍から抽出された概念・価値観・思想のリスト（${conceptList.length}件）です。

同じ意味・同じ学術領域を指す類似概念をグループ化し、各グループに最も適切な代表名（正規名）を付けてください。

ルール：
- 明らかに同義・類義のものだけをグループ化（「フェミニズム」と「ジェンダー論」は別、「クィア理論」と「クィア研究」は同じ）
- 正規名は学術的・一般的な表現を優先
- グループ化しない概念は元の名前をそのまま使う
- 広すぎる統合はしない（「社会学」でまとめすぎるなど）

概念リスト：
${conceptList.map((c) => `- ${c}`).join("\n")}

返答はJSONオブジェクトのみ（説明文不要）：
{
  "元の概念名": "正規名",
  ...
}`;

  console.log("Calling Claude to generate normalization mapping...");
  const message = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  // JSONブロック or 裸のJSONを両方パース
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
  if (!match) {
    console.error("Claude response did not contain JSON:", text.slice(0, 500));
    return;
  }

  const mapping = JSON.parse(match[1]);

  // 3. 変更内容をログ表示
  const changes = Object.entries(mapping).filter(([orig, canonical]) => orig !== canonical);
  console.log(`\n${changes.length} concepts will be normalized:`);
  for (const [orig, canonical] of changes) {
    console.log(`  "${orig}" → "${canonical}"`);
  }

  if (changes.length === 0) {
    console.log("No normalization needed.");
    return;
  }

  // 4. DB更新
  let updated = 0;
  for (const [orig, canonical] of changes) {
    const origRecords = await prisma.bookKeyword.findMany({
      where: { keyword: orig },
      select: { id: true, bookId: true, count: true },
    });

    for (const record of origRecords) {
      // 同じ本に正規名のレコードが既にあるか確認
      const existing = await prisma.bookKeyword.findUnique({
        where: { bookId_keyword: { bookId: record.bookId, keyword: canonical } },
      });

      if (existing) {
        // 既存レコードにcountを加算し、元レコードを削除
        await prisma.bookKeyword.update({
          where: { id: existing.id },
          data: { count: existing.count + record.count },
        });
        await prisma.bookKeyword.delete({ where: { id: record.id } });
      } else {
        // リネームのみ
        await prisma.bookKeyword.update({
          where: { id: record.id },
          data: { keyword: canonical },
        });
      }
      updated++;
    }
  }

  console.log(`\nDone. Updated ${updated} records.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
