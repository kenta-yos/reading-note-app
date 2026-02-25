/**
 * イベントタイトル・説明文と著者名リストを照合する。
 * フルネーム一致のみ（ノイズ低減を優先）。
 */

/**
 * 著者名がテキスト中に出現するか確認する。
 * 後ろの文字が漢字またはカタカナ（語の続き）の場合は除外し、
 * "ヒュー" → "ヒューマン" のような語中部分一致を防ぐ。
 */
export function matchAuthors(text: string, authors: string[]): string[] {
  return authors.filter((author) => {
    const idx = text.indexOf(author);
    if (idx === -1) return false;

    const afterIdx = idx + author.length;
    if (afterIdx < text.length) {
      const nextChar = text[afterIdx];
      // 次の文字が漢字・カタカナなら語の途中とみなして除外
      if (/[\u30A0-\u30FF\u4E00-\u9FFF]/.test(nextChar)) return false;
    }

    return true;
  });
}
