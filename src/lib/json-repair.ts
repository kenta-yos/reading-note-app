/**
 * LLM出力のJSON修復ユーティリティ
 */

/** 末尾カンマ、制御文字、切れたJSONを修復 */
export function repairJson(raw: string): string {
  let s = raw
    // 制御文字を除去（改行・タブ以外）
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    // 末尾カンマを除去
    .replace(/,\s*([}\]])/g, "$1");
  // 閉じ括弧が足りない場合に補完
  const opens = (s.match(/[{[]/g) || []).length;
  const closes = (s.match(/[}\]]/g) || []).length;
  for (let i = 0; i < opens - closes; i++) {
    s += s.trimStart().startsWith("[") ? "]" : "}";
  }
  return s;
}

/** 正規表現でマッチしたJSONを安全にパース。失敗時は修復を試みる */
export function safeJsonParse<T>(text: string, pattern: RegExp): T | null {
  const match = text.match(pattern);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    try {
      return JSON.parse(repairJson(match[0])) as T;
    } catch {
      return null;
    }
  }
}
