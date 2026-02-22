"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "./Spinner";

type BookCardProps = {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: number | null;
  pages: number;
  category: string | null;
  rating: number | null;
  readAt: Date | null;
};

export default function BookCard({
  id,
  title,
  author,
  publisher,
  publishedYear,
  pages,
  category,
  rating,
  readAt,
}: BookCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleTap = () => {
    if (loading) return;
    setLoading(true);
    router.push(`/books/${id}`);
  };

  return (
    <button
      onClick={handleTap}
      className="relative text-left bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 active:scale-[0.98] transition-all w-full"
    >
      {/* ローディングオーバーレイ */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center z-10">
          <Spinner className="w-6 h-6 text-blue-500" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
          {title}
        </h3>
        {rating && (
          <span className="text-xs text-amber-500 shrink-0">
            {"★".repeat(rating)}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-1">{author ?? "著者不明"}</p>
      {(publisher || publishedYear) && (
        <p className="text-xs text-slate-400 mb-2">
          {[publisher, publishedYear ? `${publishedYear}年` : null]
            .filter(Boolean)
            .join("、")}
        </p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {category && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {category}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">{pages} P</span>
      </div>
      {readAt && (
        <p className="text-xs text-slate-400 mt-2">
          {new Date(readAt).toLocaleDateString("ja-JP")} 読了
        </p>
      )}
    </button>
  );
}
