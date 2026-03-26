"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Spinner from "./Spinner";
import BookSearchInput, { BookCandidate } from "./BookSearchInput";
import { DISCIPLINES } from "@/lib/disciplines";
import { BOOK_STATUSES, BookStatus, STATUS_FLOW } from "@/lib/types";

type BookFormProps = {
  initialData?: {
    id?: string;
    title?: string;
    author?: string;
    publisher?: string;
    publishedYear?: number;
    isbn?: string;
    pages?: number;
    discipline?: string;
    rating?: number;
    description?: string;
    notes?: string;
    status?: BookStatus;
    readAt?: string;
  };
  mode?: "create" | "edit";
  returnStatus?: BookStatus;
};

export default function BookForm({ initialData = {}, mode = "create", returnStatus }: BookFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(initialData.title ?? "");
  const [author, setAuthor] = useState(initialData.author ?? "");
  const [publisher, setPublisher] = useState(initialData.publisher ?? "");
  const [publishedYear, setPublishedYear] = useState(String(initialData.publishedYear ?? ""));
  const [isbn, setIsbn] = useState(initialData.isbn ?? "");
  const [pages, setPages] = useState(String(initialData.pages ?? ""));
  const [discipline, setDiscipline] = useState(initialData.discipline ?? "");
  const [description, setDescription] = useState(initialData.description ?? "");

  // ISBN初期値があり description が空の場合、OpenBD から自動補完
  useEffect(() => {
    const isbnVal = initialData.isbn;
    if (!isbnVal || initialData.description) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/books/search?q=${encodeURIComponent(`isbn:${isbnVal}`)}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const match = data.candidates?.find(
          (c: BookCandidate) => c.isbn === isbnVal || c.title === initialData.title
        ) ?? data.candidates?.[0];
        if (match && !cancelled) {
          if (match.description) setDescription(match.description);
          if (match.pages && !pages) setPages(String(match.pages));
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyCandidate = useCallback((candidate: BookCandidate) => {
    setTitle(candidate.title);
    setAuthor(candidate.author);
    setPublisher(candidate.publisherName);
    setPublishedYear(String(candidate.publishedYear ?? ""));
    if (candidate.isbn) setIsbn(candidate.isbn);
    if (candidate.pages) setPages(String(candidate.pages));
    setDescription(candidate.description ?? "");
  }, []);

  const [status, setStatus] = useState<BookStatus>(initialData.status ?? "WANT_TO_READ");
  const [rating, setRating] = useState(String(initialData.rating ?? ""));
  const [notes, setNotes] = useState(initialData.notes ?? "");
  const [readAt, setReadAt] = useState(
    initialData.readAt
      ? new Date(initialData.readAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      title,
      author,
      publisher,
      publishedYear: publishedYear ? Number(publishedYear) : null,
      isbn: isbn || null,
      pages: pages ? Number(pages) : null,
      discipline: discipline || null,
      rating: rating ? Number(rating) : null,
      description: description || null,
      notes,
      status,
      readAt: status === "READ" ? readAt : null,
    };

    try {
      const url =
        mode === "edit" ? `/api/books/${initialData.id}` : "/api/books";
      const method = mode === "edit" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("保存に失敗しました");

      const returnTo = mode === "edit"
        ? `/books/${initialData.id}`
        : `/books?status=${returnStatus ?? status}`;
      router.replace(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}

      {/* 検索セクション（新規登録時のみ） */}
      {mode === "create" && (
        <BookSearchInput onSelect={applyCandidate} />
      )}

      {/* ステータス選択 */}
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">
          ステータス
        </label>
        <div className="grid grid-cols-4 gap-2">
          {STATUS_FLOW.map((key) => {
            const { label, color } = BOOK_STATUSES[key];
            const isActive = status === key;
            const colorMap = {
              purple: isActive ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500 hover:border-purple-300",
              amber: isActive ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500 hover:border-amber-300",
              blue: isActive ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:border-blue-300",
              green: isActive ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500 hover:border-green-300",
            };
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatus(key)}
                className={`px-2 py-2 rounded-lg border-2 text-xs font-medium text-center transition-all ${colorMap[color]}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例：存在と時間"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">著者</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="例：ハイデガー"
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">出版社</label>
          <input
            type="text"
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="例：岩波書店"
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">出版年</label>
          <input
            type="number"
            value={publishedYear}
            onChange={(e) => setPublishedYear(e.target.value)}
            placeholder="例：2023"
            min="1800"
            max="2100"
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className={`grid grid-cols-1 ${status === "READ" ? "sm:grid-cols-2" : ""} gap-4`}>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            ページ数
          </label>
          <input
            type="number"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="450"
            min="1"
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {status === "READ" && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              読了日
            </label>
            <input
              type="date"
              value={readAt}
              onChange={(e) => setReadAt(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          学問分野
        </label>
        <select
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="">未分類</option>
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          評価 (1–5)
        </label>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="">なし</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
            </option>
          ))}
        </select>
      </div>

      {description && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            内容紹介
          </label>
          <details open className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <summary className="text-xs text-slate-400 cursor-pointer select-none">
              表示 / 非表示
            </summary>
            <p className="text-sm text-slate-600 leading-relaxed mt-2 whitespace-pre-wrap">
              {description}
            </p>
          </details>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          メモ・感想
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="読んで気づいたこと、重要な概念など..."
          rows={4}
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Spinner className="w-4 h-4" />
              <span>保存中...</span>
            </>
          ) : (
            mode === "edit" ? "更新する" : "登録する"
          )}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="px-5 py-2.5 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50 active:scale-[0.98] transition disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}
