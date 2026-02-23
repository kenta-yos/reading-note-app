export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fetchRecentBooks, fetchUpcomingBooks, enrichWithPrices } from "@/lib/ndl";
import type { NDLBook } from "@/lib/ndl";
import DiscoverTabs from "@/components/DiscoverTabs";
import { toggleBookmark } from "./actions";

/** "YYYY-MM-DD" の issued を持つ場合は今日以前かで判定、月のみの場合は先月以前 = recent */
function isRecentBook(book: NDLBook, todayStr: string, currentYM: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(book.issued)) {
    return book.issued <= todayStr;
  }
  // 月のみ → 今月は日付不明なので upcoming 扱い（保守的）
  return book.issued < currentYM;
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

  // 今日の日付文字列（YYYY-MM-DD / YYYY-MM）
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const currentYM = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const recentBooks = allEnriched
    .filter((b) => isRecentBook(b, todayStr, currentYM))
    .sort((a, b) => b.issued.localeCompare(a.issued));
  const upcomingBooks = allEnriched
    .filter((b) => !isRecentBook(b, todayStr, currentYM))
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
