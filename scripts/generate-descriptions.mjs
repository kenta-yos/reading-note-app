/**
 * generate-descriptions.mjs
 * concept-vocabulary.json の全概念について説明文を一括生成し
 * src/lib/concept-descriptions.json に保存する。
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config({ path: new URL("../.env", import.meta.url).pathname });

const __dirname = dirname(fileURLToPath(import.meta.url));
const vocabulary = JSON.parse(
  readFileSync(join(__dirname, "../src/lib/concept-vocabulary.json"), "utf8")
);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function describe(concept) {
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `「${concept}」という概念・用語を、2〜3文で簡潔に説明してください。学術的な概念の場合は分野と定義を含め、一般読者が理解できる言葉で書いてください。余計な前置きは不要です。`,
      },
    ],
  });
  return message.content[0]?.type === "text" ? message.content[0].text.trim() : "";
}

async function main() {
  const descriptions = {};
  console.log(`${vocabulary.length} 概念の説明文を生成します...\n`);

  for (let i = 0; i < vocabulary.length; i++) {
    const concept = vocabulary[i];
    try {
      const text = await describe(concept);
      descriptions[concept] = text;
      console.log(`[${i + 1}/${vocabulary.length}] ${concept}`);
    } catch (err) {
      descriptions[concept] = "";
      console.error(`[${i + 1}/${vocabulary.length}] Error: ${concept} - ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  const outPath = join(__dirname, "../src/lib/concept-descriptions.json");
  writeFileSync(outPath, JSON.stringify(descriptions, null, 2), "utf8");
  console.log(`\n完了。保存先: ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
