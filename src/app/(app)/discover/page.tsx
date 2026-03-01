export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { NDLBook } from "@/lib/ndl";
import DiscoverTabs from "@/components/DiscoverTabs";
import DiscoverSyncButton from "@/components/DiscoverSyncButton";
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
      return d >= oneMonthAgoStr ? "recent" : null;
    } else {
      return d <= oneMonthLaterStr ? "upcoming" : null;
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

  // 日本時間で今日・1ヶ月前・1ヶ月後の日付を計算
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
  const [y, m, d] = todayStr.split("-").map(Number);
  const currentYM = todayStr.slice(0, 7);
  const oneMonthAgo = new Date(y, m - 2, d); // m は1始まりなので m-2 = 1ヶ月前
  const oneMonthAgoStr = buildDateStr(oneMonthAgo);
  const oneMonthAgoYM = oneMonthAgoStr.slice(0, 7);
  const oneMonthLater = new Date(y, m, d); // m = 1ヶ月後（0始まりでm+1）
  const oneMonthLaterStr = buildDateStr(oneMonthLater);
  const oneMonthLaterYM = oneMonthLaterStr.slice(0, 7);

  const [allDiscovered, bookmarks, disciplineRows] = await Promise.all([
    prisma.discoveredBook.findMany({ orderBy: { issued: "desc" } }),
    prisma.discoverBookmark.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.book.groupBy({
      by: ["discipline"],
      where: { discipline: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
  ]);

  // DB レコードを NDLBook 形式に変換
  const allBooks: NDLBook[] = allDiscovered.map((b) => ({
    title: b.title,
    author: b.author ?? "",
    publisher: b.publisher ?? "",
    issued: b.issued,
    isbn: b.isbn,
    ndcCode: b.ndcCode,
    discipline: b.discipline,
    ndlUrl: b.ndlUrl,
    price: b.price,
  }));

  const classify = (b: NDLBook) =>
    classifyBook(b, todayStr, oneMonthAgoStr, oneMonthAgoYM, currentYM, oneMonthLaterStr, oneMonthLaterYM);

  const recentBooks = allBooks
    .filter((b) => classify(b) === "recent")
    .sort((a, b) => b.issued.localeCompare(a.issued));
  const upcomingBooks = allBooks
    .filter((b) => classify(b) === "upcoming")
    .sort((a, b) => a.issued.localeCompare(b.issued));

  // ブックマーク済み ISBN
  const bookmarkedIsbns = bookmarks.map((b) => b.isbn);

  // ブックマークタブ用：価格を DB から補完
  const priceByIsbn: Record<string, number> = {};
  for (const b of allBooks) {
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

  // 全出版社リスト（タグ色の一意割り当て用）
  const allPublishers = [...new Set(allBooks.map((b) => b.publisher).filter(Boolean) as string[])].sort();

  return (
    <div className="max-w-2xl mx-auto">
      {/* ヘッダー: 2行レイアウトでモバイル対応 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">新刊を探す</h1>
          <Link
            href="/discover/publishers"
            className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
          >
            出版社を管理
          </Link>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-slate-500 text-sm">最新刊・近刊</p>
          <DiscoverSyncButton />
        </div>
      </div>

      {publisherNames.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800 mb-5">
          監視する出版社が登録されていません。
          <Link href="/discover/publishers" className="underline ml-1">
            出版社を追加
          </Link>
        </div>
      )}

      {allDiscovered.length === 0 && publisherNames.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800 mb-5">
          「新刊を取得」ボタンを押すと新刊情報を読み込みます。初回のみ時間がかかることがあります。
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <DiscoverTabs
          recentBooks={recentBooks}
          upcomingBooks={upcomingBooks}
          bookmarkedBooks={bookmarkedBooks}
          bookmarkedIsbns={bookmarkedIsbns}
          userDisciplines={userDisciplines}
          allPublishers={allPublishers}
          toggleBookmark={toggleBookmark}
        />
      </div>
    </div>
  );
}
