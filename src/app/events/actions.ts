"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { normalizeAuthors } from "@/lib/author-normalize";
import { scrapeAllEvents } from "@/lib/event-scrapers/index";

/**
 * 登録冊数の多い順（優先度順）で著者名リストを返す。
 * Google CSE がこの順番で先頭から消費するため、重要な著者を先に検索できる。
 */
async function getAuthorsByPriority(): Promise<string[]> {
  const rows = await prisma.book.groupBy({
    by: ["author"],
    where: { author: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  const seen = new Set<string>();
  const result: string[] = [];
  for (const row of rows) {
    for (const a of normalizeAuthors(row.author)) {
      if (!seen.has(a)) {
        seen.add(a);
        result.push(a);
      }
    }
  }
  return result;
}

function todayJST(): string {
  return new Date()
    .toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");
}

export async function syncEvents(): Promise<{ added: number }> {
  const today = todayJST();

  // 過去イベントを削除
  await prisma.eventCandidate.deleteMany({
    where: { startDate: { not: null, lt: today } },
  });

  // 著者名を登録冊数の多い順に取得・正規化
  const authorsByPriority = await getAuthorsByPriority();

  if (authorsByPriority.length === 0) {
    revalidatePath("/events");
    return { added: 0 };
  }

  const events = await scrapeAllEvents(authorsByPriority, today);

  let added = 0;
  for (const ev of events) {
    // DISMISSED はスキップ（再登録しない）
    const existing = await prisma.eventCandidate.findUnique({
      where: { url: ev.url },
      select: { status: true },
    });
    if (existing?.status === "DISMISSED") continue;

    await prisma.eventCandidate.upsert({
      where: { url: ev.url },
      update: {
        title: ev.title,
        startDate: ev.startDate ?? null,
        venue: ev.venue ?? null,
        matchedAuthors: ev.matchedAuthors,
        fetchedAt: new Date(),
      },
      create: {
        source: ev.source,
        title: ev.title,
        url: ev.url,
        startDate: ev.startDate ?? null,
        venue: ev.venue ?? null,
        matchedAuthors: ev.matchedAuthors,
      },
    });
    if (!existing) added++;
  }

  revalidatePath("/events");
  return { added };
}

export async function markInterested(id: string): Promise<void> {
  await prisma.eventCandidate.update({
    where: { id },
    data: { status: "INTERESTED" },
  });
  revalidatePath("/events");
}

export async function dismissEvent(id: string): Promise<void> {
  await prisma.eventCandidate.update({
    where: { id },
    data: { status: "DISMISSED" },
  });
  revalidatePath("/events");
}
