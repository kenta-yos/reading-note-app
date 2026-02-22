/**
 * build-vocabulary.mjs
 * raw-concepts.json から頻度集計 → Sonnet で正規化・クラスタリング
 * → 候補語彙リストを scripts/vocabulary-candidate.json に出力する（フェーズ②）
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: new URL("../.env", import.meta.url).pathname });

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(
  readFileSync(join(__dirname, "raw-concepts.json"), "utf8")
);

// 頻度集計
const freq = {};
for (const { concepts } of raw) {
  for (const c of concepts) {
    const key = c.trim();
    if (key) freq[key] = (freq[key] ?? 0) + 1;
  }
}

// 頻度降順でリスト化
const sorted = Object.entries(freq)
  .sort((a, b) => b[1] - a[1])
  .map(([concept, count]) => `${concept}（${count}冊）`);

console.log(`ユニーク概念数: ${sorted.length}`);
console.log(`上位10: ${sorted.slice(0, 10).join(" / ")}\n`);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const prompt = `以下は、310冊の社会科学・人文学書籍からAIが自由抽出した概念リストです（件数は登場冊数）。

${sorted.join("\n")}

---

このリストを分析して、**読書履歴を可視化するための語彙リスト（100〜180語）**を作成してください。

作業方針：
1. 同じ意味の概念を統合し、最も標準的な学術用語に正規化する
   例：「社会階層の再生産」「教育の再生産機能」「文化的再生産」→「文化的再生産」
2. 複数の概念に分解できる長い表現は分割する
   例：「教育格差と再生産」→「教育格差」「文化的再生産」
3. 2〜12文字の日本語で表記する（英語・カタカナ可）
4. 一般的に確立された学術用語を優先する
5. 固有名詞（人名・地名）は除く
6. 登場頻度が高いものは必ず含める

出力形式：JSON配列のみ（説明文不要）
例：["メリトクラシー", "文化的再生産", "フェミニズム", ...]`;

console.log("Sonnetで正規化中...\n");

const message = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  messages: [{ role: "user", content: prompt }],
});

const text = message.content[0]?.type === "text" ? message.content[0].text : "";
const match = text.match(/\[[\s\S]*?\]/);
if (!match) {
  console.error("JSON配列が見つかりませんでした。生のレスポンス:\n", text);
  process.exit(1);
}

const vocabulary = JSON.parse(match[0]);
console.log(`正規化後の語彙数: ${vocabulary.length}`);
console.log("プレビュー（最初の20語）:", vocabulary.slice(0, 20).join("、"));

const outPath = join(__dirname, "vocabulary-candidate.json");
writeFileSync(outPath, JSON.stringify(vocabulary, null, 2), "utf8");
console.log(`\n保存先: ${outPath}`);
console.log("\n以下が新しい語彙リスト候補です（ユーザー確認後にフェーズ③へ）:\n");
console.log(JSON.stringify(vocabulary, null, 2));
