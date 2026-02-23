export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fetchRecentBooks, fetchUpcomingBooks } from "@/lib/ndl";
import BookListWithFilter from "@/components/BookListWithFilter";

export default async function DiscoverPage() {
  const publishers = await prisma.watchPublisher.findMany({
    orderBy: { name: "asc" },
  });
  const publisherNames = publishers.map((p) => p.name);

  const [recentBooks, upcomingBooks] = publisherNames.length > 0
    ? await Promise.all([
        fetchRecentBooks(publisherNames),
        fetchUpcomingBooks(publisherNames),
      ])
    : [[], []];

  return (
    <div className="max-w-2xl mx-auto">
      {/* ヘッダー */}
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

      {/* 直近1ヶ月の新刊 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-sm font-semibold text-slate-700">直近1ヶ月の新刊</h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-blue-500">
            {recentBooks.length}冊
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">今月に出版された本</p>
        <BookListWithFilter books={recentBooks} />
      </div>

      {/* 今後2ヶ月の出版予定 */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <h2 className="text-sm font-semibold text-slate-700">今後2ヶ月の出版予定</h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-violet-500">
            {upcomingBooks.length}冊
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">来月・再来月に出版予定の本</p>
        <BookListWithFilter books={upcomingBooks} />
      </div>
    </div>
  );
}
