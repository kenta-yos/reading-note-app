"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BookCard from "./BookCard";
import Spinner from "./Spinner";
import { BookStatus } from "@/lib/types";

type BookData = {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: number | null;
  pages: number | null;
  category: string | null;
  rating: number | null;
  status: string;
  readAt: string | null;
};

type Props = {
  books: BookData[];
  totalCount: number;
  hasMore: boolean;
};

export default function BookList({ books, totalCount, hasMore }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const handleLoadMore = () => {
    if (loading) return;
    setLoading(true);
    const params = new URLSearchParams(searchParams.toString());
    const currentTake = Number(params.get("take") || "10");
    params.set("take", String(currentTake + 10));
    router.push(`/books?${params.toString()}`, { scroll: false });
  };

  if (books.length === 0) {
    const q = searchParams.get("q");
    return (
      <p className="text-center text-slate-400 text-sm py-12">
        {q ? `「${q}」に一致する本は見つかりません` : "本が登録されていません"}
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {books.map((book) => (
          <BookCard
            key={book.id}
            id={book.id}
            title={book.title}
            author={book.author}
            publisher={book.publisher}
            publishedYear={book.publishedYear}
            pages={book.pages}
            category={book.category}
            rating={book.rating}
            status={book.status as BookStatus}
            readAt={book.readAt ? new Date(book.readAt) : null}
          />
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400 mb-2">
          {books.length} / {totalCount} 冊を表示
        </p>
        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Spinner className="w-4 h-4 text-slate-400" />
                読み込み中...
              </>
            ) : (
              "もっと見る"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
