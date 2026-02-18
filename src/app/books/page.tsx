import { prisma } from "@/lib/prisma";
import Link from "next/link";
import BookFilters from "@/components/BookFilters";
import { Suspense } from "react";

type SearchParams = {
  q?: string;
  category?: string;
  year?: string;
};

async function BookList({ searchParams }: { searchParams: SearchParams }) {
  const { year, category, q } = searchParams;

  const books = await prisma.book.findMany({
    where: {
      ...(year ? {
        readAt: {
          gte: new Date(parseInt(year), 0, 1),
          lt: new Date(parseInt(year) + 1, 0, 1),
        }
      } : {}),
      ...(category ? { category } : {}),
      ...(q ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { author: { contains: q, mode: "insensitive" } },
        ]
      } : {}),
    },
    orderBy: { readAt: "desc" },
  });

  if (books.length === 0) {
    return (
      <p className="text-center text-slate-400 text-sm py-12">
        本が見つかりません
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {books.map((book) => (
        <Link
          key={book.id}
          href={`/books/${book.id}`}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
              {book.title}
            </h3>
            {book.rating && (
              <span className="text-xs text-amber-500 shrink-0">
                {"★".repeat(book.rating)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">{book.author ?? "著者不明"}</p>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {book.category && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                  {book.category}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">{book.pages} P</span>
          </div>
          {book.readAt && (
            <p className="text-xs text-slate-400 mt-2">
              {new Date(book.readAt).toLocaleDateString("ja-JP")} 読了
            </p>
          )}
          {book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {book.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {book.tags.length > 3 && (
                <span className="text-xs text-slate-400">+{book.tags.length - 3}</span>
              )}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">読書記録</h1>
          <p className="text-slate-500 text-sm mt-1">登録した本の一覧</p>
        </div>
        <Link
          href="/books/new"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          本を登録
        </Link>
      </div>

      <Suspense>
        <BookFilters />
      </Suspense>

      <Suspense fallback={<p className="text-slate-400 text-sm">読み込み中...</p>}>
        <BookList searchParams={params} />
      </Suspense>
    </div>
  );
}
