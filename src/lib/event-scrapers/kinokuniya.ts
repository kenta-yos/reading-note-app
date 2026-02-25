/**
 * 紀伊國屋書店イベントスクレイパー
 * https://store.kinokuniya.co.jp/event/
 * 東京都内店舗 or オンライン限定
 *
 * HTML構造:
 * <div class="event-list-item full">
 *   <a href="/event/.../">
 *     <div class="event-content">
 *       <h3>タイトル</h3>
 *       <div class="event-date">
 *         <span>2月1日（日）</span>
 *       </div>
 *       <div class="event-venues">
 *         <a href="...">新宿本店</a>
 *       </div>
 *     </div>
 *   </a>
 * </div>
 */

import * as cheerio from "cheerio";
import { matchAuthors } from "@/lib/event-matcher";
import type { RawEvent } from "./connpass";

const BASE_URL = "https://store.kinokuniya.co.jp";
const LIST_URL = `${BASE_URL}/event/`;

// 東京都内の紀伊國屋店舗キーワード
const TOKYO_VENUES = [
  "新宿", "渋谷", "池袋", "吉祥寺", "立川", "町田",
  "丸の内", "六本木", "有楽町", "銀座", "東京",
];

// "2月1日（日）" → currentYear + "-02-01"
// "2027年 1月31日（日）" → "2027-01-31"
function parseKinoDate(str: string, currentYear: string): string | undefined {
  const m1 = str.match(/(\d{4})年\s*(\d{1,2})月(\d{1,2})日/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, "0")}-${m1[3].padStart(2, "0")}`;

  const m2 = str.match(/(\d{1,2})月(\d{1,2})日/);
  if (m2) return `${currentYear}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;

  return undefined;
}

function isTokyoOrOnline(venueText: string, titleText: string): boolean {
  const combined = venueText + " " + titleText;
  const lower = combined.toLowerCase();
  if (
    lower.includes("オンライン") ||
    lower.includes("online") ||
    lower.includes("配信") ||
    lower.includes("zoom") ||
    lower.includes("ウェビナー")
  ) return true;
  return TOKYO_VENUES.some((v) => combined.includes(v));
}

export async function scrapeKinokuniya(
  authors: string[],
  todayStr: string
): Promise<RawEvent[]> {
  const currentYear = todayStr.slice(0, 4);

  try {
    const res = await fetch(LIST_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: RawEvent[] = [];

    $(".event-list-item.full").each((_, el) => {
      const $el = $(el);
      const $a = $el.find("a").first();
      const href = $a.attr("href");
      if (!href) return;

      const title = $el.find("h3").text().trim();
      if (!title) return;

      const dateText = $el.find(".event-date span").first().text().trim();
      const startDate = parseKinoDate(dateText, currentYear);
      if (startDate && startDate < todayStr) return;

      const venueText = $el.find(".event-venues").text().trim();
      if (!isTokyoOrOnline(venueText, title)) return;

      const matched = matchAuthors(title, authors);
      if (matched.length === 0) return;

      const url = new URL(href, BASE_URL).href;
      results.push({
        source: "kinokuniya",
        title,
        url,
        startDate,
        venue: venueText || undefined,
        matchedAuthors: matched,
      });
    });

    return results;
  } catch {
    return [];
  }
}
