import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "image (base64) は必須です" }, { status: 400 });
    }

    const match = image.match(/^data:image\/\w+;base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "不正な画像データです" }, { status: 400 });
    }

    const base64Data = match[1];
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Google Cloud Vision APIキーが設定されていません" }, { status: 500 });
    }

    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Data },
              features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
              imageContext: {
                languageHints: ["ja", "en"],
              },
            },
          ],
        }),
      }
    );

    const data = await res.json();

    if (data.error) {
      console.error("Vision API error:", data.error);
      if (data.error.code === 403 || data.error.code === 429) {
        return NextResponse.json({ error: "Google Cloud Vision APIの利用制限に達しました。" }, { status: 402 });
      }
      return NextResponse.json({ error: "テキスト認識に失敗しました" }, { status: 500 });
    }

    const annotation = data.responses?.[0]?.fullTextAnnotation;
    const rawText = annotation?.text?.trim() ?? "";

    if (!rawText) {
      return NextResponse.json({ error: "テキストを検出できませんでした" }, { status: 400 });
    }

    // Vision APIは縦書き列ごとに改行を入れるため、不要な改行を除去する
    // 段落区切り（空行）は保持し、単一改行は結合する
    const text = rawText
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)                       // 空行で段落分割
      .map((para: string) => para.replace(/\n/g, "")) // 段落内の改行を除去
      .join("\n")
      .trim();

    return NextResponse.json({ text });
  } catch (e) {
    console.error("OCR error:", e);
    return NextResponse.json({ error: "テキスト認識に失敗しました" }, { status: 500 });
  }
}
