export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fetchRecentBooks, fetchUpcomingBooks, enrichWithPrices } from "@/lib/ndl";
import type { NDLBook } from "@/lib/ndl";
import DiscoverTabs from "@/components/DiscoverTabs";
import { toggleBookmark } from "./actions";

export default async function DiscoverPage() {
  const publishers = await prisma.watchPublisher.findMany({
    orderBy: { name: "asc" },
  });
  const publisherNames = publishers.map((p) => p.name);

  const [recentBooksRaw, upcomingBooksRaw, bookmarks, disciplineRows] =
    await Promise.all([
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

  // 全書籍まとめて OpenBD で価格補完（1回のAPIコール）
  const allRaw = [...recentBooksRaw, ...upcomingBooksRaw];
  const allEnriched = await enrichWithPrices(allRaw);
  const recentBooks = allEnriched.slice(0, recentBooksRaw.length);
  const upcomingBooks = allEnriched.slice(recentBooksRaw.length);

  // ブックマーク済み ISBN セット（正規化済み）
  const bookmarkedIsbns = bookmarks.map((b) => b.isbn);

  // 現在のNDL結果から価格マップを構築（ブックマークタブでも使用）
  const priceByIsbn: Record<string, number> = {};
  for (const b of allEnriched) {
    if (b.isbn && b.price != null) {
      priceByIsbn[b.isbn.replace(/-/g, "")] = b.price;
    }
  }

  // ブックマークを NDLBook 形式に変換（価格は現在リストから補完）
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

  const userDisciplines = disciplineRows
    .map((r) => r.discipline!)
    .filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">新刊を探す</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {publisherNames.length}出版社の今月・今後の新刊
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
