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
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 mb-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z"/></svg>
            引用{memo.page != null && ` - p.${memo.page}`}
          </span>
          <p className="text-sm text-slate-600 italic whitespace-pre-wrap">{memo.quote}</p>
        </div>
      )}

      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{memo.content}</p>
    </div>
  );
}
