"use client";

import Link from "next/link";
import { relativeTime } from "@/lib/relative-time";
import { ReadingMemoWithBook } from "@/lib/types";
import { useState } from "react";

type Props = {
  memo: ReadingMemoWithBook;
  onDelete: (id: string) => void;
  showBookTitle?: boolean;
};

export default function MemoCard({ memo, onDelete, showBookTitle = true }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/memos/${memo.id}`, { method: "DELETE" });
      if (res.ok) onDelete(memo.id);
      else setDeleting(false);
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {showBookTitle && (
            <Link
              href={`/books/${memo.book.id}`}
              className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full truncate hover:bg-blue-100 transition-colors"
            >
              {memo.book.title}
            </Link>
          )}
          <span className="text-[11px] text-slate-400 shrink-0">
            {relativeTime(memo.createdAt)}
          </span>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-slate-300 hover:text-red-500 transition-colors shrink-0 p-0.5"
          aria-label="削除"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {memo.quote && (
        <div className="border-l-3 border-amber-400 bg-amber-50/50 pl-3 py-2 mb-2 rounded-r-lg">
          <p className="text-sm text-slate-600 italic whitespace-pre-wrap">{memo.quote}</p>
          {memo.page != null && (
            <span className="text-[11px] text-amber-600 mt-1 inline-block">p.{memo.page}</span>
          )}
        </div>
      )}

      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
    </div>
  );
}
