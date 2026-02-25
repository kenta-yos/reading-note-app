/**
 * 代官山蔦屋書店イベントスクレイパー
 * https://store.tsite.jp/daikanyama/event/
 * 代官山は東京都内なので場所チェック不要
 *
 * HTML構造:
 * <li>
 *   <a href="/daikanyama/event/humanities/52417-....html">
 *     <span class="genre">人文</span>
 *     <span class="date">2026.02.25(水)</span>
 *     <span class="title">タイトル</span>
 *   </a>
 * </li>
 */

import * as cheerio from "cheerio";
import { matchAuthors } from "@/lib/event-matcher";
import type { RawEvent } from "./connpass";

const BASE_URL = "https://store.tsite.jp";
const LIST_URL = `${BASE_URL}/daikanyama/event/`;

// "2026.02.25(水)" or "2026.02.04(水) - 02.25(水)" → "2026-02-25"
function parseDate(str: string): string | undefined {
  const m = str.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return undefined;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export async function scrapeTsutayaDaikanyama(
  authors: string[],
  todayStr: string
): Promise<RawEvent[]> {
  try {
    const res = await fetch(LIST_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: RawEvent[] = [];

    $("li").each((_, el) => {
      const $el = $(el);
      const $a = $el.find("a").first();
      const href = $a.attr("href");
      if (!href) return;

      const title = $a.find(".title").text().trim();
      if (!title) return;

      const dateText = $a.find(".date").text().trim();
      const startDate = parseDate(dateText);
      if (startDate && startDate < todayStr) return;

      const matched = matchAuthors(title, authors);
      if (matched.length === 0) return;

      const url = new URL(href, BASE_URL).href;
      results.push({
        source: "tsutaya-daikanyama",
        title,
        url,
        startDate,
        venue: "代官山蔦屋書店",
        matchedAuthors: matched,
      });
    });

    return results;
  } catch {
    return [];
  }
}
