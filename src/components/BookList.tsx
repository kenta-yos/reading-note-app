"use client";

import { useState, useCallback } from "react";
import BookCard from "./BookCard";
import Spinner from "./Spinner";
import { BookStatus } from "@/lib/types";

type BookData = {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: number | null;
  pages: number;
  category: string | null;
  rating: number | null;
  status: string;
  readAt: string | null;
};

type Props = {
  initialBooks: BookData[];
  initialCursor: string | null;
  totalCount: number;
  searchParams: Record<string, string>;
};

export default function BookList({ initialBooks, initialCursor, totalCount, searchParams }: Props) {
  const [books, setBooks] = useState<BookData[]>(initialBooks);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams(searchParams);
      params.set("cursor", cursor);
      params.set("limit", "10");
      const res = await fetch(`/api/books?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBooks((prev) => [...prev, ...data.books]);
        setCursor(data.nextCursor);
      }
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, searchParams]);

  if (books.length === 0) {
    return (
      <p className="text-center text-slate-400 text-sm py-12">
        {searchParams.q ? `「${searchParams.q}」に一致する本は見つかりません` : "本が登録されていません"}
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
        {cursor && (
          <button
            onClick={loadMore}
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
