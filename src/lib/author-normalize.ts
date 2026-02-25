/**
 * Book.author の表記を正規化し、著者名リストを返す。
 *
 * 例:
 *   "山田太郎著"                   → ["山田太郎"]
 *   "山田太郎・田中花子"            → ["山田太郎", "田中花子"]
 *   "山田太郎 [著] ; 田中花子 [訳]" → ["山田太郎", "田中花子"]
 */

// 役割接尾語 (著/編/訳/監修/著者 など)
const ROLE_SUFFIX = /[著編訳監修者]+$/;
// 括弧内の役割表記
const ROLE_BRACKET = /[\[［〔(（【<《「『].*?[\]］〕)）】>》」』]/g;

const SPLIT_RE = /[・／,，;；\s]+/;

export function normalizeAuthors(raw: string | null | undefined): string[] {
  if (!raw) return [];

  const cleaned = raw
    .replace(ROLE_BRACKET, "") // [著] など除去
    .replace(ROLE_SUFFIX, "")  // 末尾の役割語除去
    .trim();

  return cleaned
    .split(SPLIT_RE)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2); // 1文字以下は除外
}
