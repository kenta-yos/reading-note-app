/**
 * 全スクレイパーのオーケストレーション
 */

import { scrapeSCJ } from "./scj";
import { scrapeMisuzu } from "./misuzu";
import { scrapeKeiso } from "./keiso";
import { scrapeIwanami } from "./iwanami";
import { scrapeKinokuniya } from "./kinokuniya";
import { scrapeTsutayaDaikanyama } from "./tsutaya-daikanyama";
import { scrapeMaruzenJunkudo } from "./maruzenjunkudo";
import { scrapeSerper } from "./google-cse";
import type { RawEvent } from "./connpass";

export type { RawEvent };

/**
 * @param authorsByPriority 登録冊数の多い順に並んだ著者名リスト
 *   （書店スクレイパーは順不同で使用、Google CSE は先頭から消費）
 */
export async function scrapeAllEvents(
  authorsByPriority: string[],
  todayStr: string
): Promise<RawEvent[]> {
  if (authorsByPriority.length === 0) return [];

  const tasks = [
    scrapeSCJ(authorsByPriority, todayStr),
    scrapeMisuzu(authorsByPriority, todayStr),
    scrapeKeiso(authorsByPriority, todayStr),
    scrapeIwanami(authorsByPriority, todayStr),
    scrapeKinokuniya(authorsByPriority, todayStr),
    scrapeTsutayaDaikanyama(authorsByPriority, todayStr),
    scrapeMaruzenJunkudo(authorsByPriority, todayStr),
    scrapeSerper(authorsByPriority, todayStr),
  ];

  const settled = await Promise.allSettled(tasks);

  const all: RawEvent[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // URL で重複排除
  const seen = new Set<string>();
  return all.filter((ev) => {
    if (seen.has(ev.url)) return false;
    seen.add(ev.url);
    return true;
  });
}
