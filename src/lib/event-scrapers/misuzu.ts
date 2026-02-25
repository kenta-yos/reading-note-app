/**
 * みすず書房イベントスクレイパー
 * https://www.msz.co.jp/news/
 * 東京開催 or オンライン限定
 *
 * HTML構造:
 * <article class="item" ...>
 *   <div class="item-content">
 *     <a href="/news/event/..." class="item-header">
 *       <h3 class="item-title">タイトル</h3>
 *     </a>
 *     <div class="item-spec">
 *       <span class="item-spec-issue">2026年3月8日（日）</span>
 *     </div>
 *   </div>
 * </article>
 */

import * as cheerio from "cheerio";
import { matchAuthors } from "@/lib/event-matcher";
import type { RawEvent } from "./connpass";

const BASE_URL = "https://www.msz.co.jp";
const LIST_URL = `${BASE_URL}/news/`;

function parseJaDate(str: string): string | undefined {
  const m = str.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return undefined;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
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

export async function scrapeMisuzu(
  authors: string[],
  todayStr: string
): Promise<RawEvent[]> {
  try {
    const res = await fetch(LIST_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: RawEvent[] = [];

    $("article.item").each((_, el) => {
      const $el = $(el);
      const $a = $el.find("a.item-header").first();
      const href = $a.attr("href");
      if (!href) return;

      const title = $el.find(".item-title").text().trim();
      if (!title) return;

      const dateText = $el.find(".item-spec-issue").text().trim();
      const startDate = parseJaDate(dateText);
      if (startDate && startDate < todayStr) return;

      if (!isTokyoOrOnline(title + " " + dateText)) return;

      const matched = matchAuthors(title, authors);
      if (matched.length === 0) return;

      const url = new URL(href, BASE_URL).href;
      results.push({
        source: "misuzu",
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
