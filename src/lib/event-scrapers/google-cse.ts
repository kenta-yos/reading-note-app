/**
 * Serper.dev Google 検索スクレイパー
 * https://serper.dev
 *
 * 無料枠: 2,500 クエリ/月
 * Cron は週1回（月曜 JST 11:00）実行。1著者 = 1クエリで消費する。
 * 週 500 クエリ × 4週 = 2,000 クエリ/月（余裕あり）
 *
 * 必要な環境変数:
 *   SERPER_API_KEY        — Serper.dev API キー
 *   SERPER_WEEKLY_LIMIT   — 1回あたりの上限（デフォルト 500）
 */

import { matchAuthors } from "@/lib/event-matcher";
import type { RawEvent } from "./connpass";

interface SerperOrganic {
  title: string;
  link: string;
  snippet: string;
}

interface SerperResponse {
  organic?: SerperOrganic[];
}

// "2026年3月15日" or "M月D日" or "YYYY/MM/DD" を探す
function extractDate(text: string, currentYear: string): string | undefined {
  const m1 = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m1) return `${m1[1]}-${m1[2].padStart(2, "0")}-${m1[3].padStart(2, "0")}`;

  const m2 = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (m2) return `${currentYear}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;

  const m3 = text.match(/(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/);
  if (m3) return `${m3[1]}-${m3[2].padStart(2, "0")}-${m3[3].padStart(2, "0")}`;

  return undefined;
}

function isTokyoOrOnline(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    text.includes("東京") ||
    text.includes("都内") ||
    text.includes("池袋") ||
    text.includes("新宿") ||
    text.includes("渋谷") ||
    text.includes("丸の内") ||
    text.includes("神保町") ||
    text.includes("代官山") ||
    text.includes("お茶の水") ||
    lower.includes("オンライン") ||
    lower.includes("online") ||
    lower.includes("zoom") ||
    text.includes("配信") ||
    text.includes("ウェビナー")
  );
}

export async function scrapeSerper(
  /** 登録冊数の多い順に並んだ著者名リスト */
  authorsByPriority: string[],
  todayStr: string
): Promise<RawEvent[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return [];

  const maxQueries = Math.min(
    parseInt(process.env.SERPER_WEEKLY_LIMIT ?? "500", 10),
    1000 // 絶対上限
  );

  const currentYear = todayStr.slice(0, 4);
  const targets = authorsByPriority.slice(0, maxQueries);
  const results: RawEvent[] = [];

  // 5並列バッチで処理（順次処理だと300著者×1秒=5分超えるため）
  const CONCURRENCY = 5;

  async function fetchAuthor(author: string): Promise<RawEvent[]> {
    const q = `"${author}" (イベント OR 講演 OR シンポジウム OR トーク) (東京 OR オンライン) ${currentYear}`;
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q, gl: "jp", hl: "ja", num: 5 }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return [];

      const data: SerperResponse = await res.json();
      if (!data.organic) return [];

      const found: RawEvent[] = [];
      for (const item of data.organic) {
        const combined = item.title + " " + item.snippet;
        if (!isTokyoOrOnline(combined)) continue;
        const startDate = extractDate(combined, currentYear);
        if (startDate && startDate < todayStr) continue;
        const matched = matchAuthors(combined, authorsByPriority);
        if (matched.length === 0) continue;
        found.push({
          source: "serper",
          title: item.title,
          url: item.link,
          startDate,
          venue: undefined,
          matchedAuthors: matched,
        });
      }
      return found;
    } catch {
      return [];
    }
  }

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(fetchAuthor));
    for (const r of batchResults) results.push(...r);
  }

  return results;
}
