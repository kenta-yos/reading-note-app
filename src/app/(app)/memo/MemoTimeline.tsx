"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import MemoCard from "@/components/MemoCard";
import { ReadingMemoWithBook } from "@/lib/types";

const OcrCamera = dynamic(() => import("@/components/OcrCamera"), { ssr: false });

type BookOption = { id: string; title: string };

type Props = {
  readingBooks: BookOption[];
};

export default function MemoTimeline({ readingBooks }: Props) {
  const [memos, setMemos] = useState<ReadingMemoWithBook[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedBookId, setSelectedBookId] = useState<string>(readingBooks[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [quote, setQuote] = useState("");
  const [page, setPage] = useState("");
  const [posting, setPosting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const fetchMemos = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const qs = params.toString();
    const res = await fetch(`/api/memos${qs ? `?${qs}` : ""}`);
    return (await res.json()) as { memos: ReadingMemoWithBook[]; nextCursor: string | null };
  }, []);

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
    if (!selectedBookId || !content.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/memos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: selectedBookId,
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
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 投稿エリア */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        {/* 本セレクタ */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {readingBooks.map((book) => (
            <button
              key={book.id}
              onClick={() => setSelectedBookId(book.id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                selectedBookId === book.id
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {book.title}
            </button>
          ))}
        </div>

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

        {/* テキストエリア */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="読書中に思ったこと..."
          rows={3}
          className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          style={{ fontSize: "16px" }}
        />

        {/* アクションボタン */}
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={() => setShowCamera(true)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-blue-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            OCR引用
          </button>
          <button
            onClick={handlePost}
            disabled={!content.trim() || !selectedBookId || posting}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {posting ? "投稿中..." : "投稿"}
          </button>
        </div>
      </div>

      {/* タイムライン */}
      {!loaded ? (
        <div className="text-center py-8 text-slate-400 text-sm">読み込み中...</div>
      ) : memos.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-2xl mb-2">📝</p>
          <p className="text-sm">まだメモがありません</p>
          <p className="text-xs mt-1">読書中に思ったことを投稿してみましょう</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memos.map((memo) => (
            <MemoCard key={memo.id} memo={memo} onDelete={handleDelete} />
          ))}
          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-sm text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
            >
              {loadingMore ? "読み込み中..." : "もっと読み込む"}
            </button>
          )}
        </div>
      )}

      {/* OCRカメラ */}
      {showCamera && (
        <OcrCamera onQuote={handleQuote} onClose={() => setShowCamera(false)} />
      )}
    </div>
  );
}
