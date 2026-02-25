/**
 * 丸善ジュンク堂書店イベントスクレイパー
 * https://corp.maruzenjunkudo.co.jp/info-cat/event/
 * 東京都内店舗 or オンライン限定
 */

import * as cheerio from "cheerio";
import { matchAuthors } from "@/lib/event-matcher";
import type { RawEvent } from "./connpass";

const BASE_URL = "https://corp.maruzenjunkudo.co.jp";
const LIST_URL = `${BASE_URL}/info-cat/event/`;

// 東京都内の丸善・ジュンク堂店舗キーワード
const TOKYO_KEYWORDS = [
  "池袋", "丸の内", "お茶の水", "有楽町", "吉祥寺",
  "新宿", "渋谷", "多摩", "東京",
];

function parseJaDate(str: string): string | undefined {
  const m = str.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return undefined;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function isTokyoOrOnline(text: string): boolean {
  const lower = text.toLowerCase();
  if (
    lower.includes("オンライン") ||
    lower.includes("online") ||
    lower.includes("配信") ||
    lower.includes("zoom") ||
    lower.includes("ウェビナー")
  ) {
    return true;
  }
  return TOKYO_KEYWORDS.some((k) => text.includes(k));
}

export async function scrapeMaruzenJunkudo(
  authors: string[],
  todayStr: string
): Promise<RawEvent[]> {
  try {
    const res = await fetch(LIST_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: RawEvent[] = [];

    // 構造: <li>日付テキスト <a>カテゴリ</a> <a href="/info/...">タイトル</a></li>
    $("li").each((_, el) => {
      const $el = $(el);
      const text = $el.text();

      // イベントカテゴリのみ（news と混在している場合がある）
      if (!text.includes("イベント") && !text.includes("講演") && !text.includes("トーク")) {
        // タイトルリンクが /info/ を指していなければスキップ
        const href = $el.find("a[href*='/info/']").attr("href");
        if (!href) return;
      }

      const $titleLink = $el.find("a[href*='/info/']").last();
      const href = $titleLink.attr("href");
      if (!href) return;

      const title = $titleLink.text().trim();
      if (!title) return;

      const fullText = text;
      const startDate = parseJaDate(fullText);
      if (startDate && startDate < todayStr) return;

      if (!isTokyoOrOnline(fullText)) return;

      const matched = matchAuthors(title + " " + fullText, authors);
      if (matched.length === 0) return;

      const url = new URL(href, BASE_URL).href;
      results.push({
        source: "maruzenjunkudo",
        title,
        url,
        startDate,
        venue: undefined,
        matchedAuthors: matched,
      });
    });

    return results;
  } catch {
    return [];
  }
}
