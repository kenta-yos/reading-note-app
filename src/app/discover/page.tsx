export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fetchRecentBooks, fetchUpcomingBooks, enrichWithPrices } from "@/lib/ndl";
import type { NDLBook } from "@/lib/ndl";
import DiscoverTabs from "@/components/DiscoverTabs";
import { toggleBookmark } from "./actions";

const pad = (n: number) => String(n).padStart(2, "0");

function buildDateStr(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 書籍を「出版1ヶ月以内」「今後1ヶ月の予定」「除外」に分類
 * - 日付あり (YYYY-MM-DD): 正確に今日との比較。day=00 は月単位として扱う
 * - 月のみ (YYYY-MM): 月単位で比較（前月以前 or 来月以降は除外）
 * - 年のみ ("2026"): 日付が不確かなため両方から除外
 */
function classifyBook(
  book: NDLBook,
  todayStr: string,
  oneMonthAgoStr: string,
  oneMonthAgoYM: string,
  currentYM: string,
  oneMonthLaterStr: string,
  oneMonthLaterYM: string
): "recent" | "upcoming" | null {
  const d = book.issued;

  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const day = parseInt(d.slice(8, 10), 10);
    const ym = d.slice(0, 7);

    if (day === 0) {
      // OpenBD が "YYYYMM00" で返す → 月単位として扱う
      if (ym >= oneMonthAgoYM && ym <= currentYM) return "recent";
      if (ym > currentYM && ym <= oneMonthLaterYM) return "upcoming";
      return null;
    }

    if (d <= todayStr) {
      return d >= oneMonthAgoStr ? "recent" : null; // 1ヶ月より古い → 除外
    } else {
      return d <= oneMonthLaterStr ? "upcoming" : null; // 1ヶ月より先 → 除外
    }
  }

  if (/^\d{4}-\d{2}$/.test(d)) {
    if (d >= oneMonthAgoYM && d <= currentYM) return "recent";
    if (d > currentYM && d <= oneMonthLaterYM) return "upcoming";
    return null;
  }

  return null; // 年のみ ("2026") など → 除外
}

export default async function DiscoverPage() {
  const publishers = await prisma.watchPublisher.findMany({
    orderBy: { name: "asc" },
  });
  const publisherNames = publishers.map((p) => p.name);

  const [recentRaw, upcomingRaw, bookmarks, disciplineRows] = await Promise.all([
    publisherNames.length > 0
      ? fetchRecentBooks(publisherNames)
      : Promise.resolve([]),
    publisherNames.length > 0
      ? fetchUpcomingBooks(publisherNames)
      : Promise.resolve([]),
    prisma.discoverBookmark.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.book.groupBy({
      by: ["discipline"],
      where: { discipline: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
  ]);

  // 重複排除してから一括 OpenBD エンリッチ（1回のAPIコール）
  // recent と upcoming は今月分が重複するため先に dedup
  const seen = new Set<string>();
  const allRaw: NDLBook[] = [];
  for (const b of [...recentRaw, ...upcomingRaw]) {
    const key = b.isbn ?? b.title;
    if (!seen.has(key)) { seen.add(key); allRaw.push(b); }
  }
  const allEnriched = await enrichWithPrices(allRaw);

  // 今日・1ヶ月前・1ヶ月後の日付を計算
  const today = new Date();
  const todayStr = buildDateStr(today);
  const currentYM = todayStr.slice(0, 7);
  const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const oneMonthAgoStr = buildDateStr(oneMonthAgo);
  const oneMonthAgoYM = oneMonthAgoStr.slice(0, 7);
  const oneMonthLater = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const oneMonthLaterStr = buildDateStr(oneMonthLater);
  const oneMonthLaterYM = oneMonthLaterStr.slice(0, 7);

  const classify = (b: NDLBook) =>
    classifyBook(b, todayStr, oneMonthAgoStr, oneMonthAgoYM, currentYM, oneMonthLaterStr, oneMonthLaterYM);

  const recentBooks = allEnriched
    .filter((b) => classify(b) === "recent")
    .sort((a, b) => b.issued.localeCompare(a.issued));
  const upcomingBooks = allEnriched
    .filter((b) => classify(b) === "upcoming")
    .sort((a, b) => a.issued.localeCompare(b.issued));

  // ブックマーク済み ISBN（正規化済み）
  const bookmarkedIsbns = bookmarks.map((b) => b.isbn);

  // ブックマークタブ用：現在の価格を補完
  const priceByIsbn: Record<string, number> = {};
  for (const b of allEnriched) {
    if (b.isbn && b.price != null) priceByIsbn[b.isbn.replace(/-/g, "")] = b.price;
  }
  const bookmarkedBooks: NDLBook[] = bookmarks.map((b) => ({
    title: b.title,
    author: b.author ?? "",
    publisher: b.publisher ?? "",
    issued: b.issued,
    isbn: b.isbn,
    ndcCode: b.ndcCode,
    discipline: b.discipline,
    ndlUrl: b.ndlUrl,
    price: priceByIsbn[b.isbn] ?? null,
  }));

  const userDisciplines = disciplineRows.map((r) => r.discipline!).filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">新刊を探す</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {publisherNames.length}出版社の最新刊・近刊
          </p>
        </div>
        <Link
          href="/discover/publishers"
          className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          出版社を管理
        </Link>
      </div>

      {publisherNames.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800 mb-5">
          監視する出版社が登録されていません。
          <Link href="/discover/publishers" className="underline ml-1">
            出版社を追加
          </Link>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <DiscoverTabs
          recentBooks={recentBooks}
          upcomingBooks={upcomingBooks}
          bookmarkedBooks={bookmarkedBooks}
          bookmarkedIsbns={bookmarkedIsbns}
          userDisciplines={userDisciplines}
          toggleBookmark={toggleBookmark}
        />
      </div>
    </div>
  );
}
