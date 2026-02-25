export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import EventTabs from "@/components/EventTabs";

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

export default async function EventsPage() {
  const today = todayJST();

  type EventItem = {
    id: string;
    source: string;
    title: string;
    url: string;
    startDate: string | null;
    venue: string | null;
    matchedAuthors: string[];
    status: "PENDING" | "INTERESTED" | "DISMISSED";
  };

  let pending: EventItem[] = [];
  let interested: EventItem[] = [];
  let error = false;

  try {
    const events = await prisma.eventCandidate.findMany({
      where: {
        status: { not: "DISMISSED" },
        OR: [
          { startDate: null },
          { startDate: { gte: today } },
        ],
      },
      orderBy: { startDate: "asc" },
    });

    const toItem = (e: (typeof events)[number]): EventItem => ({
      id: e.id,
      source: e.source,
      title: e.title,
      url: e.url,
      startDate: e.startDate,
      venue: e.venue,
      matchedAuthors: e.matchedAuthors,
      status: e.status as "PENDING" | "INTERESTED" | "DISMISSED",
    });

    pending = events.filter((e) => e.status === "PENDING").map(toItem);
    interested = events.filter((e) => e.status === "INTERESTED").map(toItem);
  } catch {
    error = true;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">著者イベント</h1>
        <p className="text-slate-500 text-sm mt-1">登録著者の都内・オンラインイベント（毎週月曜更新）</p>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center text-sm text-red-600">
          イベント情報の読み込みに失敗しました。しばらく後にページを再読み込みしてください。
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <EventTabs pending={pending} interested={interested} />
        </div>
      )}
    </div>
  );
}
