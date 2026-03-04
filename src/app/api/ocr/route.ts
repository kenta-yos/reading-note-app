import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "image (base64) は必須です" }, { status: 400 });
    }

    // data:image/png;base64,... or data:image/jpeg;base64,... から分離
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "不正な画像データです" }, { status: 400 });
    }

    const mediaType = match[1] as "image/png" | "image/jpeg" | "image/webp" | "image/gif";
    const base64Data = match[2];

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            {
              type: "text",
              text: `この画像に写っている本のページのテキストを正確に書き起こしてください。

ルール：
- 縦書き・横書きどちらにも対応すること
- 原文に忠実に書き起こすこと
- 文の途中で改行しないこと。段落の区切りのみ改行すること
- 文字間に余計なスペースを入れないこと。日本語の文字間にスペースは不要
- 余計な説明・コメント・前置きは一切不要。認識したテキストのみを返すこと
- 画像が不鮮明な場合は読み取れた部分だけを返すこと`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ text: text.trim() });
  } catch (e) {
    console.error("OCR error:", e);
    return NextResponse.json({ error: "テキスト認識に失敗しました" }, { status: 500 });
  }
}
