/**
 * connpass API v2 スクレイパー
 * 著者名ごとに検索し、東京都内 or オンラインのイベントを返す。
 */

import { matchAuthors } from "@/lib/event-matcher";

export interface RawEvent {
  source: string;
  title: string;
  url: string;
  startDate?: string;
  venue?: string;
  matchedAuthors: string[];
}

interface ConnpassEvent {
  title: string;
  event_url: string;
  started_at: string; // ISO8601
  address: string | null;
  place: string | null;
  series?: { title?: string };
}

interface ConnpassResponse {
  results_returned: number;
  events: ConnpassEvent[];
}

// 東京都内 or オンライン判定
function isTokyoOrOnline(event: ConnpassEvent): boolean {
  const addr = (event.address ?? "").toLowerCase();
  const place = (event.place ?? "").toLowerCase();
  const combined = addr + " " + place;
  return (
    combined.includes("東京") ||
    combined.includes("tokyo") ||
    combined.includes("online") ||
    combined.includes("オンライン") ||
    combined.includes("onnline") || // typo guard
    combined.includes("zoom") ||
    combined.includes("youtube") ||
    combined.includes("配信")
  );
}

function toJSTDateStr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, "-"); // "YYYY-MM-DD"
}

export async function scrapeConnpass(
  authors: string[],
  apiKey: string,
  todayStr: string
): Promise<RawEvent[]> {
  const results: RawEvent[] = [];
  const seen = new Set<string>();

  for (const author of authors) {
    try {
      const url = `https://connpass.com/api/v2/events/?keyword=${encodeURIComponent(author)}&order=2&count=20`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) continue;

      const data: ConnpassResponse = await res.json();
      for (const ev of data.events ?? []) {
        if (seen.has(ev.event_url)) continue;

        const startDate = toJSTDateStr(ev.started_at);
        if (startDate < todayStr) continue; // 過去イベント除外

        if (!isTokyoOrOnline(ev)) continue;

        const matched = matchAuthors(ev.title, authors);
        if (matched.length === 0) continue;

        seen.add(ev.event_url);
        const venue = [ev.place, ev.address].filter(Boolean).join(" ") || undefined;
        results.push({
          source: "connpass",
          title: ev.title,
          url: ev.event_url,
          startDate,
          venue,
          matchedAuthors: matched,
        });
      }
    } catch {
      // 個別著者の失敗は無視
    }
  }

  return results;
}
