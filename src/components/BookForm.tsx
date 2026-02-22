"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Spinner from "./Spinner";
import { DISCIPLINES } from "@/lib/disciplines";

type BookCandidate = {
  title: string;
  author: string;
  publisherName: string;
  publishedYear: number | null;
};

type BookFormProps = {
  initialData?: {
    id?: string;
    title?: string;
    author?: string;
    publisher?: string;
    publishedYear?: number;
    pages?: number;
    category?: string;
    discipline?: string;
    rating?: number;
    notes?: string;
    readAt?: string;
  };
  mode?: "create" | "edit";
};

export default function BookForm({ initialData = {}, mode = "create" }: BookFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [title, setTitle] = useState(initialData.title ?? "");
  const [author, setAuthor] = useState(initialData.author ?? "");
  const [publisher, setPublisher] = useState(initialData.publisher ?? "");
  const [publishedYear, setPublishedYear] = useState(String(initialData.publishedYear ?? ""));
  const [pages, setPages] = useState(String(initialData.pages ?? ""));
  const [category, setCategory] = useState(initialData.category ?? "");
  const [discipline, setDiscipline] = useState(initialData.discipline ?? "");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [candidates, setCandidates] = useState<BookCandidate[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const candidateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.map((c: { name: string }) => c.name)));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (candidateRef.current && !candidateRef.current.contains(e.target as Node)) {
        setShowCandidates(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const applyCandidate = (candidate: BookCandidate) => {
    setTitle(candidate.title);
    setAuthor(candidate.author);
    setPublisher(candidate.publisherName);
    setPublishedYear(String(candidate.publishedYear ?? ""));
    setCandidates([]);
    setShowCandidates(false);
    setSearchError("");
  };

  const handleSearch = async () => {
    if (!title.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setCandidates([]);
    setShowCandidates(false);

    try {
      const res = await fetch(`/api/books/search?title=${encodeURIComponent(title)}`);
      const data = await res.json();

      if (!res.ok) {
        setSearchError(data.error ?? "検索に失敗しました");
        return;
      }

      if (data.candidates.length === 0) {
        setSearchError("書籍が見つかりませんでした");
        return;
      }

      if (data.candidates.length === 1) {
        applyCandidate(data.candidates[0]);
      } else {
        setCandidates(data.candidates);
        setShowCandidates(true);
      }
    } catch {
      setSearchError("検索中にエラーが発生しました");
    } finally {
      setSearchLoading(false);
    }
  };

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
      pages: Number(pages),
      category: category || null,
      discipline: discipline || null,
      rating: rating ? Number(rating) : null,
      notes,
      readAt,
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

      // 編集後は詳細ページへ、新規登録は一覧へ
      router.push(mode === "edit" ? `/books/${initialData.id}` : "/books");
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

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          タイトル <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
            placeholder="例：存在と時間"
            className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searchLoading || !title.trim()}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-200 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {searchLoading ? (
              <>
                <Spinner className="w-3.5 h-3.5" />
                <span>検索中...</span>
              </>
            ) : (
              "情報を取得"
            )}
          </button>
        </div>
        {searchError && (
          <p className="text-sm text-amber-600 mt-1">{searchError}</p>
        )}
        {showCandidates && candidates.length > 0 && (
          <div
            ref={candidateRef}
            className="mt-1 border border-slate-200 rounded-lg bg-white shadow-md overflow-hidden z-10"
          >
            <p className="text-xs text-slate-500 px-3 py-1.5 bg-slate-50 border-b border-slate-200">
              候補を選択してください
            </p>
            {candidates.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyCandidate(c)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 transition border-b border-slate-100 last:border-b-0"
              >
                <p className="text-sm font-medium text-slate-800 truncate">{c.title}</p>
                <p className="text-xs text-slate-500">{c.author}　{c.publisherName}　{c.publishedYear ?? ""}年</p>
              </button>
            ))}
          </div>
        )}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            ページ数 <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="450"
            min="1"
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            required
          />
        </div>

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            カテゴリ
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">選択なし</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
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
      </div>

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
