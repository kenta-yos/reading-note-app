"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import MemoCard from "./MemoCard";
import { ReadingMemoWithBook } from "@/lib/types";

const OcrCamera = dynamic(() => import("@/components/OcrCamera"), { ssr: false });

type Props = {
  bookId: string;
};

export default function MemoSection({ bookId }: Props) {
  const [memos, setMemos] = useState<ReadingMemoWithBook[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [content, setContent] = useState("");
  const [quote, setQuote] = useState("");
  const [page, setPage] = useState("");
  const [posting, setPosting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const fetchMemos = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ bookId });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/memos?${params}`);
    return (await res.json()) as { memos: ReadingMemoWithBook[]; nextCursor: string | null };
  }, [bookId]);

  useEffect(() => {
    fetchMemos().then((data) => {
      setMemos(data.memos);
      setNextCursor(data.nextCursor);
      setLoaded(true);
    });
  }, [fetchMemos]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchMemos(nextCursor);
    setMemos((prev) => [...prev, ...data.memos]);
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
  };

  const handlePost = async () => {
    if (!content.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/memos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId,
          content: content.trim(),
          quote: quote.trim() || null,
          page: page ? Number(page) : null,
        }),
      });
      if (res.ok) {
        const memo = await res.json();
        setMemos((prev) => [memo, ...prev]);
        setContent("");
        setQuote("");
        setPage("");
      }
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = (id: string) => {
    setMemos((prev) => prev.filter((m) => m.id !== id));
  };

  const handleQuote = (text: string, pageNum: number | null) => {
    setQuote(text);
    if (pageNum != null) setPage(String(pageNum));
    setShowCamera(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
        読書メモ
      </h2>

      {/* 引用プレビュー */}
      {quote && (
        <div className="border-l-3 border-amber-400 bg-amber-50/50 pl-3 py-2 mb-3 rounded-r-lg relative">
          <p className="text-sm text-slate-600 italic whitespace-pre-wrap pr-6">{quote}</p>
          {page && <span className="text-[11px] text-amber-600 mt-1 inline-block">p.{page}</span>}
          <button
            onClick={() => { setQuote(""); setPage(""); }}
            className="absolute top-1 right-1 text-slate-400 hover:text-red-500 p-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ミニ投稿フォーム */}
      <div className="flex gap-2 mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="メモを書く..."
          rows={2}
          className="flex-1 border border-slate-200 rounded-lg p-2.5 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          style={{ fontSize: "16px" }}
        />
        <div className="flex flex-col gap-1">
          <button
            onClick={handlePost}
            disabled={!content.trim() || posting}
            className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {posting ? "..." : "投稿"}
          </button>
          <button
            onClick={() => setShowCamera(true)}
            className="px-3 py-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            aria-label="OCR引用"
          >
            <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* メモ一覧 */}
      {!loaded ? (
        <p className="text-sm text-slate-400 text-center py-4">読み込み中...</p>
      ) : memos.length === 0 ? (
        <p className="text-sm text-slate-400">まだメモがありません</p>
      ) : (
        <div className="space-y-3">
          {memos.map((memo) => (
            <MemoCard key={memo.id} memo={memo} onDelete={handleDelete} showBookTitle={false} />
          ))}
          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              {loadingMore ? "読み込み中..." : "もっと読み込む"}
            </button>
          )}
        </div>
      )}

      {showCamera && (
        <OcrCamera onQuote={handleQuote} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
