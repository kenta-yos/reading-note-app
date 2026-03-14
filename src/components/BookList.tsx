"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  discipline: string | null;
  rating: number | null;
  status: string;
  readAt: string | null;
  statusChangedAt: string | null;
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
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset loading when books change (new data arrived)
  useEffect(() => {
    setLoading(false);
  }, [books.length]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    const params = new URLSearchParams(searchParams.toString());
    const currentTake = Number(params.get("take") || "10");
    params.set("take", String(currentTake + 10));
    router.push(`/books?${params.toString()}`, { scroll: false });
  }, [loading, hasMore, searchParams, router]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

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
            discipline={book.discipline}
            rating={book.rating}
            status={book.status as BookStatus}
            readAt={book.readAt ? new Date(book.readAt) : null}
            statusChangedAt={book.statusChangedAt ? new Date(book.statusChangedAt) : null}
          />
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-slate-400 mb-2">
          {books.length} / {totalCount} 冊を表示
        </p>
        {hasMore && (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loading && <Spinner className="w-5 h-5 text-slate-400" />}
          </div>
        )}
      </div>
    </div>
  );
}
