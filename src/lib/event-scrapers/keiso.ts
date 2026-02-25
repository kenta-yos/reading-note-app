/**
 * 勁草書房イベントスクレイパー
 * https://www.keisoshobo.co.jp/news/
 * 東京開催 or オンライン限定
 *
 * HTML構造:
 * <div class="news-item">
 *   <a href="/news/n41403.html">
 *     <span class="category">NEWS</span>
 *     <span class="title">タイトル</span>
 *     <span class="date">2026/02/25</span>
 *   </a>
 * </div>
 */

import * as cheerio from "cheerio";
import { matchAuthors } from "@/lib/event-matcher";
import type { RawEvent } from "./connpass";

const BASE_URL = "https://www.keisoshobo.co.jp";
const LIST_URL = `${BASE_URL}/news/`;

// "2026/02/25" → "2026-02-25"
function parseSlashDate(str: string): string | undefined {
  const m = str.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (!m) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function isTokyoOrOnline(text: string): boolean {
  return (
    text.includes("東京") ||
    text.includes("オンライン") ||
    text.includes("online") ||
    text.includes("配信") ||
    text.includes("zoom") ||
    text.includes("ウェビナー")
  );
}

const EVENT_KEYWORDS = ["イベント", "講演", "シンポジウム", "トーク", "セミナー", "刊行記念"];

export async function scrapeKeiso(
  authors: string[],
  todayStr: string
): Promise<RawEvent[]> {
  try {
    const res = await fetch(LIST_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: RawEvent[] = [];

    $(".news-item").each((_, el) => {
      const $el = $(el);
      const $a = $el.find("a").first();
      const href = $a.attr("href");
      if (!href) return;

      const title = $a.find(".title").text().trim();
      if (!title) return;

      // イベント関連のみ
      if (!EVENT_KEYWORDS.some((k) => title.includes(k))) return;

      const dateText = $a.find(".date").text().trim();
      const startDate = parseSlashDate(dateText);
      if (startDate && startDate < todayStr) return;

      if (!isTokyoOrOnline(title)) return;

      const matched = matchAuthors(title, authors);
      if (matched.length === 0) return;

      const url = new URL(href, BASE_URL).href;
      results.push({
        source: "keiso",
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
