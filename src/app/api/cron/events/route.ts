import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAuthors } from "@/lib/author-normalize";
import { scrapeAllEvents } from "@/lib/event-scrapers/index";

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

export async function GET(req: NextRequest) {
  // CRON_SECRET でセキュリティ保護
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const today = todayJST();

  // 過去イベントを削除
  await prisma.eventCandidate.deleteMany({
    where: { startDate: { not: null, lt: today } },
  });

  // 著者名を登録冊数の多い順に取得・正規化
  const rows = await prisma.book.groupBy({
    by: ["author"],
    where: { author: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  const seen = new Set<string>();
  const authorsByPriority: string[] = [];
  for (const row of rows) {
    for (const a of normalizeAuthors(row.author)) {
      if (!seen.has(a)) { seen.add(a); authorsByPriority.push(a); }
    }
  }

  if (authorsByPriority.length === 0) {
    return NextResponse.json({ added: 0 });
  }

  const events = await scrapeAllEvents(authorsByPriority, today);

  let added = 0;
  for (const ev of events) {
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

  return NextResponse.json({ ok: true, added });
}
