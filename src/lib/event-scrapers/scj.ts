/**
 * 日本学術会議イベントスクレイパー
 * https://www.scj.go.jp/ja/event/index.html
 * 東京開催 or オンライン限定
 */

import * as cheerio from "cheerio";
import { matchAuthors } from "@/lib/event-matcher";
import type { RawEvent } from "./connpass";

const BASE_URL = "https://www.scj.go.jp";
const LIST_URL = `${BASE_URL}/ja/event/index.html`;

// "2026年3月15日" → "2026-03-15"
function parseJaDate(str: string): string | undefined {
  const m = str.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return undefined;
  const y = m[1];
  const mo = m[2].padStart(2, "0");
  const d = m[3].padStart(2, "0");
  return `${y}-${mo}-${d}`;
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

export async function scrapeSCJ(
  authors: string[],
  todayStr: string
): Promise<RawEvent[]> {
  try {
    const res = await fetch(LIST_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: RawEvent[] = [];

    $("ul.eventlist li, .event_list li, li").each((_, el) => {
      const $el = $(el);
      const $a = $el.find("a").first();
      const href = $a.attr("href");
      if (!href) return;

      const title = $a.text().trim();
      if (!title) return;

      const fullText = $el.text();
      const startDate = parseJaDate(fullText);
      if (startDate && startDate < todayStr) return;

      if (!isTokyoOrOnline(fullText)) return;

      const matched = matchAuthors(title + " " + fullText, authors);
      if (matched.length === 0) return;

      const url = new URL(href, BASE_URL).href;
      results.push({
        source: "scj",
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
